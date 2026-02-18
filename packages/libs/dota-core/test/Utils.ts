import {ComponentConfig, DotaElementConstructor, HelperUtils} from "@dota/core";

export const microtask = async () => Promise.resolve();

export type CustomElementInstance<T extends DotaElementConstructor> = {
  tag: string,
  el: InstanceType<T>
}


export const defineAndCreate = <T extends DotaElementConstructor>(ctor: T): CustomElementInstance<T> => {

  if (ctor.__dotaSelector) {
    if (!customElements.get(ctor.__dotaSelector)) {
      customElements.define(ctor.__dotaSelector, ctor);

      return {
        tag: ctor.__dotaSelector,
        el: document.createElement(ctor.__dotaSelector) as InstanceType<T>
      }
    }
  } else {
    const config: ComponentConfig | undefined = HelperUtils.getComponentMetadata(ctor, 'Component')
    if (config && !customElements.get(config.selector)) {
      customElements.define(config.selector, ctor);

      return {
        tag: config.selector,
        el: document.createElement(config.selector) as InstanceType<T>
      }
    }
  }

  throw new Error(`Unable to define custom element: element is already defined or missing required metadata`);
}