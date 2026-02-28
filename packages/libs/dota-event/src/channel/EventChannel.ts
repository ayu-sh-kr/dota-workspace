import {
  ApplicationEvent,
  ApplicationEventBus,
  ApplicationEventCallback,
  ApplicationEventListener,
  ApplicationEventPublisher,
  KnownEventKey
} from "@dota/Types.ts";


/**
 * Namespaced event bus implementation that wraps ApplicationEventListener and ApplicationEventPublisher.
 * Automatically prefixes all event names with a namespace to isolate event channels by context.
 * Used to create scoped event communication channels, such as component lifecycle events.
 * Delegates actual listening and publishing to the injected listener and publisher instances.
 * Ensures event name consistency by applying the prefix uniformly across all operations.
 */
export class EventChannel implements ApplicationEventBus {

  /**
   * Creates a new EventChannel with the specified namespace prefix.
   * All events registered, removed, or emitted through this channel will be prefixed.
   * @param prefix - The namespace prefix to prepend to all event names (e.g., 'dota-popover')
   * @param eventListener - The underlying listener to delegate event registration to
   * @param eventPublisher - The underlying publisher to delegate event emission to
   */
  constructor(
    private prefix: string,
    private eventListener: ApplicationEventListener,
    private eventPublisher: ApplicationEventPublisher
  ) {
  }

  /**
   * Subscribes a strongly-typed handler to a known event within this channel's namespace.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * The channel prefix is prepended to the event name before registration, so
   * `'ready'` becomes `'<prefix>:ready'` in the underlying listener.
   *
   * @param event    - A key of {@link ApplicationEventMap} (without the channel prefix).
   * @param callback - Handler whose `event.data` is typed to the mapped payload.
   */
  on<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): Promise<void>;

  /**
   * Subscribes a loosely-typed handler to any event name within this channel's namespace.
   *
   * Fallback for event names not registered in {@link ApplicationEventMap}.
   * The channel prefix is prepended automatically; `event.data` is `any`.
   *
   * @param event    - Any string event name (without the channel prefix).
   * @param callback - Handler that receives the event with `data` typed as `any`.
   */
  on(event: string, callback: ApplicationEventCallback): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async on(event: any, callback: any): Promise<void> {
    await this.eventListener.on(`${this.prefix}:${event}`, callback);
  }

  /**
   * Unsubscribes a strongly-typed handler from a known event within this channel's namespace.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * Passing `null` as `callback` is silently ignored — use the underlying
   * listener directly if a full clear is needed.
   *
   * @param event    - A key of {@link ApplicationEventMap} (without the channel prefix).
   * @param callback - The exact callback instance to remove, or `null` to skip removal.
   */
  off<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K> | null): Promise<void>;

  /**
   * Unsubscribes a handler from any event name within this channel's namespace.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * Passing `null` as `callback` is silently ignored.
   *
   * @param event    - Any string event name (without the channel prefix).
   * @param callback - The exact callback instance to remove, or `null` to skip removal.
   */
  off(event: string, callback: ApplicationEventCallback | null): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async off(event: any, callback: any): Promise<void> {
    if (callback == null) return;
    await this.eventListener.off(`${this.prefix}:${event}`, callback);
  }

  /**
   * Emits a strongly-typed event through this channel's namespace.
   *
   * Resolved when the `event` object's `name` is a literal key of
   * {@link ApplicationEventMap}.  The channel prefix is prepended to the name
   * before publishing, and the compiler enforces that `data` matches the
   * declared payload shape.
   *
   * @param event - A fully typed event object whose `data` matches the mapped payload.
   */
  emit<K extends KnownEventKey>(event: ApplicationEvent<K>): Promise<void>;

  /**
   * Emits a loosely-typed event through this channel's namespace.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * The channel prefix is prepended to the event name before publishing.
   * All listeners registered for the prefixed name will receive the event.
   *
   * @param event - An event object with an arbitrary name and optional `data`.
   */
  emit(event: ApplicationEvent): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async emit(event: any): Promise<void> {
    this.eventPublisher.publish({
      ...event,
      name: `${this.prefix}:${event.name}`
    });
  }

}