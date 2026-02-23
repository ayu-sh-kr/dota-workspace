import {ApplicationEventCallback, ApplicationEventManager} from "@dota/Types.ts";

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
   * Registers a callback for a specific event name.
   * Creates a new Set for the event if it doesn't exist in the store.
   * Uses Set collection to automatically prevent duplicate callback registrations.
   * Multiple different callbacks can be registered for the same event.
   * @param event - The event name to associate the callback with
   * @param callback - The callback function to register
   */
  add(event: string, callback: ApplicationEventCallback): void {
    if (!this.store.has(event)) {
      this.store.set(event, new Set());
    }

    this.store.get(event)?.add(callback);
  }

  /**
   * Removes callbacks associated with an event name.
   * If callback is null, removes the entire event and all its callbacks.
   * If callback is provided, removes only that specific callback from the event.
   * No action is taken if the event doesn't exist when removing specific callbacks.
   * @param event - The event name to remove callbacks from
   * @param callback - The specific callback to remove, or null to remove all
   */
  remove(event: string, callback: ApplicationEventCallback | null): void {
    if (!callback) {
      this.store.delete(event);
      return;
    }

    if (!this.store.has(event)) return;

    this.store.get(event)?.delete(callback);
  }

  /**
   * Retrieves all registered callbacks for a specific event name.
   * Returns undefined if the event has no registered callbacks.
   * The returned Set reference allows direct iteration over callbacks.
   * Modifications to the returned Set will affect the internal store.
   * @param event - The event name to retrieve callbacks for
   * @returns Set of callbacks or undefined if event not found
   */
  resolve(event: string): Set<ApplicationEventCallback> | undefined {
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