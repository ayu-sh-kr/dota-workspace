import {ApplicationEventCallback, ApplicationEventManager} from "@dota/Types.ts";


export class DefaultApplicationEventManager implements ApplicationEventManager {

  private store: Map<string, Set<ApplicationEventCallback>> = new Map();

  add(event: string, callback: ApplicationEventCallback): void {
    if (!this.store.has(event)) {
      this.store.set(event, new Set());
    }

    this.store.get(event)?.add(callback);
  }

  remove(event: string, callback: ApplicationEventCallback | null): void {
    if (!callback) {
      this.store.delete(event);
      return;
    }

    if (!this.store.has(event)) return;

    this.store.get(event)?.delete(callback);
  }

  resolve(event: string): Set<ApplicationEventCallback> | undefined {
    if (!this.store.has(event)) return;
    return this.store.get(event);
  }

  clear() {
    this.store.clear();
  }

}