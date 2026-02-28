/**
 * Metadata for decorating methods as event handlers.
 * Contains the event name and the method reference to be invoked.
 */
export type ApplicationEventMetadata = {
  name: string
  method: string | symbol
  scoped?: boolean
}


/**
 * Declaration-merge this interface in your project to register strongly-typed
 * event names and their payload shapes.
 *
 * @example
 * declare module '@ayu-sh-kr/dota-event' {
 *   interface ApplicationEventMap {
 *     'user:created': { id: number; name: string }
 *     'user:deleted': { id: number }
 *   }
 * }
 *
 * Once merged, every method across the bus, listener, publisher and manager
 * will automatically infer the correct payload type for the registered keys
 * while still accepting any arbitrary string for unregistered events.
 */
export interface ApplicationEventMap {}

/** Union of every key registered in {@link ApplicationEventMap}. */
export type KnownEventKey = keyof ApplicationEventMap

/** Catch-all type that represents any event name not registered in the map. */
type AnyEventKey = string

/**
 * Accepted type for an event name parameter.
 * Resolves to every key in {@link ApplicationEventMap} plus any plain `string`.
 */
export type EventKey = KnownEventKey | AnyEventKey

/**
 * Represents an application event object passed to every callback.
 *
 * - When `Name` is a key of {@link ApplicationEventMap} the `data` field is
 *   typed to the mapped payload and is **required**.
 * - For any other string `Name` the `data` field falls back to `any` and is
 *   **optional**, preserving the original loosely-typed behaviour.
 */
export type ApplicationEvent<Name extends EventKey = AnyEventKey> =
  [Name] extends [KnownEventKey]
    ? { name: Name; data: ApplicationEventMap[Name] }
    : { name: Name; data?: any }

/**
 * A callback that receives an {@link ApplicationEvent}.
 *
 * - When `Name` is a key of {@link ApplicationEventMap} the `event` parameter
 *   carries the narrowed payload type for that event.
 * - For unknown names the `event.data` field is `any`, preserving full
 *   backwards compatibility.
 */
export type ApplicationEventCallback<Name extends EventKey = AnyEventKey> =
  (event: ApplicationEvent<Name>) => void

// ─── ApplicationEventManager ─────────────────────────────────────────────────

/**
 * Low-level registry that maintains the mapping from event names to their
 * registered callback sets.  Higher-level constructs such as
 * {@link ApplicationEventBus} and {@link ApplicationEventListener} delegate
 * their storage operations to this interface.
 */
export interface ApplicationEventManager {

  /**
   * Registers a strongly-typed callback for a known event.
   *
   * TypeScript resolves this overload when `event` is a literal type that
   * exists as a key in {@link ApplicationEventMap}.  The `callback` parameter
   * is then narrowed so that `event.data` inside the handler carries the
   * exact payload type declared for that event.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - Handler whose `event.data` is typed to the mapped payload.
   */
  add<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): void;

  /**
   * Registers a loosely-typed callback for any arbitrary event name.
   *
   * This overload acts as the fallback when the event name is not registered
   * in {@link ApplicationEventMap}.  The callback receives `event.data` as
   * `any`, preserving the original behaviour for untyped events.
   *
   * @param event    - Any string event name.
   * @param callback - Handler that receives the event with `data` typed as `any`.
   */
  add(event: string, callback: ApplicationEventCallback): void;

  /**
   * Removes a strongly-typed callback previously registered for a known event.
   *
   * Passing `null` as `callback` removes **all** handlers registered under
   * the given event name.  TypeScript resolves this overload when `event` is a
   * literal key of {@link ApplicationEventMap}, giving compile-time safety on
   * the callback reference type.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - The exact callback instance to remove, or `null` to clear all.
   */
  remove<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K> | null): void;

  /**
   * Removes a callback previously registered for an arbitrary event name.
   *
   * Fallback overload for events not present in {@link ApplicationEventMap}.
   * Passing `null` removes all callbacks registered under `event`.
   *
   * @param event    - Any string event name.
   * @param callback - The exact callback instance to remove, or `null` to clear all.
   */
  remove(event: string, callback: ApplicationEventCallback | null): void;

  /**
   * Returns the set of callbacks registered for a known event.
   *
   * When `event` is a literal key of {@link ApplicationEventMap} the returned
   * `Set` is typed to `ApplicationEventCallback<K>`, so iterating over it gives
   * correctly typed handlers.  Returns `undefined` if nothing is registered.
   *
   * @param event - A key of {@link ApplicationEventMap}.
   */
  resolve<K extends KnownEventKey>(event: K): Set<ApplicationEventCallback<K>> | undefined;

  /**
   * Returns the set of callbacks registered for an arbitrary event name.
   *
   * Fallback overload for unregistered event names.  The returned `Set` holds
   * loosely-typed callbacks.  Returns `undefined` if nothing is registered.
   *
   * @param event - Any string event name.
   */
  resolve(event: string): Set<ApplicationEventCallback> | undefined;

  /**
   * Removes every registered callback from the manager.
   *
   * After this call the manager is in its initial empty state.  Typically
   * used for full teardown or test isolation.
   */
  clear(): void;
}

/**
 * Central publish-subscribe hub for the application.
 *
 * Combines subscription management (`on` / `off`) with event emission (`emit`)
 * in a single interface.  Implementations are typically singletons shared
 * across the whole application so that publishers and listeners can communicate
 * without direct references to each other.
 */
export interface ApplicationEventBus {

  /**
   * Subscribes a strongly-typed handler to a known event.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * The compiler narrows `callback` so that `event.data` inside the handler
   * is typed to the exact payload declared for that event — wrong shapes are
   * caught at compile time.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - Handler whose `event.data` is typed to the mapped payload.
   */
  on<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): Promise<void>;

  /**
   * Subscribes a loosely-typed handler to any event name.
   *
   * Fallback for event names not present in {@link ApplicationEventMap}.
   * The handler receives `event.data` as `any`, matching the original
   * untyped behaviour so existing code continues to work without changes.
   *
   * @param event    - Any string event name.
   * @param callback - Handler that receives the event with `data` typed as `any`.
   */
  on(event: string, callback: ApplicationEventCallback): Promise<void>;

  /**
   * Unsubscribes a strongly-typed handler from a known event.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * Passing `null` as `callback` removes **all** handlers for the event.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - The exact callback instance to remove, or `null` to clear all.
   */
  off<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K> | null): Promise<void>;

  /**
   * Unsubscribes a handler from any event name.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * Passing `null` removes all handlers registered under `event`.
   *
   * @param event    - Any string event name.
   * @param callback - The exact callback instance to remove, or `null` to clear all.
   */
  off(event: string, callback: ApplicationEventCallback | null): Promise<void>;

  /**
   * Emits a strongly-typed event to all registered handlers.
   *
   * Resolved when the `event` object's `name` field is a literal key of
   * {@link ApplicationEventMap}.  The compiler enforces that `data` matches
   * the declared payload shape — passing a wrong shape is a compile error.
   *
   * @param event - A fully typed event object whose `data` matches the mapped payload.
   */
  emit<K extends KnownEventKey>(event: ApplicationEvent<K>): Promise<void>;

  /**
   * Emits a loosely-typed event to all registered handlers.
   *
   * Fallback for events not present in {@link ApplicationEventMap}.
   * Accepts any {@link ApplicationEvent} with `data` typed as `any`.
   *
   * @param event - An event object with an arbitrary name and optional `data`.
   */
  emit(event: ApplicationEvent): Promise<void>;
}

/**
 * Read-only view of the event bus for components that should only consume
 * events, never emit them.
 *
 * Expose this interface to services and components instead of the full
 * {@link ApplicationEventBus} to enforce the principle of least privilege.
 */
export interface ApplicationEventListener {

  /**
   * Registers a strongly-typed handler for a known event.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * The handler's `event.data` parameter is narrowed to the payload type
   * declared for that event, providing full IDE autocompletion and type
   * safety at the call site.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - Handler whose `event.data` is typed to the mapped payload.
   */
  on<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): Promise<void>;

  /**
   * Registers a loosely-typed handler for any event name.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * The handler receives `event.data` as `any`, preserving the original
   * behaviour for arbitrary event names.
   *
   * @param event    - Any string event name.
   * @param callback - Handler that receives the event with `data` typed as `any`.
   */
  on(event: string, callback: ApplicationEventCallback): Promise<void>;

  /**
   * Removes a strongly-typed handler from a known event.
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
   * Removes a handler from any event name.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * Only the specific callback instance is removed; other handlers remain.
   *
   * @param event    - Any string event name.
   * @param callback - The exact callback instance to remove.
   */
  off(event: string, callback: ApplicationEventCallback): Promise<void>;
}

/**
 * Write-only view of the event bus for components that should only emit
 * events, never subscribe to them.
 *
 * Expose this interface to services and components instead of the full
 * {@link ApplicationEventBus} to enforce the principle of least privilege.
 */
export interface ApplicationEventPublisher {

  /**
   * Publishes a strongly-typed event synchronously.
   *
   * Resolved when the `event` object's `name` is a literal key of
   * {@link ApplicationEventMap}.  The compiler enforces that `data` matches
   * the declared payload shape, catching mismatches before runtime.
   * Blocks until all registered handlers have completed.
   *
   * @param event - A fully typed event object whose `data` matches the mapped payload.
   */
  publish<K extends KnownEventKey>(event: ApplicationEvent<K>): void;

  /**
   * Publishes a loosely-typed event synchronously.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * Accepts any {@link ApplicationEvent} with `data` as `any`.
   * Blocks until all registered handlers have completed.
   *
   * @param event - An event object with an arbitrary name and optional `data`.
   */
  publish(event: ApplicationEvent): void;

  /**
   * Publishes a strongly-typed event asynchronously.
   *
   * Resolved when the `event` object's `name` is a literal key of
   * {@link ApplicationEventMap}.  Returns a `Promise` that resolves once all
   * handlers have finished, allowing non-blocking event emission with full
   * payload type safety.
   *
   * @param event - A fully typed event object whose `data` matches the mapped payload.
   */
  publishAsync<K extends KnownEventKey>(event: ApplicationEvent<K>): Promise<void>;

  /**
   * Publishes a loosely-typed event asynchronously.
   *
   * Fallback for events not registered in {@link ApplicationEventMap}.
   * Returns a `Promise` that resolves after all handlers finish.
   * `event.data` is `any`, preserving the original untyped behaviour.
   *
   * @param event - An event object with an arbitrary name and optional `data`.
   */
  publishAsync(event: ApplicationEvent): Promise<void>;
}


/**
 * Manages the lifecycle of event handler bindings declared via the
 * `@OnEvent` decorator on a class instance.
 *
 * Inspects the decorator metadata on the target object, binds each decorated
 * method to the instance context, and registers it with the
 * {@link ApplicationEventListener}.  Keeps track of what has been bound so
 * that `unbind` can perform an exact, clean removal without affecting handlers
 * registered by other owners.
 */
export interface ClassApplicationEventBindManager {

  /**
   * Registers all `@OnEvent`-decorated methods of the target instance with
   * the event listener.
   *
   * - Reads decorator metadata to discover which methods handle which events.
   * - Binds each method to the instance so `this` is correctly preserved.
   * - Skips methods already registered to prevent duplicate invocations when
   *   `bind` is called more than once (e.g. during hot-reload cycles).
   * - Scoped event handlers (decorated with `@OnEvent(name, true)`) are
   *   intentionally excluded; they are managed separately.
   */
  bind(): void;

  /**
   * Unregisters all event handler methods that were previously registered by
   * {@link bind}.
   *
   * - Uses the stored bound-callback references for exact matches, ensuring
   *   only this manager's handlers are removed.
   * - Cleans up internal tracking state after removal.
   * - Safe to call multiple times or when `bind` was never called — no errors
   *   are thrown in either case.
   */
  unbind(): void;
}