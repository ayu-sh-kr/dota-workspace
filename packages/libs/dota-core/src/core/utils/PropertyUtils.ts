import {HelperUtils, Sanitizer} from "@dota/core";
import type {BaseElement, PropertyDetails, PropertyType, WatcherOptionMeta} from "@dota/core";

/** Carries the quietly resolved property value and whether markup supplied it. */
type InitialPropertyValue = {
  /** True when the component host owns the configured attribute, including an empty one. */
  hasAttribute: boolean;
  /** Typed value selected by attribute, JavaScript field, decorator default, then undefined. */
  value: any;
};

export class PropertyUtils {
  private static readonly reflectingAttributes = new WeakMap<BaseElement, Set<string>>();

  /**
   * Converts a reactive property value to the string required by the DOM attribute API.
   * Object-like property types provide JSON serialization so field initializers and JavaScript
   * assignments do not degrade to `"[object Object]"` before attribute observers read them.
   * @param value Current public property value selected during binding or assignment.
   * @param type Property contract that may define its own attribute serialization.
   * @returns The string representation stored in the matching HTML attribute.
   */
  private static serializeAttributeValue(value: any, type: PropertyType<any>): string {
    return type.serialize ? type.serialize(value) : String(value);
  }

  /**
   * Compares values using their reflected form when a property type has custom serialization.
   * This prevents an attribute callback's parsed object from replacing an equivalent object and
   * re-entering the reactive setter after a JavaScript assignment.
   * @param current Value currently stored in the reactive backing field.
   * @param next Candidate value supplied by an attribute callback or caller.
   * @param type Property contract that may supply stable serialization.
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
   * Reflects a property value while identifying the resulting custom-element callback
   * as framework-owned. The marker is scoped to the element and removed even when the
   * browser attribute operation throws, preventing stale reflection state.
   * @param element Component whose public property is being reflected.
   * @param name Observed attribute associated with the property.
   * @param value Serialized value written to the DOM attribute.
   */
  static reflectAttribute(element: BaseElement, name: string, value: string): void {
    let reflecting = this.reflectingAttributes.get(element);
    if (!reflecting) {
      reflecting = new Set<string>();
      this.reflectingAttributes.set(element, reflecting);
    }

    reflecting.add(name);
    try {
      HTMLElement.prototype.setAttribute.call(element, name, value);
    } finally {
      reflecting.delete(name);
    }
  }

  /**
   * Identifies callbacks caused by framework property reflection so BaseElement can
   * skip parsing and setter re-entry while still recording its lifecycle event.
   * @param element Component receiving the observed-attribute callback.
   * @param name Attribute reported by the browser.
   * @returns Whether the callback is inside a matching reflection operation.
   */
  static isReflectingAttribute(element: BaseElement, name: string): boolean {
    return this.reflectingAttributes.get(element)?.has(name) ?? false;
  }

  /**
   * Applies an external attribute value to the storage active for the element lifecycle.
   * Before reactive accessors exist it preserves the public class field used by render;
   * afterward it writes the backing field to avoid setter reflection and re-entry.
   * @param element Component whose observed attribute changed.
   * @param name Attribute name used to resolve property metadata.
   * @param value Serialized value supplied by the browser callback.
   * @returns Changed public property name, or undefined when no semantic value changed.
   */
  static bindAttribute(element: BaseElement, name: string, value: string): string | undefined {
    const property = HelperUtils.fetchOrCreate<PropertyDetails>(element, 'Property').get(name);
    if (!property) return;

    const nextValue = Sanitizer.sanitize(value, property.type);
    if (!element.reactive) {
      if (PropertyUtils.isEquivalentValue(element[property.prototype], nextValue, property.type)) return;
      element[property.prototype] = nextValue;
      return property.prototype;
    }

    const backingKey = `_${property.prototype}`;
    if (this.isEquivalentValue(element[backingKey], nextValue, property.type)) return;

    element[backingKey] = nextValue;
    return property.prototype;
  }

  /**
   * Resolves attribute and field values before the component's first render.
   * The operation deliberately avoids accessors, reflection, watchers, and scheduling;
   * `bindReactive` later installs the existing runtime behavior over the seeded value.
   * @param element Component about to perform its initial mount or hydration attempt.
   */
  static seedInitialValues(element: BaseElement): void {
    const properties = HelperUtils.fetchOrCreate<PropertyDetails>(element, 'Property');
    properties.forEach((meta) => {
      const resolved = this.resolveInitialValue(element, meta).value;
      if (resolved === undefined || this.isEquivalentValue(element[meta.prototype], resolved, meta.type)) return;
      element[meta.prototype] = resolved;
    });
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
   *     schedules one DOM update, and invokes all registered watchers for the property
   * - Handles cleanup of conflicting property descriptors to ensure clean installation
   * - Reflects computed initial values back to DOM attributes when appropriate
   *
   * The reactive setter performs change detection and only triggers side effects (attribute updates
   * and watcher invocations) when the new value differs from the current backing field value.
   * Attribute synchronization marks framework-owned callbacks so BaseElement can skip
   * parsing and setter re-entry during initialization and runtime reflection.
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

      const ownDesc = Object.getOwnPropertyDescriptor(element, publicKey);
      const hasOwnDataProp =
        !!ownDesc &&
        ("value" in ownDesc) &&
        typeof ownDesc.get !== "function" &&
        typeof ownDesc.set !== "function";

      const resolvedInitial = this.resolveInitialValue(element, meta);

      // Remove conflicting own data property so defineProperty installs cleanly.
      if (hasOwnDataProp) {
        delete element[publicKey];
      }

      const initial = resolvedInitial.value;

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
            PropertyUtils.reflectAttribute(
              element,
              attrName,
              PropertyUtils.serializeAttributeValue(v, meta.type),
            );
            element.requestHTMLUpdate();
            PropertyUtils.bindWatchers(element, publicKey);
          }
        },

        enumerable: true,
        configurable: true
      });

      // Reflect only when the attribute was not the source of truth. The framework marker
      // lets BaseElement ignore the observed callback during initial state seeding.
      if (!resolvedInitial.hasAttribute && initial != null) {
        PropertyUtils.reflectAttribute(
          element,
          attrName,
          PropertyUtils.serializeAttributeValue(initial, meta.type),
        );
      }
    });

    element.reactive = true;
  }

  /**
   * Applies the established attribute > JavaScript > default precedence in one place.
   * Values not sourced from markup pass through their normal serialization contract so
   * seeding and later reactive binding agree on the exact typed initial representation.
   * @param element Component whose pre-reactive values are being inspected.
   * @param meta Decorator metadata defining the public field and attribute codec.
   * @returns Quiet initial value plus the source flag needed by reflection policy.
   */
  private static resolveInitialValue(element: BaseElement, meta: PropertyDetails): InitialPropertyValue {
    const hasAttribute = element.hasAttribute(meta.name);
    const rawAttribute = hasAttribute ? element.getAttribute(meta.name) : null;
    const attributeValue = rawAttribute === null ? undefined : Sanitizer.sanitize(rawAttribute, meta.type);
    const backingValue = element[`_${meta.prototype}`];
    const fieldValue = backingValue !== undefined ? backingValue : element[meta.prototype];
    const resolved = attributeValue !== undefined
      ? attributeValue
      : fieldValue !== undefined
        ? fieldValue
        : meta.default;
    if (hasAttribute || resolved == null) return {hasAttribute, value: resolved};

    const normalized = Sanitizer.sanitize(this.serializeAttributeValue(resolved, meta.type), meta.type);
    return {
      hasAttribute,
      value: this.isEquivalentValue(resolved, normalized, meta.type) ? resolved : normalized
    };
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
