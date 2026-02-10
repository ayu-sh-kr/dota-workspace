import {DotaElementConstructor} from "@dota/core";

/**
 * Bootstraps custom elements by defining them with the custom elements' registry.
 *
 * The `bootstrap` function takes an array of custom element constructors and registers them
 * with the custom elements' registry. It retrieves the component metadata using `HelperUtils.getComponentMetadata`
 * and defines the custom element if it is not already defined.
 *
 * @param {CustomElementConstructor[]} elements - An array of custom element constructors to be registered.
 *
 * @example
 * // Example of using bootstrap to register custom elements
 * import { MyElement } from './my-element';
 * import { AnotherElement } from './another-element';
 *
 * bootstrap([MyElement, AnotherElement]);
 *
 * // The custom elements are now registered and can be used in the DOM
 * const myElement = document.createElement('my-element');
 * document.body.appendChild(myElement);
 */
export const bootstrap = (elements: DotaElementConstructor[]) => {
  elements.forEach(element => {
    if (element.__dotaSelector) {
      const selector = element.__dotaSelector as string;
      if (!customElements.get(selector)) {
        customElements.define(selector, element);
      } else {
        console.warn(`Custom element with selector '${selector}' is already defined.`);
      }
    }
  })
}