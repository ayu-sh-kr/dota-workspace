import {
  ApplicationEvent,
  ApplicationEventBus,
  ApplicationEventCallback,
  ApplicationEventListener,
  ApplicationEventPublisher
} from "@dota/Types.ts";


/**
 * Namespaced event bus implementation that wraps ApplicationEventListener and ApplicationEventPublisher.
 * Automatically prefixes all event names with a namespace to isolate event channels by context.
 * Used to create scoped event communication channels, such as component lifecycle events.
 * Delegates actual listening and publishing to the injected listener and publisher instances.
 * Ensures event name consistency by applying the prefix uniformly across all operations.
 */
export class EventChannel implements ApplicationEventBus {

  /**
   * Creates a new EventChannel with the specified namespace prefix.
   * All events registered, removed, or emitted through this channel will be prefixed.
   * @param prefix - The namespace prefix to prepend to all event names (e.g., 'dota-popover')
   * @param eventListener - The underlying listener to delegate event registration to
   * @param eventPublisher - The underlying publisher to delegate event emission to
   */
  constructor(
    private prefix: string,
    private eventListener: ApplicationEventListener,
    private eventPublisher: ApplicationEventPublisher
  ) {
  }

  /**
   * Registers an event listener callback for the specified event within this channel's namespace.
   * Automatically prepends the channel prefix to the event name before registration.
   * The callback will be invoked when the prefixed event is emitted through this or any channel.
   * Multiple callbacks can be registered for the same event name within this channel.
   * @param event - The unprefixed event name to listen for (prefix will be added automatically)
   * @param callback - The function to execute when the namespaced event is emitted
   */
  on(event: string, callback: ApplicationEventCallback): void {
    this.eventListener.on(`${this.prefix}:${event}`, callback);
  }

  /**
   * Unregisters an event listener callback for the specified event within this channel's namespace.
   * Guards against null callbacks by returning early without attempting removal.
   * Automatically prepends the channel prefix to the event name before unregistration.
   * Only removes the specific callback provided; other callbacks for the same event remain active.
   * @param event - The unprefixed event name to stop listening for (prefix will be added automatically)
   * @param callback - The specific callback to remove, or null to silently skip removal
   */
  off(event: string, callback: ApplicationEventCallback | null): void {
    if (callback == null) return;
    this.eventListener.off(`${this.prefix}:${event}`, callback);
  }

  /**
   * Emits an event through this channel's namespace by publishing it with the prefixed name.
   * Creates a new event object with all original properties but replaces the name with the prefixed version.
   * All listeners registered for the prefixed event name will receive the event, regardless of channel.
   * Delegates the actual publication to the underlying event publisher instance.
   * @param event - The application event to emit with the channel prefix applied to its name
   */
  emit(event: ApplicationEvent): void {
    this.eventPublisher.publish({
      ...event,
      name: `${this.prefix}:${event.name}`
    });
  }

}