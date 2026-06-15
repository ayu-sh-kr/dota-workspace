import {ArrayExpression, KeyValueProperty, ObjectExpression} from "@swc/core";

/**
 * Behavior-focused wrapper around a single object literal property.
 *
 * The view exposes typed getters for value kinds that are commonly used in
 * configuration-style object literals and returns `null` when a getter does
 * not match the underlying SWC node.
 */
export class KeyValuePropertyView {

  constructor(private readonly keyValueProperty: KeyValueProperty) {}

  /** Creates a view for the given key-value property node. */
  static from(keyValueProperty: KeyValueProperty): KeyValuePropertyView {
    return new KeyValuePropertyView(keyValueProperty);
  }

  /** Returns the property name when the key is a simple identifier or string literal, otherwise `null`. */
  getKeyName(): string | null {
    switch (this.keyValueProperty.key.type) {
      case "Identifier":
      case "StringLiteral":
        return this.keyValueProperty.key.value;
      default:
        return null;
    }
  }

  /** Returns the property value as a number literal, otherwise `null`. */
  getNumeric(): number | null {
    switch (this.keyValueProperty.value.type) {
      case "NumericLiteral":
        return this.keyValueProperty.value.value;
      default:
        return null;
    }
  }

  /** Returns the property value as a string literal, otherwise `null`. */
  getString(): string | null {
    switch (this.keyValueProperty.value.type) {
      case "StringLiteral":
        return this.keyValueProperty.value.value;
      default:
        return null;
    }
  }

  /** Returns the property value as a boolean literal, otherwise `null`. */
  getBoolean(): boolean | null {
    switch (this.keyValueProperty.value.type) {
      case "BooleanLiteral":
        return this.keyValueProperty.value.value;
      default:
        return null;
    }
  }

  /** Returns the property value as a nested object expression, otherwise `null`. */
  getObject(): ObjectExpression | null {
    switch (this.keyValueProperty.value.type) {
      case "ObjectExpression":
        return this.keyValueProperty.value;
      default:
        return null;
    }
  }

  /** Returns the property value as an array expression, otherwise `null`. */
  getArray(): ArrayExpression | null {
    switch (this.keyValueProperty.value.type) {
      case "ArrayExpression":
        return this.keyValueProperty.value;
      default:
        return null;
    }
  }

  /** Returns `null` when the property value is a null literal. */
  getNull(): null {
    switch (this.keyValueProperty.value.type) {
      case "NullLiteral":
        return null;
      default:
        return null;
    }
  }

  /** Returns the referenced identifier name from the property value, otherwise `null`. */
  getIdentifier(): string | null {
    switch (this.keyValueProperty.value.type) {
      case "Identifier":
        return this.keyValueProperty.value.value;
      default:
        return null;
    }
  }
}
