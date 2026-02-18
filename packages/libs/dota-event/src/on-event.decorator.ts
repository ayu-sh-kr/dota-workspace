import 'reflect-metadata';
import {ApplicationEventListener, ApplicationEventMetadata} from "@dota/Types.ts";

export const EVENTS_METADATA_KEY = 'key:on-event';

function OnEventDecorator(name: string): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    const ctor = target.constructor;
    const existing: Array<ApplicationEventMetadata> = Reflect.getOwnMetadata(EVENTS_METADATA_KEY, ctor) || [];
    existing.push({ name: name, method: propertyKey });
    Reflect.defineMetadata(EVENTS_METADATA_KEY, existing, ctor);
  };
}
export {OnEventDecorator as OnEvent};

export function getOnEventMetadata(targetOrInstance: Object | Function): Array<ApplicationEventMetadata> {
  const ctor = typeof targetOrInstance === 'function' ? targetOrInstance : targetOrInstance.constructor;
  return Reflect.getOwnMetadata(EVENTS_METADATA_KEY, ctor) || [];
}

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

