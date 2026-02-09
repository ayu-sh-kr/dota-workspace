import {
  BaseElement,
  EventBindCollection,
  EventBindRecord,
  EventBindType,
  EventOptionMeta
} from "@dota/core";
import {GeneralUtils} from "@dota/core/utils/GeneralUtils.ts";


export class EventManagerService<T extends BaseElement> {
  private eventBindCollection: EventBindCollection = new Map();
  private readonly instance: T;

  constructor(instance: T) {
    this.instance = instance;
  }

  /**
   * Creates a unique key for an event binding record by combining the event name and option name.
   * This ensures consistency across all event binding operations.
   *
   * @param eventName - The name of the event (e.g., 'click', 'input')
   * @param option - The event option metadata containing the option name
   * @returns A unique string key in the format "eventName:optionName"
   * @private
   */
  private makeKey(eventName: string, option: EventOptionMeta): string {
    return `${eventName}:${option.name}`;
  }

  /**
   * Adds an event binding record to the collection.
   * Creates a new map for the event bind type if it doesn't exist.
   *
   * @param type - The type of event binding (e.g., element, window, document)
   * @param record - The event binding record containing element, handler, and metadata
   * @public
   */
  public addEvent(type: EventBindType, record: EventBindRecord): void {
    if (!this.eventBindCollection.has(type)) {
      this.eventBindCollection.set(type, new Map<string, EventBindRecord>());
    }
    const bindRecords = this.eventBindCollection.get(type);
    if (!bindRecords) return;

    const key = this.makeKey(record.event, record.option);
    bindRecords.set(key, record);
  }

  /**
   * Retrieves an event binding record from the collection by its type and key.
   *
   * @param type - The type of event binding to search in
   * @param key - The unique key identifying the event binding record
   * @returns The event binding record if found, undefined otherwise
   * @public
   */
  public getEvent(type: EventBindType, key: string): EventBindRecord | undefined {
    return this.eventBindCollection.get(type)?.get(key);
  }

  /**
   * Binds one or more event listeners to a DOM element and stores the binding records.
   * Prevents duplicate bindings if called multiple times with the same parameters.
   * The handler method is called with the component instance as context.
   *
   * @param element - The DOM element, window, document, or shadow root to bind the event to
   * @param option - The event option metadata containing event name(s) and handler method
   * @param type - The type of event binding for categorization
   * @public
   */
  public bindEvent(
    element: HTMLElement | Window | Document | ShadowRoot,
    option: EventOptionMeta,
    type: EventBindType
  ): void {
    const events = GeneralUtils.convertToArray(option.event);

    for (const eventName of events) {
      const key = this.makeKey(eventName, option);
      const collection = this.eventBindCollection.get(type);

      // Prevent duplicates if called multiple times
      if (collection?.has(key)) continue;

      const handler: EventListener = (e: Event) => option.method.call(this.instance, e);

      const record: EventBindRecord = {
        element: element,
        type: type,
        option: option,
        event: eventName,
        handler: handler,
      }

      element.addEventListener(eventName, handler);
      this.addEvent(type, record);
    }
  }

  /**
   * Removes one or more event listeners from a DOM element and deletes the binding records.
   * Uses stored handler references to ensure proper cleanup of event listeners.
   *
   * @param element - The DOM element, window, document, or shadow root to unbind the event from
   * @param option - The event option metadata containing event name(s) to unbind
   * @param type - The type of event binding to remove
   * @public
   */
  public unbindEvent(
    element: HTMLElement | Window | Document | ShadowRoot,
    option: EventOptionMeta,
    type: EventBindType
  ): void {
    const events = GeneralUtils.convertToArray(option.event);
    const collection = this.eventBindCollection.get(type);
    if (!collection) return;

    for (const eventName of events) {
      const key = this.makeKey(eventName, option);
      const record = collection.get(key);
      if (!record) continue;

      // Use the stored handler reference (this is the critical fix)
      element.removeEventListener(eventName, record.handler);
      collection.delete(key);
    }
  }
}