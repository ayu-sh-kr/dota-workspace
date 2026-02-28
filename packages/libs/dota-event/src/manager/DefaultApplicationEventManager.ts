import {ApplicationEventCallback, ApplicationEventManager, KnownEventKey} from "@dota/Types.ts";

/**
 * Default implementation of ApplicationEventManager that maintains event-to-callback mappings.
 * Uses a Map-based storage with Set collections to prevent duplicate callback registrations.
 * Provides granular control for adding, removing, and resolving event callbacks.
 * Supports both selective callback removal and complete event cleanup operations.
 * Thread-safety considerations depend on the execution context and caller responsibilities.
 */
export class DefaultApplicationEventManager implements ApplicationEventManager {

  private store: Map<string, Set<ApplicationEventCallback>> = new Map();

  /**
   * Registers a strongly-typed callback for a known event.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * The `callback` parameter is narrowed so that `event.data` inside the
   * handler carries the exact payload type declared for that event.
   *
   * @param event    - A key of {@link ApplicationEventMap}.
   * @param callback - Handler whose `event.data` is typed to the mapped payload.
   */
  add<K extends KnownEventKey>(event: K, callback: ApplicationEventCallback<K>): void;

  /**
   * Registers a loosely-typed callback for any arbitrary event name.
   *
   * Fallback overload for events not registered in {@link ApplicationEventMap}.
   * The callback receives `event.data` as `any`, preserving the original
   * behaviour for untyped events.
   *
   * @param event    - Any string event name.
   * @param callback - Handler that receives the event with `data` typed as `any`.
   */
  add(event: string, callback: ApplicationEventCallback): void;

  /** @internal Implementation — TypeScript overloads above are the public API. */
  add(event: any, callback: any): void {
    if (!this.store.has(event)) {
      this.store.set(event, new Set());
    }

    this.store.get(event)?.add(callback);
  }

  /**
   * Removes a strongly-typed callback previously registered for a known event.
   *
   * Passing `null` as `callback` removes **all** handlers registered under
   * the given event name.  Resolved when `event` is a literal key of
   * {@link ApplicationEventMap}.
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

  /** @internal Implementation — TypeScript overloads above are the public API. */
  remove(event: any, callback: any): void {
    if (!callback) {
      this.store.delete(event);
      return;
    }

    if (!this.store.has(event)) return;

    this.store.get(event)?.delete(callback);
  }

  /**
   * Returns the set of callbacks registered for a known event.
   *
   * Resolved when `event` is a literal key of {@link ApplicationEventMap}.
   * The returned `Set` is typed to `ApplicationEventCallback<K>`, so iterating
   * over it gives correctly typed handlers.  Returns `undefined` if nothing
   * is registered.
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

  /** @internal Implementation — TypeScript overloads above are the public API. */
  resolve(event: any): Set<ApplicationEventCallback> | undefined {
    if (!this.store.has(event)) return;
    return this.store.get(event);
  }

  /**
   * Removes all events and their associated callbacks from the store.
   * Performs a complete cleanup of the internal Map storage.
   * After calling this method, the manager returns to its initial empty state.
   * Useful for resetting the event system or performing cleanup operations.
   */
  clear() {
    this.store.clear();
  }

}