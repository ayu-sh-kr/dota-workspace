import {
  ApplicationEventBus,
  ApplicationEventListener, ApplicationEventPublisher,
  DefaultApplicationEventBus,
  DefaultApplicationEventListener, DefaultApplicationEventPublisher,
  EventChannel
} from "@ayu-sh-kr/dota-event";


/**
 * A singleton service that provides centralized access to the application's event system.
 * This service manages the event bus, event listener, and event publisher instances,
 * ensuring a single point of access for all event-related operations throughout the application.
 *
 * @class ApplicationEventService
 * @example
 * ```typescript
 * const eventService = ApplicationEventService.getInstance();
 * const listener = eventService.getListener();
 * const publisher = eventService.gePublisher();
 * ```
 */
export class ApplicationEventService {
  private static _instance: ApplicationEventService;
  private readonly eventBus!: ApplicationEventBus;
  private readonly listener!: ApplicationEventListener;
  private readonly publisher!: ApplicationEventPublisher

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the event bus, listener, and publisher instances.
   *
   * @private
   */
  private constructor() {
    this.eventBus = DefaultApplicationEventBus.getInstance();
    this.listener = new DefaultApplicationEventListener(this.eventBus);
    this.publisher = new DefaultApplicationEventPublisher(this.eventBus);
  }

  /**
   * Returns the singleton instance of ApplicationEventService.
   * Creates a new instance if one doesn't exist.
   *
   * @static
   * @returns {ApplicationEventService} The singleton instance of the service
   */
  static getInstance(): ApplicationEventService {
    if (!ApplicationEventService._instance) {
      ApplicationEventService._instance = new ApplicationEventService();
    }
    return ApplicationEventService._instance;
  }

  /**
   * Retrieves the application event listener instance.
   * The listener is used to subscribe to and handle application events.
   *
   * @returns {ApplicationEventListener} The event listener instance
   */
  getListener(): ApplicationEventListener {
    return this.listener;
  }

  /**
   * Retrieves the application event publisher instance.
   * The publisher is used to emit events throughout the application.
   *
   * @returns {ApplicationEventPublisher} The event publisher instance
   */
  getPublisher(): ApplicationEventPublisher {
    return this.publisher;
  }

  /**
   * Retrieves the application event bus instance.
   * The event bus manages event subscriptions and publications.
   *
   * @returns {ApplicationEventBus} The event bus instance
   */
  getEventBus(): ApplicationEventBus {
    return this.eventBus
  }

  /**
   * Creates a new event channel with the specified prefix.
   * An event channel is a scoped communication channel for events, allowing for organized event handling.
   * The prefix is used to namespace events within the channel, helping to avoid naming collisions and improve event management.
   *
   * @param prefix A string prefix to namespace the events in the channel
   * @returns {EventChannel} A new event channel instance with the specified prefix
   */
  createEventChannel(prefix: string): EventChannel {
    return new EventChannel(prefix, this.listener, this.publisher);
  }
}