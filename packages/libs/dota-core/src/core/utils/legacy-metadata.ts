import type {MethodDetails, WatcherOptionMeta} from "@dota/core/types";
import {CoreMetadata, Metadata, type MapMetadataKey, type MetadataRecord} from "@dota/core/metadata";

/** Reads and writes one legacy `ClassName:appender` map through the metadata layer. */
interface LegacyAdapter<T> {
  read(): Iterable<[string, T]>;
  write(name: string, value: T): void;
  remove(name: string): void;
}

/**
 * `Map` whose contents live in the metadata layer, returned by the deprecated
 * `HelperUtils.fetchOrCreate` for the appenders dota-core decorators used to write.
 * Reads always reflect current (inherited) metadata; writes land on the owning class.
 */
export class LegacyMetadataMap<T> extends Map<string, T> {
  constructor(private readonly adapter: LegacyAdapter<T>) {
    super();
  }

  private snapshot(): Map<string, T> {
    return new Map(this.adapter.read());
  }

  override get size(): number { return this.snapshot().size; }
  override get(name: string): T | undefined { return this.snapshot().get(name); }
  override has(name: string): boolean { return this.snapshot().has(name); }

  override set(name: string, value: T): this {
    this.adapter.write(name, value);
    return this;
  }

  override delete(name: string): boolean {
    const existed = this.has(name);
    this.adapter.remove(name);
    return existed;
  }

  override clear(): void {
    for (const name of this.snapshot().keys()) this.adapter.remove(name);
  }

  override forEach(callback: (value: T, key: string, map: Map<string, T>) => void, thisArg?: unknown): void {
    this.snapshot().forEach((value, key) => callback.call(thisArg, value, key, this));
  }

  override keys(): MapIterator<string> { return this.snapshot().keys(); }
  override values(): MapIterator<T> { return this.snapshot().values(); }
  override entries(): MapIterator<[string, T]> { return this.snapshot().entries(); }
  override [Symbol.iterator](): MapIterator<[string, T]> { return this.entries(); }
}

/** Legacy appenders whose entries have the same shape as the new keys. */
const SAME_SHAPE: Record<string, MapMetadataKey<any>> = {
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

function directAdapter<T>(record: MetadataRecord, key: MapMetadataKey<T>): LegacyAdapter<T> {
  return {
    read: () => record.get(key),
    write: (name, value) => { record.add(key, name, value); },
    remove: (name) => { record.delete(key, name); },
  };
}

/** `Before` / `After` stored a bare function per method name. */
function hookAdapter(record: MetadataRecord, key: MapMetadataKey<MethodDetails>): LegacyAdapter<Function> {
  return {
    read: () => [...record.get(key)].map(([name, {method}]) => [name, method] as [string, Function]),
    write: (name, method) => { record.add(key, name, {name, method}); },
    remove: (name) => { record.delete(key, name); },
  };
}

/** `Watcher:<property>` held the watchers of one property, each with a single `value`. */
function watcherAdapter(record: MetadataRecord, property: string): LegacyAdapter<WatcherOptionMeta> {
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

const views = new WeakMap<MetadataRecord, Map<string, LegacyMetadataMap<any>>>();

/**
 * Returns the cached legacy view for an appender dota-core decorators used to write, or
 * undefined for any other appender.
 * @param target Class, prototype, or instance passed to `fetchOrCreate`.
 * @param appender Legacy appender such as `Property` or `Watcher:size`.
 */
export function legacyMetadataView<T>(target: object, appender: string): Map<string, T> | undefined {
  const record = Metadata.for(target);
  let adapter: LegacyAdapter<any> | undefined;
  if (SAME_SHAPE[appender]) adapter = directAdapter(record, SAME_SHAPE[appender]);
  else if (appender === 'Before') adapter = hookAdapter(record, CoreMetadata.beforeInit);
  else if (appender === 'After') adapter = hookAdapter(record, CoreMetadata.afterInit);
  else if (appender.startsWith('Watcher:')) adapter = watcherAdapter(record, appender.slice('Watcher:'.length));
  if (!adapter) return undefined;

  let byAppender = views.get(record);
  if (!byAppender) {
    byAppender = new Map();
    views.set(record, byAppender);
  }
  let view = byAppender.get(appender);
  if (!view) {
    view = new LegacyMetadataMap(adapter);
    byAppender.set(appender, view);
  }
  return view as Map<string, T>;
}
