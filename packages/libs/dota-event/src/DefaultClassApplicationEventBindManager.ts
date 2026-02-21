import {ApplicationEventCallback, ApplicationEventListener, ClassApplicationEventBindManager} from "@dota/Types.ts";
import {getOnEventMetadata} from "@dota/on-event.decorator.ts";


/**
 * Manages event handler bindings for class instances with decorated methods.
 * Tracks bound callbacks in an internal store to prevent duplicate registrations.
 * Provides bind/unbind operations that work with OnEvent decorator metadata.
 * Ensures proper cleanup by maintaining references to bound function instances.
 * Used as the default implementation for managing class-level event subscriptions.
 * Note: This manager does not bind methods decorated with scoped events - those are skipped during bind/unbind operations.
 */
export class DefaultClassApplicationEventBindManager implements ClassApplicationEventBindManager {
  private _store: Map<string, Map<string, ApplicationEventCallback>> = new Map();

  constructor(private target: Object, private listener: ApplicationEventListener) {
  }

  /**
   * Registers all OnEvent decorated methods from the target instance to the listener.
   * Retrieves decorator metadata and binds each method to preserve instance context.
   * Stores bound callbacks internally to enable proper unbinding and prevent duplicates.
   * Skips methods that are not functions or already bound for the same event.
   * Does nothing if no decorated event handlers exist on the target.
   * Note: Methods decorated with scoped events are explicitly skipped and not bound.
   */
  async bind() {
    const metadata = getOnEventMetadata(this.target);
    if (metadata.length === 0) return;

    metadata.forEach(({name, method, scoped}) => {
      if (scoped) return;
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

      // Register with the listener
      this.listener.on(name, boundCallback);
    });
  }

  /**
   * Unregisters all OnEvent decorated methods from the listener.
   * Uses stored bound callbacks to ensure exact handler removal from the listener.
   * Cleans up internal store by removing method references and empty event maps.
   * Skips methods that were never bound or already unbound.
   * Does nothing if no decorated event handlers exist on the target.
   * Note: Methods decorated with scoped events are explicitly skipped and not unbound.
   */
  async unbind() {
    const metadata = getOnEventMetadata(this.target);
    if (metadata.length === 0) return;

    metadata.forEach(({name, method, scoped}) => {
      if (scoped) return;
      const eventBindings = this._store.get(name);
      if (!eventBindings) return;

      const methodKey = String(method);
      const boundCallback = eventBindings.get(methodKey);
      if (!boundCallback) return;

      // Unregister from the listener
      this.listener.off(name, boundCallback);

      // Remove from the store
      eventBindings.delete(methodKey);

      // Clean up empty event bindings
      if (eventBindings.size === 0) {
        this._store.delete(name);
      }
    });
  }

}