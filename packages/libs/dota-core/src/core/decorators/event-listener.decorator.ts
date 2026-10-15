import {EventConfig} from "@dota/core/types";
import {CoreMetadata, Metadata} from "@dota/core/metadata";


/**
 * A method decorator that listens for an event on the window or on the component host.
 *
 * The decorator only records the listener as class metadata. `BaseElement` adds the listener
 * when the element connects and removes the same function when it disconnects, so handlers
 * neither leak nor stack across reconnects. Subclasses inherit decorated listeners.
 *
 * @param {EventConfig} config - Event name, target (`EventType.WINDOW` or `EventType.ROOT`), and
 * optional listener options.
 * @returns {MethodDecorator} - A method decorator function.
 *
 * @example
 * \@Component({ selector: 'my-element' })
 * class MyElement extends BaseElement {
 *   \@EventListener({ name: 'resize', type: EventType.WINDOW })
 *   onResize(event: Event) {
 *     console.log('Window resized', event);
 *   }
 * }
 */
function EventListenerDecorator(config: EventConfig): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const method = propertyKey.toString();
    Metadata.for(target).add(CoreMetadata.eventListeners, method, {...config, method});
    return descriptor;
  }
}

export {EventListenerDecorator as EventListener}