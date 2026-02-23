import {ApplicationEventListener} from "@dota/Types.ts";

/**
 * Global singleton registry that holds the default ApplicationEventListener instance.
 * Provides centralized access to the event listener throughout the application lifecycle.
 * Must be initialized via setListener before any getListener calls to avoid runtime errors.
 * Used internally by event management components to access the shared listener instance.
 * Ensures a single source of truth for event listener configuration across the system.
 */
export class DefaultApplicationEventRegistry {
  
  private static listener: ApplicationEventListener | null = null;

  /**
   * Initializes the global ApplicationEventListener instance for the registry.
   * Should be called once during application bootstrap before any event operations.
   * Overwrites any previously set listener without warning or validation.
   * Typically invoked by the event manager during initialization phase.
   * @param listener - The ApplicationEventListener implementation to register globally
   */
  static setListener(listener: ApplicationEventListener) {
    this.listener = listener;
  }

  /**
   * Retrieves the globally registered ApplicationEventListener instance.
   * Throws an error if setListener has not been called prior to this invocation.
   * Used by event bus and publisher components to access the shared listener.
   * Guarantees non-null return value when initialization contract is followed.
   * @returns The registered ApplicationEventListener instance
   * @throws Error if the listener has not been initialized via setListener
   */
  static getListener(): ApplicationEventListener {
    if (this.listener == null) {
      throw new Error("ApplicationEventListener has not been set in DefaultApplicationEventRegistry.");
    }
    return this.listener;
  }
  
}