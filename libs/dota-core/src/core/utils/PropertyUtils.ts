import {BaseElement, HelperUtils, PropertyDetails, Sanitizer, WatcherOptionMeta} from "@dota/core";


export class PropertyUtils {
  /**
   * Binds reactive properties to an element based on metadata, creating reactive getters/setters
   * that synchronize with DOM attributes and trigger watchers on changes.
   *
   * This function performs the following steps for each property defined in metadata:
   * 1. Retrieves property metadata using HelperUtils.fetchOrCreate
   * 2. Captures any existing JavaScript-initialized values before defining accessors
   * 3. Creates a backing field (prefixed with underscore) to store the actual value
   * 4. Installs reactive getter/setter that:
   *    - Returns value from backing field on get
   *    - Updates backing field, syncs to DOM attribute, and triggers watchers on set
   * 5. Reflects initial JavaScript values to DOM attributes if not already present
   * 6. Sets the element's `reactive` flag to true
   *
   * The function preserves any values set via JavaScript initialization (e.g., in constructor)
   * and ensures clean property descriptor installation by removing conflicting own data properties.
   *
   * @function bindReactive
   * @param {any} element - The element instance to bind reactive properties to. Typically extends BaseElement.
   *
   * @example
   * // Define a property with decorator
   * class MyComponent extends BaseElement {
   *   @Property({name: 'duration', type: Number})
   *   duration!: number;
   *
   *   constructor() {
   *     super();
   *     this.duration = 5000; // JS initialization is preserved
   *   }
   * }
   *
   * // After bindReactive is called (typically in element lifecycle):
   * const element = new MyComponent();
   * PropertyUtils.bindReactive(element);
   *
   * // Property changes now sync to attribute and trigger watchers
   * element.duration = 3000; // Sets attribute and calls watchers
   * console.log(element.getAttribute('duration')); // "3000"
   */
  static bindReactive(element: any) {
    const data = HelperUtils.fetchOrCreate<PropertyDetails>(element, 'Property');

    data.forEach((meta: PropertyDetails) => {
      const publicKey = meta.prototype; // the actual property name, e.g. "duration"
      const backingKey = `_${publicKey}`;      // e.g. "_duration"
      const attrName = meta.name;       // from the decorator options, e.g. "duration"

      // --- Capture JS-initialized value (before we install accessor) ---
      // Prefer already-existing backing field, else capture an own data property.
      let jsValue = element[backingKey];

      const ownDesc = Object.getOwnPropertyDescriptor(element, publicKey);
      const hasOwnDataProp =
        !!ownDesc &&
        ("value" in ownDesc) &&
        typeof ownDesc.get !== "function" &&
        typeof ownDesc.set !== "function";

      if (jsValue === undefined && hasOwnDataProp) {
        jsValue = ownDesc!.value;
      }

      // Remove conflicting own data property so defineProperty installs cleanly.
      if (hasOwnDataProp) {
        delete element[publicKey];
      }

      // --- Capture attribute value (attribute wins over JS/default) ---
      let attrValue: any = undefined;
      const hasAttr = element.hasAttribute?.(attrName);
      if (hasAttr) {
        const raw = element.getAttribute(attrName);
        // Note: raw can be "" (empty string) and that's still a real attribute value.
        if (raw !== null) {
          attrValue = Sanitizer.sanitize(raw, meta.type);
        }
      }

      // --- Compute initial value using precedence: attr > js > default ---
      const defaultValue = meta.default;
      const initial =
        attrValue !== undefined ? attrValue :
          jsValue !== undefined ? jsValue :
            defaultValue !== undefined ? defaultValue :
              undefined;

      // Seed backing field BEFORE installing accessor (preserves initial).
      // We intentionally seed even if initial is undefined? No—avoid clobbering.
      if (initial !== undefined && element[backingKey] !== initial) {
        element[backingKey] = initial;
      }

      // Install reactive accessor
      Object.defineProperty(element, publicKey, {
        get(): any {
          return element[backingKey];
        },

        set(v: any) {
          if (element[backingKey] !== v) {
            element[backingKey] = v;
            element.setAttribute(attrName, v);
            PropertyUtils.bindWatchers(element, publicKey);
          }
        },

        enumerable: true,
        configurable: true
      });

      // Reflect initial value to attribute ONLY if attribute wasn't already the source of truth.
      // This keeps DOM + property aligned without overriding explicit HTML attributes.
      if (!hasAttr && initial !== undefined) {
        element.setAttribute(attrName, initial);
      }
    });

    element.reactive = true;
  }

  static bindWatchers(element: BaseElement, prototype: string) {
    const watchers = HelperUtils.fetchOrCreate<WatcherOptionMeta>(element, `Watcher:${prototype}`);
    if (watchers && watchers.size > 0) {
      watchers.forEach((item: WatcherOptionMeta) => {
        if (element[item.name] && typeof element[item.name] === 'function') {
          item.method.call(element);
        }
      });
    }
  }

  /**
   * Unbinds reactive properties from an element.
   *
   * This function removes the reactive bindings from properties that were previously bound using `bindReactive`.
   * It deletes the property descriptors and restores the original property values.
   * After unbinding, the element's `reactive` flag is set to false.
   *
   * @function unbindReactive
   * @param {any} element - The element to unbind reactive properties from.
   *
   * @example
   * // Assuming `element` is an instance of a class that extends `BaseElement` with reactive properties
   * unbindReactive(element);
   *
   * // Now, the properties are no longer reactive
   * element.reactive // false
   */
  static unbindReactive(element: any) {
    let data = HelperUtils.fetchOrCreate<PropertyDetails>(element, 'Property');

    data.forEach((value: PropertyDetails) => {
      const propertyKey = `_${value.prototype}`;
      const currentValue = element[propertyKey];

      delete element[value.prototype];
      delete element[propertyKey];

      element[value.prototype] = currentValue;
    });

    element.reactive = false;
  }

  /**
   * Unbinds watchers for a specific property on an element.
   *
   * This function clears all watchers associated with a specific property prototype.
   * It retrieves the watcher metadata and clears the Map to remove all registered watchers.
   *
   * @function unbindWatchers
   * @param {BaseElement} element - The element to unbind watchers from.
   * @param {string} prototype - The property prototype key for which to unbind watchers.
   *
   * @example
   * // Assuming `element` has watchers on 'someProperty'
   * unbindWatchers(element, 'someProperty');
   *
   * // Now, watchers for 'someProperty' are removed
   */
  static unbindWatchers(element: BaseElement, prototype: string) {
    const watchers = HelperUtils.fetchOrCreate<WatcherOptionMeta>(element, `Watcher:${prototype}`);
    if (watchers && watchers.size > 0) {
      watchers.clear();
    }
  }

}