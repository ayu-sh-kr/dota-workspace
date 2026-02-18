

export type ApplicationEventMetadata = {
  name: string
  method: string | symbol
}

export type ApplicationEvent = {
  name: string;
  data?: any;
}

export type ApplicationEventCallback = (event: ApplicationEvent) => void;

export interface ApplicationEventManager {
  add(event: string, callback: ApplicationEventCallback): void;
  remove(event: string, callback: ApplicationEventCallback | null): void;
  resolve(event: string): Set<ApplicationEventCallback> | undefined;
  clear(): void;
}

export interface ApplicationEventBus {
  on(event: string, callback: ApplicationEventCallback): void;
  off(event: string, callback: ApplicationEventCallback | null): void;
  emit(event: ApplicationEvent): void;
}

export interface ApplicationEventListener {
  on(event: string, callback: ApplicationEventCallback): void;
  off(event: string, callback: ApplicationEventCallback): void;
}

export interface ApplicationEventPublisher {
  publish(event: ApplicationEvent): void;
  publishAsync(event: ApplicationEvent): Promise<void>;
}