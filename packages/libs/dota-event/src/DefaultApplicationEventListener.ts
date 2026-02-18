import {ApplicationEventBus, ApplicationEventCallback, ApplicationEventListener} from "@dota/Types.ts";

export class DefaultApplicationEventListener implements ApplicationEventListener {

  constructor(private _eventBus: ApplicationEventBus) {}

  on(event: string, callback: ApplicationEventCallback): void {
    this._eventBus.on(event, callback);
  }

  off(event: string, callback: ApplicationEventCallback): void {
    this._eventBus.off(event, callback)
  }

}