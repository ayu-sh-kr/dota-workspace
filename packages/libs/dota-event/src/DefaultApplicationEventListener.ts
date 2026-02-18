import {ApplicationEventBus, ApplicationEventCallback, ApplicationEventListener} from "@dota/Types.ts";

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
   * Registers an event listener callback for the specified event name.
   * Delegates to the event bus to add the callback to the event's listener collection.
   * The callback will be invoked whenever the event is emitted through the bus.
   * @param event - The name of the event to listen for
   * @param callback - The function to execute when the event is emitted
   */
  on(event: string, callback: ApplicationEventCallback): void {
    this._eventBus.on(event, callback);
  }

  /**
   * Unregisters an event listener callback for the specified event name.
   * Delegates to the event bus to remove the callback from the event's listener collection.
   * If the callback is not registered, the operation completes silently.
   * @param event - The name of the event to stop listening for
   * @param callback - The specific callback function to remove
   */
  off(event: string, callback: ApplicationEventCallback): void {
    this._eventBus.off(event, callback)
  }

}