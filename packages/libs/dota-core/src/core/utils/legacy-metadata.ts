import type {MethodDetails, WatcherOptionMeta} from "@dota/core/types";
import {Metadata, type MapMetadataKey, type MetadataRecord} from "@dota/metadata";
import {CoreMetadata} from "@dota/core/constants";

/**
 * Translates one legacy `ClassName:appender` map to and from the metadata layer.
 * `read` returns entries in the legacy shape; `write` and `remove` change the owning class.
 */
export interface LegacyAdapter<T> {
  /** Current entries, including inherited ones, in the legacy entry shape. */
  read(): Iterable<[string, T]>;
  /** Stores an entry given in the legacy shape on the owning class. */
  write(name: string, value: T): void;
  /** Removes the owning class's entry; inherited entries stay visible. */
  remove(name: string): void;
}

/**
 * `Map` whose contents live in the metadata layer, returned by the deprecated
 * `HelperUtils.fetchOrCreate` for the appenders dota-core decorators used to write.
 *
 * Every read takes a fresh snapshot, so the view never goes stale when decorators or other
 * callers write later. Writes go through the adapter, never into the inherited `Map` storage,
 * which stays empty.
 */
export class LegacyMetadataMap<T> extends Map<string, T> {
  /** @param adapter Translates this view's legacy entries to and from the metadata layer. */
  constructor(private readonly adapter: LegacyAdapter<T>) {
    super();
  }

  override get size(): number { return LegacyMetadataAdapters.snapshot(this.adapter).size; }
  override get(name: string): T | undefined { return LegacyMetadataAdapters.snapshot(this.adapter).get(name); }
  override has(name: string): boolean { return LegacyMetadataAdapters.snapshot(this.adapter).has(name); }

  /** Stores the entry on the owning class, as the legacy map's `set` did. */
  override set(name: string, value: T): this {
    this.adapter.write(name, value);
    return this;
  }

  /** Removes the owning class's entry; reports whether the view contained it beforehand. */
  override delete(name: string): boolean {
    const existed = this.has(name);
    this.adapter.remove(name);
    return existed;
  }

  /** Removes every entry the view currently shows from the owning class. */
  override clear(): void {
    for (const name of LegacyMetadataAdapters.snapshot(this.adapter).keys()) this.adapter.remove(name);
  }

  override forEach(callback: (value: T, key: string, map: Map<string, T>) => void, thisArg?: unknown): void {
    LegacyMetadataAdapters.snapshot(this.adapter).forEach((value, key) => callback.call(thisArg, value, key, this));
  }

  override keys(): MapIterator<string> { return LegacyMetadataAdapters.snapshot(this.adapter).keys(); }
  override values(): MapIterator<T> { return LegacyMetadataAdapters.snapshot(this.adapter).values(); }
  override entries(): MapIterator<[string, T]> { return LegacyMetadataAdapters.snapshot(this.adapter).entries(); }
  override [Symbol.iterator](): MapIterator<[string, T]> { return this.entries(); }
}

/**
 * Builds the adapters behind `LegacyMetadataMap` and caches one view per class and appender.
 *
 * Each legacy appender maps to one `CoreMetadata` key. Most kept their entry shape; `Before` and
 * `After` stored bare functions, and `Watcher:<property>` split one method's watchers by property.
 */
export class LegacyMetadataAdapters {
  /** Legacy appenders whose entries have exactly the shape of their new key. */
  static readonly sameShape: Readonly<Record<string, MapMetadataKey<any>>> = {
    Property: CoreMetadata.properties,
    State: CoreMetadata.states,
    Bind: CoreMetadata.bindings,
    Host: CoreMetadata.hostListeners,
    Window: CoreMetadata.windowListeners,
    Document: CoreMetadata.documentListeners,
    Output: CoreMetadata.emitters,
    Param: CoreMetadata.params,
    Element: CoreMetadata.elements,
    Exposed: CoreMetadata.exposed,
  };

  private static readonly views = new WeakMap<MetadataRecord, Map<string, LegacyMetadataMap<any>>>();

  /**
   * Materialises an adapter's current entries for one read. A fresh map per read is what keeps
   * the legacy view consistent with writes made after it was handed out.
   * @param adapter Adapter whose entries are read.
   * @returns A new map of the current legacy-shaped entries.
   */
  static snapshot<T>(adapter: LegacyAdapter<T>): Map<string, T> {
    return new Map(adapter.read());
  }

  /**
   * Adapter for appenders whose entries kept their shape, such as `Property` or `Bind`.
   * Reads include inherited entries, matching the new layer; writes and removals change only the
   * owning class, so a removed subclass entry reveals the parent's entry again.
   * @param record Metadata record of the class the legacy map belongs to.
   * @param key New key that stores this appender's entries.
   * @returns Adapter that passes entries through unchanged.
   */
  static direct<T>(record: MetadataRecord, key: MapMetadataKey<T>): LegacyAdapter<T> {
    return {
      read: () => record.get(key),
      write: (name, value) => { record.add(key, name, value); },
      remove: (name) => { record.delete(key, name); },
    };
  }

  /**
   * Adapter for `Before` and `After`, which stored the decorated function itself per method name.
   * The new keys store `{name, method}`, so reads unwrap the function and writes wrap it; the
   * lifecycle still calls hooks through the instance, so an override on a subclass runs.
   * @param record Metadata record of the class the legacy map belongs to.
   * @param key `CoreMetadata.beforeInit` or `CoreMetadata.afterInit`.
   * @returns Adapter exposing hooks as bare functions.
   */
  static hook(record: MetadataRecord, key: MapMetadataKey<MethodDetails>): LegacyAdapter<Function> {
    return {
      read: () => [...record.get(key)].map(([name, {method}]) => [name, method] as [string, Function]),
      write: (name, method) => { record.add(key, name, {name, method}); },
      remove: (name) => { record.delete(key, name); },
    };
  }

  /**
   * Adapter for `Watcher:<property>`, which held the watchers of one property with a single
   * string `value`. The new key stores one entry per method listing every watched property, so
   * reads filter by property, writes add the property to the method's list, and removals drop
   * only this property, deleting the entry once it watches nothing.
   * @param record Metadata record of the class the legacy map belongs to.
   * @param property Watched property named by the appender.
   * @returns Adapter exposing that property's watchers in the legacy shape.
   */
  static watcher(record: MetadataRecord, property: string): LegacyAdapter<WatcherOptionMeta> {
    const key = CoreMetadata.watchers;
    return {
      read: () => [...record.get(key)]
        .filter(([, watcher]) => watcher.value.includes(property))
        .map(([name, watcher]) => [name, {...watcher, value: property}] as [string, WatcherOptionMeta]),
      write: (name, watcher) => {
        record.update(key, name, (current) => ({
          name: watcher.name ?? name,
          method: watcher.method,
          value: [...new Set([...(current?.value ?? []), property])],
        }));
      },
      remove: (name) => {
        const current = record.own(key).get(name);
        if (!current) return;
        const value = current.value.filter((watched) => watched !== property);
        if (value.length === 0) record.delete(key, name);
        else record.add(key, name, {...current, value});
      },
    };
  }

  /**
   * Chooses the adapter for a legacy appender.
   * @param record Metadata record of the class the legacy map belongs to.
   * @param appender Legacy appender such as `Property`, `After`, or `Watcher:size`.
   * @returns The matching adapter, or undefined for appenders dota-core never wrote.
   */
  static forAppender(record: MetadataRecord, appender: string): LegacyAdapter<any> | undefined {
    if (this.sameShape[appender]) return this.direct(record, this.sameShape[appender]);
    if (appender === 'Before') return this.hook(record, CoreMetadata.beforeInit);
    if (appender === 'After') return this.hook(record, CoreMetadata.afterInit);
    if (appender.startsWith('Watcher:')) return this.watcher(record, appender.slice('Watcher:'.length));
    return undefined;
  }

  /**
   * Returns the cached legacy view for an appender dota-core decorators used to write.
   * Views are cached per class and appender, so repeated `fetchOrCreate` calls return the same
   * `Map`, as they did with `reflect-metadata`.
   * @param target Class, prototype, or instance passed to `fetchOrCreate`.
   * @param appender Legacy appender such as `Property` or `Watcher:size`.
   * @returns The live view, or undefined so the caller falls back to `reflect-metadata` storage.
   */
  static view<T>(target: object, appender: string): Map<string, T> | undefined {
    const record = Metadata.for(target);
    let byAppender = this.views.get(record);
    let view = byAppender?.get(appender);
    if (view) return view as Map<string, T>;

    const adapter = this.forAppender(record, appender);
    if (!adapter) return undefined;

    if (!byAppender) {
      byAppender = new Map();
      this.views.set(record, byAppender);
    }
    view = new LegacyMetadataMap(adapter);
    byAppender.set(appender, view);
    return view as Map<string, T>;
  }
}
