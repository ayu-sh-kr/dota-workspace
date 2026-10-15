import type {
  BindConfig,
  ComponentConfig,
  ElementConfigInternal,
  EventConfig,
  EventDetails,
  EventOptionMeta,
  MethodDetails,
  ParameterConfig,
  PropertyDetails,
  StateConfig,
  WatcherOptionMeta
} from "@dota/core/types";
import {MetadataKey} from "./metadata-key.ts";

/** `@EventListener` registration, keyed by method name. */
export interface EventListenerMeta extends EventConfig {
  /** Decorated method name. */
  method: string;
}

/**
 * Keys under which dota-core decorators describe a component class.
 * Map keys name their entries by the member they describe, except where noted.
 */
export const CoreMetadata = {
  /** `@Component` configuration. */
  component: MetadataKey.value<ComponentConfig>('dota.core.component'),
  /** `@Property` details, keyed by attribute name. */
  properties: MetadataKey.map<PropertyDetails>('dota.core.property'),
  /** `@State` fields, keyed by field name. */
  states: MetadataKey.map<StateConfig>('dota.core.state'),
  /** `@Watcher` methods, keyed by method name; `value` lists the watched properties. */
  watchers: MetadataKey.map<WatcherOptionMeta & {value: string[]}>('dota.core.watcher'),
  /** `@BindEvent` delegated bindings, keyed by method name. */
  bindings: MetadataKey.map<BindConfig>('dota.core.bind-event'),
  /** `@HostListener` methods, keyed by method name. */
  hostListeners: MetadataKey.map<EventOptionMeta>('dota.core.host-listener'),
  /** `@WindowListener` methods, keyed by method name. */
  windowListeners: MetadataKey.map<EventOptionMeta>('dota.core.window-listener'),
  /** `@DocumentListener` methods, keyed by method name. */
  documentListeners: MetadataKey.map<EventOptionMeta>('dota.core.document-listener'),
  /** `@EventListener` methods, keyed by method name. */
  eventListeners: MetadataKey.map<EventListenerMeta>('dota.core.event-listener'),
  /** `@Emitter` fields, keyed by field name. */
  emitters: MetadataKey.map<EventDetails>('dota.core.emitter'),
  /** `@Param` fields, keyed by field name. */
  params: MetadataKey.map<ParameterConfig>('dota.core.param'),
  /** `@Element` fields, keyed by field name. */
  elements: MetadataKey.map<ElementConfigInternal>('dota.core.element'),
  /** `@Expose` methods, keyed by the global name they are exposed under. */
  exposed: MetadataKey.map<MethodDetails>('dota.core.expose'),
  /** `@BeforeInit` methods, keyed by method name. */
  beforeInit: MetadataKey.map<MethodDetails>('dota.core.before-init'),
  /** `@AfterInit` methods, keyed by method name. */
  afterInit: MetadataKey.map<MethodDetails>('dota.core.after-init'),
} as const;
