import {KeyValueProperty, ObjectExpression} from "@swc/core";
import {KeyValuePropertyView} from "./KeyValuePropertyView.ts";

/**
 * Behavior-focused wrapper around an object expression.
 *
 * This view indexes only key-value properties whose keys are simple
 * identifiers or string literals, making property lookup predictable and fast.
 */
export class ObjectExpressionView {

  private readonly propertiesByKey: Map<string, KeyValueProperty> = new Map();

  constructor(private readonly objectExpression: ObjectExpression) {
    this.objectExpression.properties.forEach(property => {
      if (property.type === 'KeyValueProperty') {
        if (property.key.type === 'Identifier' || property.key.type === 'StringLiteral') {
          this.propertiesByKey.set(property.key.value, property);
        }
      }
    });
  }

  /** Creates a view for the given object expression. */
  static from(objectExpression: ObjectExpression): ObjectExpressionView {
    return new ObjectExpressionView(objectExpression);
  }

  /** Returns `true` when the object expression contains at least one property node. */
  hasProperties(): boolean {
    return this.objectExpression.properties.length > 0;
  }

  /** Returns the raw SWC property list exactly as stored on the object expression. */
  getProperties(): ObjectExpression['properties'] {
    return this.objectExpression.properties;
  }

  /**
   * Returns the names of indexable properties.
   *
   * Only `KeyValueProperty` entries with `Identifier` or `StringLiteral` keys
   * are included in the result.
   */
  getPropertiesNames(spread: boolean = false): string[] {
    return Array.from(this.propertiesByKey.keys());
  }

  /** Returns the indexed property with the given name, or `null` if missing. */
  getProperty(name: string): KeyValueProperty | null {
    return this.propertiesByKey.get(name) ?? null;
  }

  /**
   * Reads a string-literal property from the object expression without exposing
   * the underlying SWC property lookup to callers.
   * @param name - Property key to resolve.
   * @returns The property value when the named property exists and is a string
   *   literal, otherwise `null`.
   */
  getStringProperty(name: string): string | null {
    const property = this.getProperty(name);
    if (property == null) return null;

    return KeyValuePropertyView.from(property).getString();
  }

  toObject(): Record<string, any> {
    return ObjectExpressionView.toPlainObject(this.objectExpression);
  }

  /**
   * Recursively converts an SWC object expression into a plain JavaScript object.
   *
   * This keeps nested object and array structures intact while turning literal
   * nodes into their native JS values.
   */
  static toPlainObject(objectExpression: ObjectExpression): Record<string, any> {
    const convertExpression = (expression: any): any => {
      if (expression == null) {
        return null;
      }

      switch (expression.type) {
        case "StringLiteral":
        case "BooleanLiteral":
        case "NumericLiteral":
          return expression.value;
        case "BigIntLiteral":
          return expression.value;
        case "NullLiteral":
          return null;
        case "Identifier":
          return expression.value;
        case "ArrayExpression":
          return expression.elements.map((element: any) => {
            if (element == null) {
              return null;
            }

            if (element.expression == null) {
              return null;
            }

            return convertExpression(element.expression);
          });
        case "ObjectExpression":
          return ObjectExpressionView.toPlainObject(expression);
        case "ParenthesisExpression":
          return convertExpression(expression.expression);
        case "TsAsExpression":
          return convertExpression(expression.expression);
        case "TsNonNullExpression":
          return convertExpression(expression.expression);
        default:
          return expression;
      }
    };

    const result: Record<string, any> = {};
    objectExpression.properties.forEach(property => {
      if (property.type !== "KeyValueProperty") {
        return;
      }

      const key =
        property.key.type === "Identifier" || property.key.type === "StringLiteral" || property.key.type === "NumericLiteral" || property.key.type === "BigIntLiteral"
          ? String(property.key.value)
          : null;

      if (!key) {
        return;
      }

      result[key] = convertExpression(property.value);
    });

    return result;
  }

}
