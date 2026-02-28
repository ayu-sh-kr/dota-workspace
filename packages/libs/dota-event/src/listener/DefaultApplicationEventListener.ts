import {ApplicationEventBus, ApplicationEventCallback, ApplicationEventListener, KnownEventKey} from "@dota/Types.ts";

/**
 * Default implementation of ApplicationEventListener that delegates listener management to an event bus.
 * Provides a simplified interface for subscribing and unsubscribing from application events.
 * Acts as a facade over the underlying event bus, abstracting event registration complexity.
 * All listener operations are synchronous and directly forwarded to the event bus.
 * Multiple listeners can be registered for the same event through repeated on() calls.
 */
export class DefaultApplicationEventListener implements ApplicationEventListener {

  /**
   * Creates a new event listener with the specified event bus.
   * The event bus is used to manage all listener registrations and removals.
   * @param _eventBus - The event bus instance that will handle listener management
   */
  constructor(private _eventBus: ApplicationEventBus) {}

  /**
   * Subscribes a strongly-typed handler to a known event.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * The compiler narrows `callback` so that `event.data` inside the handler
   * carries the exact payload type declared for that event — wrong shapes are
   * caught at compile time.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - Handler whose `event.data` is typed to the mapped payload.
   */
  on<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): Promise<void>;

  /**
   * Subscribes a loosely-typed handler to any event name.
   *
   * Fallback for event names not registered in {@link ApplicationEventMap}.
   * The handler receives `event.data` as `any`, preserving the original
   * untyped behaviour so existing code continues to work without changes.
   *
   * @param event    - Any string event name.
   * @param callback - Handler that receives the event with `data` typed as `any`.
   */
  on(event: string, callback: ApplicationEventCallback): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async on(event: any, callback: any): Promise<void> {
    await this._eventBus.on(event, callback);
  }

  /**
   * Unsubscribes a strongly-typed handler from a known event.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * Only the exact callback instance provided is removed; other handlers
   * for the same event are unaffected.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - The exact callback instance to remove.
   */
  off<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): Promise<void>;

  /**
   * Unsubscribes a handler from any event name.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * Only the specific callback instance is removed; other handlers remain.
   *
   * @param event    - Any string event name.
   * @param callback - The exact callback instance to remove.
   */
  off(event: string, callback: ApplicationEventCallback): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async off(event: any, callback: any): Promise<void> {
    await this._eventBus.off(event, callback);
  }

}