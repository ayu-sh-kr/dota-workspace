import 'reflect-metadata'
import {ComponentConfig, DotaElementConstructor, MethodDetails} from "@dota/core/types";


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

    const methodNames = Object.getOwnPropertyNames(target.prototype)
      .filter(prop => typeof target.prototype[prop] === 'function' && prop !== 'constructor');

    const methods: MethodDetails[] = methodNames.map(name => ({
      name: name,
      method: target.prototype[name],
    }));

    Reflect.defineMetadata(target.name, methods, target);

    (target as DotaElementConstructor).__dotaSelector = config.selector;
    (target as DotaElementConstructor).__dotaShadow = config.shadow;

    Reflect.defineMetadata(target.name + ':' + 'shadow', config.shadow, target);
    Reflect.defineMetadata('Component', config, target);
  }
}

export {ComponentDecorator as Component}