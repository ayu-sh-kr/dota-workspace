import {ApplicationEvent, ApplicationEventBus, ApplicationEventCallback} from "@dota/Types.ts";
import {DefaultApplicationEventManager} from "@dota/DefaultApplicationEventManager.ts";

/**
 * Singleton implementation of ApplicationEventBus that manages application-wide event distribution.
 * Uses an internal event manager to store and resolve event listeners organized by event name.
 * Supports registering, unregistering, and emitting events to all registered callbacks.
 * Ensures a single global instance for consistent event handling across the application.
 * All operations are asynchronous to maintain interface consistency.
 */
export class DefaultApplicationEventBus implements ApplicationEventBus {
  private static instance: DefaultApplicationEventBus;

  private _eventManager = new DefaultApplicationEventManager();

  private constructor() {}

  /**
   * Returns the singleton instance of the event bus, creating it if necessary.
   * Implements lazy initialization to defer instance creation until first access.
   * Ensures only one event bus exists throughout the application lifecycle.
   * @returns The singleton DefaultApplicationEventBus instance
   */
  static getInstance(): DefaultApplicationEventBus {
    if (!DefaultApplicationEventBus.instance) {
      DefaultApplicationEventBus.instance = new DefaultApplicationEventBus();
    }
    return DefaultApplicationEventBus.instance;
  }

  /**
   * Registers an event listener callback for the specified event name.
   * Multiple callbacks can be registered for the same event name.
   * The callback will be invoked whenever the event is emitted.
   * @param event - The name of the event to listen for
   * @param callback - The function to execute when the event is emitted
   */
  async on(event: string, callback: ApplicationEventCallback): Promise<void> {
    this._eventManager.add(event, callback)
  }

  /**
   * Unregisters an event listener callback for the specified event name.
   * If callback is null, removes all listeners for the event.
   * If callback is provided, removes only that specific listener.
   * @param event - The name of the event to stop listening for
   * @param callback - The specific callback to remove, or null to remove all callbacks
   */
  async off(event: string, callback: ApplicationEventCallback | null): Promise<void> {
    this._eventManager.remove(event, callback)
  }

  /**
   * Emits an event to all registered listeners for the event's name.
   * Resolves all callbacks registered for the event and invokes them synchronously.
   * If no listeners are registered, the operation completes silently.
   * Each callback receives the complete event object as its parameter.
   * @param event - The application event to emit to registered listeners
   */
  async emit(event: ApplicationEvent): Promise<void> {
    const callbacks = this._eventManager.resolve(event.name);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      callback(event);
    })
  }

}