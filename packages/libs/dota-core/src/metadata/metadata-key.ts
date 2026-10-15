/**
 * Metadata key that holds one value per class; the nearest class in the inheritance chain wins.
 * @template T - Type of the stored value.
 */
export interface ValueMetadataKey<T> {
  /** Merge behaviour used when resolving inherited metadata. */
  readonly kind: 'value';
  /** Diagnostic name; identity is the key object, never this string. */
  readonly name: string;
  /** Phantom field carrying the value type; never set at runtime. */
  readonly __type?: T;
}

/**
 * Metadata key that holds named entries; subclasses inherit parent entries and replace an entry
 * by registering the same name.
 * @template T - Type of each entry.
 */
export interface MapMetadataKey<T> {
  /** Merge behaviour used when resolving inherited metadata. */
  readonly kind: 'map';
  /** Diagnostic name; identity is the key object, never this string. */
  readonly name: string;
  /** Phantom field carrying the entry type; never set at runtime. */
  readonly __type?: T;
}

/** Any metadata key, used where the stored type is irrelevant. */
export type AnyMetadataKey = ValueMetadataKey<unknown> | MapMetadataKey<unknown>;

/**
 * Creates typed, scoped metadata keys.
 *
 * A key is compared by identity, so two libraries that pick the same name never share storage.
 * Create keys once at module level and export them from the module that owns the metadata.
 *
 * @example
 * const ROUTES = MetadataKey.map<RouteConfig>('my-lib.route');
 * const THEME = MetadataKey.value<string>('my-lib.theme');
 */
export const MetadataKey = {
  /**
   * Creates a key for a single value per class.
   * @param name Namespaced diagnostic name, such as `dota.core.component`.
   * @returns A new key distinct from every other key.
   */
  value<T>(name: string): ValueMetadataKey<T> {
    return Object.freeze({kind: 'value', name}) as ValueMetadataKey<T>;
  },

  /**
   * Creates a key for named entries per class.
   * @param name Namespaced diagnostic name, such as `dota.core.property`.
   * @returns A new key distinct from every other key.
   */
  map<T>(name: string): MapMetadataKey<T> {
    return Object.freeze({kind: 'map', name}) as MapMetadataKey<T>;
  },
} as const;
