import {ComponentConfig, DotaElementConstructor} from "@dota/core/types";
import {Metadata} from "@dota/metadata";
import {CoreMetadata} from "@dota/core/constants";


/**
 * Decorator for registering web components.
 *
 * This decorator is used to register a class as a custom web component.
 * It takes a configuration object that specifies the component's selector and other options.
 *
 * @param {ComponentConfig} config - The configuration object for the component.
 * @returns {ClassDecorator} - A class decorator function that registers the component.
 *
 * @example
 * \@Component({
 *   selector: 'my-component',
 *   shadow: true
 * })
 * class MyComponent extends BaseElement {
 *   // Component logic here
 * }
 */
function ComponentDecorator(config: ComponentConfig): ClassDecorator {
  return function (target: any) {
    Metadata.for(target).set(CoreMetadata.component, config);

    (target as DotaElementConstructor).__dotaSelector = config.selector;
    (target as DotaElementConstructor).__dotaShadow = config.shadow;
    (target as DotaElementConstructor).__dotaMode = config.mode;
  }
}

export {ComponentDecorator as Component}