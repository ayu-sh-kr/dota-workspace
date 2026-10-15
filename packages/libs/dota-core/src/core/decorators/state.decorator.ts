import {CoreMetadata, Metadata} from "@dota/core/metadata";
import {StateConfig} from "@dota/core";

/**
 * Decorator to mark a property as a state property.
 *
 * This decorator is used to define a property as a state property in a component.
 * It registers the property in the metadata for the component, allowing it to be
 * tracked and updated accordingly.
 *
 * @returns {PropertyDecorator} - The property decorator function.
 */
function StateDecorator(): PropertyDecorator {
  return function (target, propertyKey) {
    const key = propertyKey.toString();
    Metadata.for(target).add(CoreMetadata.states, key, {prototype: key});
  }
}

export {StateDecorator as State}