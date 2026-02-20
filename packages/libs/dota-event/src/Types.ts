
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
 * Represents an application event with a name and optional payload.
 * Used to carry event information through the event bus system.
 */
export type ApplicationEvent = {
  name: string;
  data?: any;
}

/**
 * Function signature for event handlers.
 * Receives an ApplicationEvent and processes it synchronously.
 */
export type ApplicationEventCallback = (event: ApplicationEvent) => void;

/**
 * Manages registration and retrieval of event callbacks.
 * Maintains a collection of callbacks per event name and provides
 * methods to add, remove, resolve and clear event handlers.
 */
export interface ApplicationEventManager {
  /**
   * Registers a callback function for a specific event name.
   * If the event already has registered callbacks, adds this callback to the existing set.
   * Multiple callbacks can be registered for the same event.
   * The callback will be invoked when the event is emitted.
   */
  add(event: string, callback: ApplicationEventCallback): void;

  /**
   * Removes a callback from the specified event's handler list.
   * If callback is null, removes all callbacks associated with the event.
   * If the event has no callbacks after removal, the event entry may be cleaned up.
   * Does nothing if the event or callback doesn't exist.
   */
  remove(event: string, callback: ApplicationEventCallback | null): void;

  /**
   * Retrieves all registered callbacks for a specific event name.
   * Returns a Set containing all callback functions registered to the event.
   * Returns undefined if no callbacks are registered for the event.
   * The returned Set should not be modified directly.
   */
  resolve(event: string): Set<ApplicationEventCallback> | undefined;

  /**
   * Removes all registered event callbacks from the manager.
   * Clears the internal storage of all event-to-callback mappings.
   * After calling this method, no events will have any registered handlers.
   * This is typically used for cleanup or reset scenarios.
   */
  clear(): void;
}

/**
 * Central event bus for publish-subscribe pattern.
 * Allows subscribing to events, unsubscribing, and emitting events
 * to all registered listeners for synchronous event handling.
 */
export interface ApplicationEventBus {
  /**
   * Subscribes a callback to listen for a specific event.
   * When the event is emitted, the callback will be invoked with the event data.
   * Multiple callbacks can be registered for the same event.
   * The callback remains active until explicitly removed with off().
   */
  on(event: string, callback: ApplicationEventCallback): void;

  /**
   * Unsubscribes a callback from a specific event.
   * If callback is null, removes all callbacks for the event.
   * After removal, the callback will no longer be invoked when the event is emitted.
   * Does nothing if the callback was not previously registered.
   */
  off(event: string, callback: ApplicationEventCallback | null): void;

  /**
   * Emits an event to all registered listeners synchronously.
   * Invokes all callbacks registered for the event name in registration order.
   * Each callback receives the complete ApplicationEvent object.
   * Execution blocks until all callbacks have completed.
   */
  emit(event: ApplicationEvent): void;
}

/**
 * Interface for components that need to listen to events.
 * Provides methods to subscribe and unsubscribe from specific events
 * without the ability to emit them.
 */
export interface ApplicationEventListener {
  /**
   * Registers a listener callback for a specific event type.
   * The callback will be invoked each time the event is published.
   * Supports multiple callbacks per event, all will be executed in order.
   * This is a read-only interface that cannot emit events.
   */
  on(event: string, callback: ApplicationEventCallback): void;

  /**
   * Removes a previously registered listener callback from an event.
   * The callback will no longer be invoked when the event is published.
   * Only removes the specific callback instance provided.
   * Has no effect if the callback was not registered for this event.
   */
  off(event: string, callback: ApplicationEventCallback): void;
}

/**
 * Interface for publishing events to the system.
 * Supports both synchronous and asynchronous event publication
 * without direct access to subscription management.
 */
export interface ApplicationEventPublisher {
  /**
   * Publishes an event synchronously to all registered listeners.
   * Blocks execution until all event handlers have completed processing.
   * Listeners are invoked in their registration order.
   * This is a write-only interface that cannot subscribe to events.
   */
  publish(event: ApplicationEvent): void;

  /**
   * Publishes an event asynchronously to all registered listeners.
   * Returns a Promise that resolves when all handlers have completed.
   * Allows non-blocking event publication for improved performance.
   * Handlers may execute concurrently depending on implementation.
   */
  publishAsync(event: ApplicationEvent): Promise<void>;
}


/**
 * Manages binding and unbinding of decorated event handlers for class instances.
 * Provides lifecycle management for event subscriptions using OnEvent decorator metadata.
 * Maintains internal state to track bound callbacks and prevent duplicate registrations.
 * Ensures proper cleanup of event listeners when handlers are no longer needed.
 * Works in conjunction with ApplicationEventListener to register/unregister handlers.
 */
export interface ClassApplicationEventBindManager {
  /**
   * Registers all decorated event handler methods from the target instance.
   * Retrieves OnEvent metadata and binds each method to the event listener.
   * Stores bound callback references to enable proper unbinding later.
   * Prevents duplicate bindings by checking if methods are already registered.
   * Methods are bound to the instance context to preserve 'this' references.
   */
  bind(): void;

  /**
   * Unregisters all previously bound event handler methods from the listener.
   * Uses stored callback references to ensure exact matches during removal.
   * Cleans up internal state by removing binding records after unsubscription.
   * Only removes handlers that were previously registered via bind().
   * Safely handles cases where handlers were never bound or already removed.
   */
  unbind(): void;
}