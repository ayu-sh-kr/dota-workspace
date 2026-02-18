import {ApplicationEvent, ApplicationEventBus, ApplicationEventPublisher} from "@dota/Types.ts";

export class DefaultApplicationEventPublisher implements ApplicationEventPublisher {

  constructor(private _eventBus: ApplicationEventBus) {
  }

  publish(event: ApplicationEvent): void {
    this._eventBus.emit(event);
  }

  async publishAsync(event: ApplicationEvent): Promise<void> {
    this.publish(event)
  }

}