import type {AnyMetadataKey, MapMetadataKey, ValueMetadataKey} from "@dota/metadata/metadata-key.ts";
import {MetadataStore} from "@dota/metadata/metadata-store.ts";
import {MetadataInheritance} from "@dota/metadata/metadata-inheritance.ts";

/** Inherited read computed at one store version. */
type ResolvedRead = { version: number; value: unknown };

/**
 * Fluent view of the metadata of one owner: a class, or a standard decorator metadata object.
 *
 * Writes affect this owner only and return the record for chaining. `get` and `has` resolve
 * inheritance through `MetadataInheritance`; `own` reads this owner alone. Records are
 * long-lived, and inherited reads are cached until the next write anywhere.
 */
export class MetadataRecord {
  private readonly resolved = new Map<AnyMetadataKey, ResolvedRead>();

  /** @param owner Class or standard metadata object that owns this record. */
  constructor(private readonly owner: object) {}

  /**
   * Stores a value for this owner, replacing any previous own value.
   * @param key Value key.
   * @param value Value to store.
   * @returns This record, for chaining.
   */
  set<T>(key: ValueMetadataKey<T>, value: T): this {
    MetadataStore.of(this.owner, true)!.set(key, value);
    MetadataStore.touch();
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
    MetadataStore.entries(this.owner, key, true)!.set(name, entry);
    MetadataStore.touch();
    return this;
  }

  /**
   * Replaces a named entry with the result of `update`, which receives the own entry if any.
   * Use it when several decorators contribute to one entry, such as two `@Watcher` on one method.
   * @param key Map key.
   * @param name Entry name.
   * @param update Produces the new entry from the current own entry.
   * @returns This record, for chaining.
   */
  update<T>(key: MapMetadataKey<T>, name: string, update: (current: T | undefined) => T): this {
    const entries = MetadataStore.entries(this.owner, key, true)!;
    entries.set(name, update(entries.get(name)));
    MetadataStore.touch();
    return this;
  }

  /**
   * Removes this owner's value, or one named entry, for a key. Inherited metadata is untouched,
   * so a removed subclass entry reveals the parent's entry again.
   * @param key Key to remove.
   * @param name Entry name for a map key; omit to remove every own entry.
   * @returns This record, for chaining.
   */
  delete(key: AnyMetadataKey, name?: string): this {
    if (key.kind === 'map' && name !== undefined) {
      MetadataStore.entries(this.owner, key as MapMetadataKey<unknown>, false)?.delete(name);
    } else {
      MetadataStore.of(this.owner, false)?.delete(key);
    }
    MetadataStore.touch();
    return this;
  }

  /** Reads this owner's value only. */
  own<T>(key: ValueMetadataKey<T>): T | undefined;
  /** Reads this owner's entries only. */
  own<T>(key: MapMetadataKey<T>): ReadonlyMap<string, T>;
  own(key: AnyMetadataKey): unknown {
    if (key.kind === 'value') return MetadataStore.of(this.owner, false)?.get(key);
    return MetadataStore.entries(this.owner, key as MapMetadataKey<unknown>, false) ?? MetadataInheritance.empty;
  }

  /** Reads the nearest value in the inheritance chain. */
  get<T>(key: ValueMetadataKey<T>): T | undefined;
  /** Reads entries merged along the inheritance chain, base class first. */
  get<T>(key: MapMetadataKey<T>): ReadonlyMap<string, T>;
  get(key: AnyMetadataKey): unknown {
    const version = MetadataStore.version;
    const cached = this.resolved.get(key);
    if (cached && cached.version === version) return cached.value;

    const value = key.kind === 'value'
      ? MetadataInheritance.value(this.owner, key)
      : MetadataInheritance.entries(this.owner, key);
    this.resolved.set(key, {version, value});
    return value;
  }

  /**
   * Reports whether the key has a value or at least one entry in the inheritance chain.
   * @param key Key to test.
   * @returns True when `get` would return a value or a non-empty map.
   */
  has(key: AnyMetadataKey): boolean {
    const value = this.get(key as ValueMetadataKey<unknown>);
    return key.kind === 'value' ? value !== undefined : (value as ReadonlyMap<string, unknown>).size > 0;
  }
}
