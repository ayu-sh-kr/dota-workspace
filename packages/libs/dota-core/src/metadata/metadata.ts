import type {AnyMetadataKey, MapMetadataKey, ValueMetadataKey} from "./metadata-key.ts";

/**
 * Standard (TC39) decorator context; only the shared metadata object is used.
 */
export interface StandardDecoratorContext {
  /** Decorated element kind, such as `class`, `field`, or `method`. */
  readonly kind: string;
  /** Metadata object shared by every decorator of one class, or undefined without `Symbol.metadata`. */
  readonly metadata?: object;
}

/** Anything a decorator or lifecycle method can pass to {@link Metadata.for}. */
export type MetadataTarget = Function | object | StandardDecoratorContext;

type CacheEntry = { version: number; value: unknown };

const EMPTY_ENTRIES: ReadonlyMap<string, never> = Object.freeze(new Map<string, never>()) as ReadonlyMap<string, never>;
const records = new WeakMap<object, MetadataRecord>();

/** Increases on every write, invalidating every cached inherited read. */
let version = 0;

/**
 * Metadata stored for one owner: a class, or a standard decorator metadata object.
 *
 * Writes affect this owner only. `get` and `has` resolve inheritance; `own` does not.
 * Records are long-lived and cached, so repeated reads allocate nothing.
 */
export class MetadataRecord {
  private readonly store = new Map<AnyMetadataKey, unknown>();
  private readonly resolved = new Map<AnyMetadataKey, CacheEntry>();

  /** @param owner Class or standard metadata object that owns this record. */
  constructor(private readonly owner: object) {}

  /**
   * Stores a value for this owner, replacing any previous own value.
   * @param key Value key.
   * @param value Value to store.
   * @returns This record, for chaining.
   */
  set<T>(key: ValueMetadataKey<T>, value: T): this {
    this.store.set(key, value);
    version++;
    return this;
  }

  /**
   * Stores a named entry for this owner, replacing an own entry with the same name.
   * @param key Map key.
   * @param name Entry name, such as a property or method name.
   * @param entry Entry to store.
   * @returns This record, for chaining.
   */
  add<T>(key: MapMetadataKey<T>, name: string, entry: T): this {
    this.ownEntries(key, true)!.set(name, entry);
    version++;
    return this;
  }

  /**
   * Replaces a named entry with the result of `update`, which receives the own entry if any.
   * Use it when several decorators contribute to one entry.
   * @param key Map key.
   * @param name Entry name.
   * @param update Produces the new entry from the current own entry.
   * @returns This record, for chaining.
   */
  update<T>(key: MapMetadataKey<T>, name: string, update: (current: T | undefined) => T): this {
    const entries = this.ownEntries(key, true)!;
    entries.set(name, update(entries.get(name)));
    version++;
    return this;
  }

  /**
   * Removes this owner's value, or one named entry, for a key. Inherited metadata is untouched.
   * @param key Key to remove.
   * @param name Entry name for a map key; omit to remove every own entry.
   * @returns This record, for chaining.
   */
  delete(key: AnyMetadataKey, name?: string): this {
    if (key.kind === 'map' && name !== undefined) {
      this.ownEntries(key as MapMetadataKey<unknown>, false)?.delete(name);
    } else {
      this.store.delete(key);
    }
    version++;
    return this;
  }

  /** Reads this owner's value only. */
  own<T>(key: ValueMetadataKey<T>): T | undefined;
  /** Reads this owner's entries only. */
  own<T>(key: MapMetadataKey<T>): ReadonlyMap<string, T>;
  own(key: AnyMetadataKey): unknown {
    if (key.kind === 'value') return this.store.get(key);
    return this.ownEntries(key, false) ?? EMPTY_ENTRIES;
  }

  /** Reads the nearest value in the inheritance chain. */
  get<T>(key: ValueMetadataKey<T>): T | undefined;
  /** Reads entries merged along the inheritance chain, base class first. */
  get<T>(key: MapMetadataKey<T>): ReadonlyMap<string, T>;
  get(key: AnyMetadataKey): unknown {
    const cached = this.resolved.get(key);
    if (cached && cached.version === version) return cached.value;

    const value = key.kind === 'value' ? this.resolveValue(key) : this.resolveEntries(key);
    this.resolved.set(key, {version, value});
    return value;
  }

  /**
   * Reports whether the key has a value or at least one entry in the inheritance chain.
   * @param key Key to test.
   * @returns True when {@link get} would return a value or a non-empty map.
   */
  has(key: AnyMetadataKey): boolean {
    const value = this.get(key as ValueMetadataKey<unknown>);
    return key.kind === 'value' ? value !== undefined : (value as ReadonlyMap<string, unknown>).size > 0;
  }

  private ownEntries<T>(key: MapMetadataKey<T>, create: boolean): Map<string, T> | undefined {
    let entries = this.store.get(key) as Map<string, T> | undefined;
    if (!entries && create) {
      entries = new Map();
      this.store.set(key, entries);
    }
    return entries;
  }

  private resolveValue(key: AnyMetadataKey): unknown {
    const chain = lineage(this.owner);
    for (let i = chain.length - 1; i >= 0; i--) {
      const value = chain[i].store.get(key);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  private resolveEntries(key: AnyMetadataKey): ReadonlyMap<string, unknown> {
    let merged: Map<string, unknown> | undefined;
    for (const record of lineage(this.owner)) {
      const entries = record.store.get(key) as Map<string, unknown> | undefined;
      if (!entries || entries.size === 0) continue;
      merged ??= new Map();
      entries.forEach((entry, name) => merged!.set(name, entry));
    }
    return merged ?? EMPTY_ENTRIES;
  }
}

/**
 * Records contributing to an owner, base first. A class contributes its own record and the
 * record of its own `Symbol.metadata` object, so legacy and standard decorators resolve together.
 */
function lineage(owner: object): MetadataRecord[] {
  const chain: MetadataRecord[] = [];
  if (typeof owner === 'function') {
    const metadataSymbol: symbol | undefined = (Symbol as any).metadata;
    for (let ctor: any = owner; ctor && ctor !== Function.prototype; ctor = Object.getPrototypeOf(ctor)) {
      const standard = metadataSymbol && Object.prototype.hasOwnProperty.call(ctor, metadataSymbol)
        ? records.get(ctor[metadataSymbol])
        : undefined;
      if (standard) chain.push(standard);
      const legacy = records.get(ctor);
      if (legacy) chain.push(legacy);
    }
  } else {
    for (let object: object | null = owner; object; object = Object.getPrototypeOf(object)) {
      const record = records.get(object);
      if (record) chain.push(record);
    }
  }
  return chain.reverse();
}

function isStandardContext(target: object): target is StandardDecoratorContext {
  return 'kind' in target && 'metadata' in target;
}

function resolveOwner(target: MetadataTarget): object {
  if (typeof target === 'function') return target;

  const ctor = (target as {constructor?: unknown}).constructor;
  if (typeof ctor !== 'function') return target;  // null-prototype standard metadata object
  if (ctor === Object) {
    if (!isStandardContext(target)) return target;  // a plain object owns its own record
    if (!target.metadata) {
      throw new TypeError('dota-core metadata: decorator context has no metadata; polyfill Symbol.metadata');
    }
    return target.metadata;
  }
  return ctor;                                     // a prototype's or an instance's class
}

/**
 * Entry point of the metadata layer.
 *
 * `Metadata.for` accepts a class, a prototype (legacy member decorators), an instance (lifecycle
 * code), or a standard decorator context, and returns the owning class's record.
 *
 * @example
 * Metadata.for(target).add(PROPERTIES, 'title', details);   // inside a decorator
 * Metadata.for(this).get(PROPERTIES);                        // inside a component
 */
export const Metadata = {
  /**
   * Returns the long-lived record of the class that owns `target`.
   * @param target Class, prototype, instance, standard decorator context, or metadata object.
   * @returns The owner's record; created on first use.
   */
  for(target: MetadataTarget): MetadataRecord {
    const owner = resolveOwner(target);
    let record = records.get(owner);
    if (!record) {
      record = new MetadataRecord(owner);
      records.set(owner, record);
    }
    return record;
  },
} as const;
