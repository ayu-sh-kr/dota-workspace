import {BubbleOrOptions} from "@dota/core";

/**
 * A class that provides a simple event emitting mechanism.
 *
 * The `EventEmitter` class allows you to create custom events and dispatch them
 * to either a specified root element or the global window object. The events
 * are created with a specified name and can carry data of type `T`.
 *
 * @template T - The type of data that the event will carry.
 */
export class EventEmitter<T> {

  /**
   * Creates an instance of `EventEmitter`.
   *
   * @param {string} name - The name of the event to be emitted.
   */
  constructor(private name: string) {
  }


  /**
   * Emits an event with the specified data.
   *
   * Backward compatible signature:
   *   emit(data, root?, bubbles?)
   *
   * New options signature:
   *   emit(data, root?, { bubbles?, composed? })
   */
  emit(
    data: T,
    root?: HTMLElement | Window | Document | ShadowRoot,
    bubblesOrOptions: BubbleOrOptions = false
  ): void {
    const opts =
      typeof bubblesOrOptions === "boolean"
        ? {
            bubbles: bubblesOrOptions,
            composed: true ,
            cancelable: false
          }
        : {
            bubbles: bubblesOrOptions.bubbles ?? false,
            composed: bubblesOrOptions.composed ?? true,
            cancelable: bubblesOrOptions.cancelable ?? false
          };

    const event = new CustomEvent<T>(this.name, {
      bubbles: opts.bubbles,
      composed: opts.composed,
      cancelable: opts.cancelable,
      detail: data,
    });

    const target: EventTarget = root ?? window;
    target.dispatchEvent(event);
  }
}