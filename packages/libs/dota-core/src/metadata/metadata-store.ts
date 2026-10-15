import type {AnyMetadataKey, MapMetadataKey} from "@dota/metadata/metadata-key.ts";

/**
 * Raw metadata storage for every owner, plus the write version that invalidates cached reads.
 *
 * Owners are classes or standard decorator metadata objects. Storage is held in a `WeakMap`, so
 * metadata never keeps a class alive. Nothing here resolves inheritance; see
 * `MetadataInheritance` for reads that walk the class chain.
 */
export class MetadataStore {
  private static readonly stores = new WeakMap<object, Map<AnyMetadataKey, unknown>>();
  private static writes = 0;

  /**
   * Current write version. Every mutation increments it, so a cached inherited read is still
   * valid only when it was computed at the current version.
   */
  static get version(): number {
    return this.writes;
  }

  /**
   * Returns the storage map of one owner, creating it only for writes.
   * Reads pass `create: false` so querying an undecorated class allocates nothing.
   * @param owner Class or standard metadata object whose storage is wanted.
   * @param create Whether to create empty storage when the owner has none yet.
   * @returns The owner's storage, or undefined when it has none and `create` is false.
   */
  static of(owner: object, create: boolean): Map<AnyMetadataKey, unknown> | undefined {
    let store = this.stores.get(owner);
    if (!store && create) {
      store = new Map();
      this.stores.set(owner, store);
    }
    return store;
  }

  /**
   * Returns the owner's own entries for a map key without looking at ancestors.
   * Writers pass `create: true` so the first entry for a key allocates its map.
   * @param owner Class or standard metadata object that owns the entries.
   * @param key Map key whose entries are wanted.
   * @param create Whether to create the owner's storage and entry map when missing.
   * @returns The mutable own entry map, or undefined when absent and `create` is false.
   */
  static entries<T>(owner: object, key: MapMetadataKey<T>, create: boolean): Map<string, T> | undefined {
    const store = this.of(owner, create);
    let entries = store?.get(key) as Map<string, T> | undefined;
    if (!entries && create) {
      entries = new Map();
      store!.set(key, entries);
    }
    return entries;
  }

  /**
   * Records that metadata changed somewhere. Called after every write so cached inherited reads
   * of any class, including subclasses of the written class, are recomputed on next access.
   */
  static touch(): void {
    this.writes++;
  }
}
