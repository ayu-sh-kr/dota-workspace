import {ApplicationEvent, ApplicationEventBus, ApplicationEventPublisher} from "@dota/Types.ts";

/**
 * Default implementation of ApplicationEventPublisher that delegates event publishing to an event bus.
 * Provides both synchronous and asynchronous interfaces for emitting application events.
 * Acts as a facade over the underlying event bus, simplifying event emission for publishers.
 * Thread-safe operations depend on the underlying event bus implementation.
 */
export class DefaultApplicationEventPublisher implements ApplicationEventPublisher {

  /**
   * Creates a new event publisher with the specified event bus.
   * The event bus is used to emit all published events to registered listeners.
   * @param _eventBus - The event bus instance that will handle event distribution
   */
  constructor(private _eventBus: ApplicationEventBus) {
  }

  /**
   * Publishes an event synchronously by delegating to the event bus.
   * Emits the event immediately to all registered listeners.
   * Does not wait for listener callbacks to complete before returning.
   * @param event - The application event to publish
   */
  publish(event: ApplicationEvent): void {
    this._eventBus.emit(event);
  }

  /**
   * Publishes an event asynchronously by delegating to the synchronous publish method.
   * Returns a promise that resolves immediately after delegating to publish().
   * Actual asynchronous behavior depends on the underlying event bus implementation.
   * @param event - The application event to publish
   */
  async publishAsync(event: ApplicationEvent): Promise<void> {
    this.publish(event)
  }

}