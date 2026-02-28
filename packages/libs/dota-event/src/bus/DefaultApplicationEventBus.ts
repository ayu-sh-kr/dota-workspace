import {ApplicationEvent, ApplicationEventBus, ApplicationEventCallback, KnownEventKey} from "@dota/Types.ts";
import {DefaultApplicationEventManager} from "@dota/manager/DefaultApplicationEventManager.ts";

/**
 * Singleton implementation of {@link ApplicationEventBus} that manages
 * application-wide event distribution.
 *
 * Uses an internal {@link DefaultApplicationEventManager} to store and resolve
 * event listeners keyed by event name.  Supports registering, unregistering,
 * and emitting events to all registered callbacks.
 *
 * Provides two access patterns:
 * - {@link getInstance} — returns the shared singleton used across the whole app.
 * - {@link getNewInstance} — creates an isolated bus for testing or module-level use.
 */
export class DefaultApplicationEventBus implements ApplicationEventBus {
  private static instance: DefaultApplicationEventBus;

  private _eventManager = new DefaultApplicationEventManager();

  private constructor() {}

  /**
   * Returns the singleton instance of the event bus, creating it if necessary.
   *
   * Implements lazy initialization — the instance is not created until the first
   * call to this method.  All subsequent calls return the same object, ensuring
   * a single, consistent event channel throughout the application lifecycle.
   *
   * @returns The singleton {@link DefaultApplicationEventBus} instance.
   */
  static getInstance(): DefaultApplicationEventBus {
    if (!DefaultApplicationEventBus.instance) {
      DefaultApplicationEventBus.instance = new DefaultApplicationEventBus();
    }
    return DefaultApplicationEventBus.instance;
  }

  /**
   * Creates and returns a new, fully independent instance of
   * {@link DefaultApplicationEventBus}.
   *
   * Unlike {@link getInstance}, this method bypasses the singleton pattern and
   * allocates a fresh event manager with an empty listener registry.  Use this
   * when you need isolated event buses — for example in unit tests, module
   * sandboxing, or feature-scoped event channels.
   *
   * @returns A new {@link DefaultApplicationEventBus} instance with an empty registry.
   *
   * @example
   * // Isolated bus for a specific feature module
   * const featureBus = DefaultApplicationEventBus.getNewInstance();
   * featureBus.on('feature:ready', handler);
   */
  static getNewInstance(): DefaultApplicationEventBus {
    return new DefaultApplicationEventBus();
  }

  /**
   * Subscribes a strongly-typed handler to a known event.
   *
   * This overload is resolved when `event` is a literal key present in
   * {@link ApplicationEventMap}.  TypeScript narrows the `callback` parameter
   * so that `event.data` inside the handler carries the exact payload type
   * declared for that key — incorrect shapes are caught at compile time.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - Handler whose `event.data` is typed to the mapped payload.
   */
  on<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): Promise<void>;

  /**
   * Subscribes a loosely-typed handler to any arbitrary event name.
   *
   * Fallback overload used when the event name is not registered in
   * {@link ApplicationEventMap}.  The handler receives `event.data` as `any`,
   * preserving full backwards-compatibility with untyped events.
   *
   * @param event    - Any string event name.
   * @param callback - Handler that receives the event with `data` typed as `any`.
   */
  on(event: string, callback: ApplicationEventCallback): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async on(event: any, callback: any): Promise<void> {
    this._eventManager.add(event, callback);
  }

  /**
   * Unsubscribes a strongly-typed handler from a known event.
   *
   * This overload is resolved when `event` is a literal key present in
   * {@link ApplicationEventMap}.  Passing `null` as `callback` removes **all**
   * handlers registered under that event name.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - The exact callback instance to remove, or `null` to clear all.
   */
  off<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K> | null): Promise<void>;

  /**
   * Unsubscribes a handler from any arbitrary event name.
   *
   * Fallback overload for events not registered in {@link ApplicationEventMap}.
   * Passing `null` removes every callback registered under the given event name.
   *
   * @param event    - Any string event name.
   * @param callback - The exact callback instance to remove, or `null` to clear all.
   */
  off(event: string, callback: ApplicationEventCallback | null): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async off(event: any, callback: any): Promise<void> {
    this._eventManager.remove(event, callback);
  }

  /**
   * Emits a strongly-typed event to all registered handlers.
   *
   * This overload is resolved when the `event` object's `name` field is a
   * literal key of {@link ApplicationEventMap}.  The compiler enforces that
   * `data` matches the declared payload shape — a wrong shape is a compile error.
   *
   * @param event - A fully typed event object whose `data` matches the mapped payload.
   */
  emit<K extends KnownEventKey>(event: ApplicationEvent<K>): Promise<void>;

  /**
   * Emits a loosely-typed event to all registered handlers.
   *
   * Fallback overload for events not present in {@link ApplicationEventMap}.
   * Accepts any {@link ApplicationEvent} with `data` typed as `any`.
   * Completes silently when no handlers are registered for the event name.
   *
   * @param event - An event object with an arbitrary name and optional `data`.
   */
  emit(event: ApplicationEvent): Promise<void>;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  async emit(event: any): Promise<void> {
    const callbacks = this._eventManager.resolve(event.name);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      callback(event);
    });
  }

}