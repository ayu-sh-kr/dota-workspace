import {Metadata} from "@dota/metadata";
import {CoreMetadata} from "@dota/core/constants";
import {ParameterConfig} from "@dota/core";


/**
 * A decorator function that defines a parameter for a custom element.
 *
 * The `ParamDecorator` function is used to define a parameter for a custom element,
 * including its configuration details such as the parameter name.
 *
 * @param {string} [name] - The name of the parameter. If not provided, it defaults to the property key.
 * @returns {PropertyDecorator} - A property decorator function.
 *
 * @example
 * // Example of using ParamDecorator to define a parameter on a custom element
 * class MyElement extends HTMLElement {
 *   \@Param('my-param')
 *   public myParam: string;
 * }
 *
 * // The parameter is now defined and can be used in the custom element
 */
function ParamDecorator(name?: string): PropertyDecorator {
  return function (target, propertyKey) {
    const param = name ? name : propertyKey.toString();
    Metadata.for(target).add(CoreMetadata.params, propertyKey.toString(), {name: param});
  }
}

export {ParamDecorator as Param}