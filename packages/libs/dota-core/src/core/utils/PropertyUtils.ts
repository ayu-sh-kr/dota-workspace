import {BaseElement, HelperUtils, PropertyDetails, PropertyType, Sanitizer, WatcherOptionMeta} from "@dota/core";


export class PropertyUtils {
  /**
   * Converts a reactive property value to the string required by the DOM attribute API.
   * Object-like property types provide JSON serialization so field initializers and JavaScript
   * assignments do not degrade to `"[object Object]"` before attribute observers read them.
 * @param value - Current public property value selected during binding or assignment.
 * @param type - Property contract that may define its own attribute serialization.
 * @returns The string representation stored in the matching HTML attribute.
   */
  private static serializeAttributeValue(value: any, type: PropertyType<any>): string {
    return type.serialize ? type.serialize(value) : String(value);
  }

  /**
   * Compares values using their reflected form when a property type has custom serialization.
   * This prevents an attribute callback's parsed object from replacing an equivalent object and
   * re-entering the reactive setter after a JavaScript assignment.
 * @param current - Value currently stored in the reactive backing field.
 * @param next - Candidate value supplied by an attribute callback or caller.
 * @param type - Property contract that may supply stable serialization.
 * @returns Whether both values are already equivalent for attribute reflection.
   */
  private static isEquivalentValue(current: any, next: any, type: PropertyType<any>): boolean {
    if (current === next) return true;
    if (!type.serialize) return false;

    try {
      return type.serialize(current) === type.serialize(next);
    } catch {
      return false;
    }
  }

  /**
   * Establishes reactive property bindings on an element instance by installing getter/setter pairs
   * that maintain bidirectional synchronization between JavaScript properties and DOM attributes.
   *
   * This method implements a three-tier value precedence system during initialization:
   * 1. DOM attribute value (highest priority) - reflects user-supplied HTML attributes
   * 2. JavaScript-initialized value (medium priority) - captures constructor assignments or field initializers
   * 3. Decorator default value (lowest priority) - fallback specified in @Property metadata
   *
   * For each property registered via @Property decorator, the method:
   * - Retrieves property metadata including name mappings, type information, and defaults
   * - Resolves the initial value using the precedence hierarchy described above
   * - Creates an underscore-prefixed backing field (e.g., `_duration`) to store the actual value
   * - Installs a reactive accessor pair on the public property name that:
   *   * Getter: Returns the current value from the backing field
   *   * Setter: Updates the backing field, reflects the new value to the corresponding DOM attribute,
   *     and invokes all registered watchers for the property
   * - Handles cleanup of conflicting property descriptors to ensure clean installation
   * - Reflects computed initial values back to DOM attributes when appropriate
   *
   * The reactive setter performs change detection and only triggers side effects (attribute updates
   * and watcher invocations) when the new value differs from the current backing field value.
   * Attribute synchronization uses HTMLElement.prototype.setAttribute to bypass observed attribute
   * callbacks during internal initialization, preventing infinite loops.
   *
   * After all properties are bound, the element's `reactive` flag is set to true, indicating that
   * the reactive system is active and property changes will propagate through the system.
   *
   * @static
   * @param {any} element - The element instance to bind reactive properties to. Typically extends BaseElement.
   *                        Must have property metadata registered via @Property decorators.
   *
   * @example
   * ```typescript
   * @Property({name: 'duration', type: Number, default: 1000})
   * duration!: number;
   *
   * @Property({name: 'enabled', type: Boolean})
   * enabled!: boolean;
   *
   * class Timer extends BaseElement {
   *   constructor() {
   *     super();
   *     this.duration = 5000; // JS initialization
   *   }
   * }
   *
   * // In element lifecycle (e.g., connectedCallback):
   * PropertyUtils.bindReactive(this);
   *
   * // Now properties are reactive:
   * this.duration = 3000; // Updates attribute and triggers watchers
   * console.log(this.getAttribute('duration')); // "3000"
   * ```
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
          if (!PropertyUtils.isEquivalentValue(element[backingKey], v, meta.type)) {
            element[backingKey] = v;
            element.setAttribute(attrName, PropertyUtils.serializeAttributeValue(v, meta.type));
            PropertyUtils.bindWatchers(element, publicKey);
          }
        },

        enumerable: true,
        configurable: true
      });

      // Reflect initial value to attribute ONLY if attribute wasn't already the source of truth.
      // Use HTMLElement.prototype.setAttribute directly so the observed-attribute callback is
      // NOT triggered — this is an internal setup step, not a user-driven change.
      if (!hasAttr && initial !== undefined) {
        HTMLElement.prototype.setAttribute.call(
          element,
          attrName,
          PropertyUtils.serializeAttributeValue(initial, meta.type),
        );
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
