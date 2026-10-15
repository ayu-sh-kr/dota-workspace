import type {AnyMetadataKey} from "@dota/metadata/metadata-key.ts";
import {MetadataStore} from "@dota/metadata/metadata-store.ts";

const EMPTY_ENTRIES: ReadonlyMap<string, never> = Object.freeze(new Map<string, never>()) as ReadonlyMap<string, never>;

/**
 * Resolves metadata along an owner's inheritance chain.
 *
 * Value keys take the nearest value; map keys merge entries base class first so a subclass
 * entry with the same name replaces its parent's. Results are recomputed only when the store
 * version changes; `MetadataRecord` caches them.
 */
export class MetadataInheritance {

  /**
   * Shared, frozen result for map keys with no entries anywhere in the chain. Returning one
   * instance keeps undecorated reads allocation-free and safe to hand out.
   */
  static readonly empty: ReadonlyMap<string, never> = EMPTY_ENTRIES;

  /**
   * Lists the owners whose storage contributes to `owner`, base first.
   * A class walks its constructor chain and, at each level, includes both the class and its own
   * `Symbol.metadata` object, with the standard metadata nearer than the legacy metadata. Legacy
   * and standard decorators therefore resolve together during a migration, and a class already
   * moved to standard decorators wins over leftovers on the same class. A metadata object walks its prototype chain, which is how the standard links a
   * subclass's metadata to its parent's. Owners without storage are skipped.
   * @param owner Class or standard metadata object being read.
   * @returns Contributing owners ordered from the furthest ancestor to `owner`.
   */
  static lineage(owner: object): object[] {
    const chain: object[] = [];
    if (typeof owner === 'function') {
      const metadataSymbol: symbol | undefined = (Symbol as any).metadata;
      for (let ctor: any = owner; ctor && ctor !== Function.prototype; ctor = Object.getPrototypeOf(ctor)) {
        const standard = metadataSymbol && Object.prototype.hasOwnProperty.call(ctor, metadataSymbol)
          ? ctor[metadataSymbol]
          : undefined;
        if (standard && MetadataStore.of(standard, false)) chain.push(standard);
        if (MetadataStore.of(ctor, false)) chain.push(ctor);
      }
    } else {
      for (let object: object | null = owner; object; object = Object.getPrototypeOf(object)) {
        if (MetadataStore.of(object, false)) chain.push(object);
      }
    }
    return chain.reverse();
  }

  /**
   * Finds the value nearest to `owner` for a value key, so a subclass overrides its parent.
   * @param owner Class or standard metadata object being read.
   * @param key Value key to resolve.
   * @returns The nearest defined value, or undefined when no owner in the chain sets it.
   */
  static value(owner: object, key: AnyMetadataKey): unknown {
    const chain = this.lineage(owner);
    for (let i = chain.length - 1; i >= 0; i--) {
      const value = MetadataStore.of(chain[i], false)!.get(key);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  /**
   * Merges a map key's entries along the chain, base first, so insertion order follows the class
   * hierarchy and a subclass entry replaces a parent entry of the same name.
   * @param owner Class or standard metadata object being read.
   * @param key Map key to resolve.
   * @returns A new merged map, or the shared empty map when no owner has entries.
   */
  static entries(owner: object, key: AnyMetadataKey): ReadonlyMap<string, unknown> {
    let merged: Map<string, unknown> | undefined;
    for (const ancestor of this.lineage(owner)) {
      const entries = MetadataStore.of(ancestor, false)!.get(key) as Map<string, unknown> | undefined;
      if (!entries || entries.size === 0) continue;
      merged ??= new Map();
      entries.forEach((entry, name) => merged!.set(name, entry));
    }
    return merged ?? EMPTY_ENTRIES;
  }
}
