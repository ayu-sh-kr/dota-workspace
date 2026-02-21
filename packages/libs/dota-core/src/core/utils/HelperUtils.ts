import "reflect-metadata";
import {DotaElementConstructor, PropertyDetails, WatcherOptionMeta} from "@dota/core/types";
import {BaseElement} from "@dota/core";


export class HelperUtils {

  /**
   * Fetches existing metadata or creates new metadata for a given target and appender.
   *
   * This method retrieves metadata associated with the target's constructor using the specified appender.
   * If the metadata does not exist, it creates a new Map, defines it as metadata, and returns it.
   * If the metadata already exists, it simply returns the existing Map.
   *
   * @template T - The type of the metadata value.
   * @param {any} target - The target object to fetch or create metadata for.
   * @param {string} appender - The appender string used to construct the metadata key.
   * @returns {Map<string, T>} - The metadata Map associated with the target and appender.
   */
  static fetchOrCreate<T>(target: any, appender: string): Map<string, T> {
    const key = `${target.constructor.name}:${appender}`

    let data: Map<string, T>;
    if (!Reflect.hasMetadata(key, target)) {
      data = new Map<string, T>();
      Reflect.defineMetadata(key, data, target);
    }

    data = Reflect.getMetadata(key, target);

    return data;
  }

  /**
   * Extracts metadata for a given decorator from a class.
   *
   * @param {Function} targetConstructor - The class from which to extract metadata.
   * @param {string} decoratorName - The name of the decorator.
   * @returns {any} - The metadata associated with the specified decorator.
   */
  static getComponentMetadata(targetConstructor: Object, decoratorName: string): any {
    if (Reflect.hasOwnMetadata(decoratorName, targetConstructor)) {
      return Reflect.getOwnMetadata(decoratorName, targetConstructor);
    }
  }

  /**
   * Converts a target (constructor function or object instance) to a DotaElementConstructor.
   *
   * This method validates that the target is either a constructor function or an object instance,
   * and ensures that the resulting constructor extends BaseElement. It performs type checking
   * and throws errors if the target does not meet the requirements.
   *
   * @param {any} target - The target to convert, which can be a constructor function or an object instance.
   * @returns {DotaElementConstructor} - The validated constructor that extends BaseElement.
   * @throws {TypeError} - If the target is not a constructor function or an object instance.
   * @throws {TypeError} - If the target constructor does not extend BaseElement.
   */
  static toDotaElementConstructor(target: any): DotaElementConstructor {
    const constructor = typeof target === 'function' ? target : target?.constructor;
    
    if (typeof constructor !== 'function') {
      throw new TypeError('Target must be a constructor function or an object instance');
    }
    
    if (!(constructor.prototype instanceof BaseElement) && constructor !== BaseElement) {
      throw new TypeError('Target must extend BaseElement');
    }

    return constructor as DotaElementConstructor;
  }

}