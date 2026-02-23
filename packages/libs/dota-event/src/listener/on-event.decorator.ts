import 'reflect-metadata';
import {ApplicationEventListener, ApplicationEventMetadata} from "@dota/Types.ts";


export const EVENTS_METADATA_KEY = 'key:on-event';

/**
 * Method decorator that marks a class method as an event handler.
 * Stores metadata associating the decorated method with a specific event name.
 * Multiple methods in a class can be decorated to handle different events.
 * The metadata is later used by bindInstanceEventHandlers to register listeners.
 * @param name - The event name this method should handle
 * @param scoped - Optional flag for future use to indicate if the handler should be scoped (not currently implemented)
 * @returns A method decorator function that adds metadata to the class constructor
 */
function OnEventDecorator(name: string, scoped: boolean = false): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    const ctor = target.constructor;
    const existing: Array<ApplicationEventMetadata> = Reflect.getOwnMetadata(EVENTS_METADATA_KEY, ctor) || [];
    existing.push({ name: name, method: propertyKey, scoped: scoped });
    Reflect.defineMetadata(EVENTS_METADATA_KEY, existing, ctor);
  };
}
export {OnEventDecorator as OnEvent};

/**
 * Retrieves all event handler metadata from a class or instance.
 * Returns an array of metadata objects containing event names and method references.
 * Works with both class constructors and instance objects.
 * Returns an empty array if no event handlers are decorated.
 * @param targetOrInstance - The class constructor or instance to extract metadata from
 */
export function getOnEventMetadata(targetOrInstance: Object | Function): Array<ApplicationEventMetadata> {
  const ctor = typeof targetOrInstance === 'function' ? targetOrInstance : targetOrInstance.constructor;
  return Reflect.getOwnMetadata(EVENTS_METADATA_KEY, ctor) || [];
}

/**
 * Binds all decorated event handler methods from an instance to an event listener.
 * Retrieves metadata using OnEvent decorator and registers each method as a callback.
 * Methods are bound to the instance context to preserve 'this' references.
 * If no decorated methods exist, the function returns without action.
 * @param instance - The object instance containing decorated event handler methods
 * @param listener - The event listener to register handlers with
 */
export async function bindInstanceEventHandlers(instance: Object, listener: ApplicationEventListener) {
  const metadata = getOnEventMetadata(instance);
  if (metadata.length === 0) return;

  metadata.forEach(({ name, method }) => {
    const handler = (instance as any)[method];
    if (typeof handler === 'function') {
      const listenerCallback = handler as Function;
      listener.on(name, listenerCallback.bind(instance));
    }
  });
}

/**
 * Removes all decorated event handler methods from an event listener.
 * Retrieves metadata and unregisters each previously bound method callback.
 * Methods must match the same bound instance context used during registration.
 * If no decorated methods exist, the function returns without action.
 * @param instance - The object instance whose handlers should be unregistered
 * @param listener - The event listener to remove handlers from
 */
export async function unbindInstanceEventHandlers(instance: Object, listener: ApplicationEventListener) {
  const metadata = getOnEventMetadata(instance);
  if (metadata.length === 0) return;

  metadata.forEach(({name, method}) => {
    const handler = (instance as any)[method];
    if (typeof handler === 'function') {
      const listenerCallback = handler as Function;
      listener.off(name, listenerCallback.bind(instance));
    }
  });
}

