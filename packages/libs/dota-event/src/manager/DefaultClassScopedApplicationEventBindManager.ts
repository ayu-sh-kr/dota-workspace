import {ApplicationEventCallback, ClassApplicationEventBindManager} from "@dota/Types.ts";
import {EventChannel} from "@dota/channel/EventChannel.ts";
import {getOnEventMetadata} from "@dota/listener/on-event.decorator.ts";

/**
 * Manages scoped event bindings for class methods decorated with @OnEvent(scoped: true).
 * Automatically binds and unbinds decorated methods to/from an EventChannel based on metadata.
 * Maintains internal state to prevent duplicate bindings and ensure clean unbinding.
 * Used for component lifecycle-aware event handling where methods should only listen while the instance is active.
 * Stores bound callbacks per event and method to enable precise cleanup during unbind operations.
 * Filters non-scoped event handlers to only manage scoped bindings within the instance's lifecycle.
 */
export class DefaultClassScopedApplicationEventBindManager implements ClassApplicationEventBindManager {

  private _store: Map<string, Map<string, ApplicationEventCallback>> = new Map();

  constructor(
    private target: Object,
    private eventChannel: EventChannel
  ) {}

  /**
   * Registers all scoped event handlers from the target instance to the EventChannel.
   * Extracts metadata from @OnEvent decorators, filters for scoped handlers only.
   * Prevents duplicate bindings by checking internal store before registration.
   * Binds each handler method to the target instance context to preserve 'this' reference.
   * Stores bound callbacks for later retrieval during unbind to ensure exact callback removal.
   * Skips non-function handlers and already-bound method-event pairs to maintain idempotency.
   */
  async bind(): Promise<void> {
    const metadata = getOnEventMetadata(this.target);
    if (metadata.length === 0) return;

    metadata.forEach(({name, method, scoped}) => {
      if (!scoped) return;
      const handler = (this.target as any)[method];
      if (typeof handler !== 'function') return;

      // Check if this event already has bindings
      if (!this._store.has(name)) {
        this._store.set(name, new Map());
      }

      const eventBindings = this._store.get(name)!;
      const methodKey = String(method);

      // Check if this specific method is already bound for this event
      if (eventBindings.has(methodKey)) return;

      // Bind the method and store the callback
      const boundCallback = handler.bind(this.target) as ApplicationEventCallback;
      eventBindings.set(methodKey, boundCallback);

      // Register with the event channel
      this.eventChannel.on(name, boundCallback);
    })
  }

  /**
   * Unregisters all scoped event handlers from the EventChannel and cleans up internal state.
   * Retrieves stored bound callbacks to ensure exact callback removal from the event channel.
   * Filters for scoped handlers only, matching the bind() behavior symmetrically.
   * Removes callbacks from the internal store after successful unregistration.
   * Performs housekeeping by removing empty event binding maps to prevent memory leaks.
   * Safe to call multiple times or when no bindings exist due to early return guards.
   */
  async unbind(): Promise<void> {
    const metadata = getOnEventMetadata(this.target);
    if (metadata.length === 0) return;

    metadata.forEach(({name, method, scoped}) => {
      if (!scoped) return;
      const eventBindings = this._store.get(name);
      if (!eventBindings) return;

      const methodKey = String(method);
      const boundCallback = eventBindings.get(methodKey);
      if (!boundCallback) return;

      // Unregister from the event channel
      this.eventChannel.off(name, boundCallback);

      // Clean up the store
      eventBindings.delete(methodKey);
      if (eventBindings.size === 0) {
        this._store.delete(name);
      }
    });
  }

}