import {ApplicationEvent, ApplicationEventBus, ApplicationEventCallback} from "@dota/Types.ts";
import {DefaultApplicationEventManager} from "@dota/DefaultApplicationEventManager.ts";


export class DefaultApplicationEventBus implements ApplicationEventBus {
  private static instance: DefaultApplicationEventBus;

  private _eventManager = new DefaultApplicationEventManager();

  private constructor() {}

  static getInstance(): DefaultApplicationEventBus {
    if (!DefaultApplicationEventBus.instance) {
      DefaultApplicationEventBus.instance = new DefaultApplicationEventBus();
    }
    return DefaultApplicationEventBus.instance;
  }
  
  async on(event: string, callback: ApplicationEventCallback): Promise<void> {
    this._eventManager.add(event, callback)
  }

  async off(event: string, callback: ApplicationEventCallback | null): Promise<void> {
    this._eventManager.remove(event, callback)
  }

  async emit(event: ApplicationEvent): Promise<void> {
    const callbacks = this._eventManager.resolve(event.name);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      callback(event);
    })
  }

}