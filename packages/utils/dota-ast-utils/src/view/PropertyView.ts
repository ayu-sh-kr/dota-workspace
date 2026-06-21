import type {
  ClassProperty,
  ClassDeclaration,
  ClassMember,
  ArrayExpression,
  Decorator,
  Expression,
  ObjectExpression,
  PrivateName,
  PrivateProperty,
  PropertyName,
} from "@swc/core";
import {ObjectExpressionView} from "./ObjectExpressionView.ts";
import {KeyValuePropertyView} from "./KeyValuePropertyView.ts";
import {DecoratorUtils} from "../utils/DecoratorUtils.ts";

/**
 * Behavior-focused wrapper around a single class property node.
 *
 * The view supports both public class properties and private properties,
 * exposing the common operations used by higher-level consumers.
 */
export class PropertyView {
  constructor(private readonly property: ClassProperty | PrivateProperty) {}

  /** Creates a view for the given class property node. */
  static from(property: ClassProperty | PrivateProperty): PropertyView {
    return new PropertyView(property);
  }

  /**
   * Extracts all class properties and private properties from a class declaration.
   *
   * The result is wrapped in `PropertyView` instances, so callers can inspect
   * names, decorators, and default values with a uniform API.
   */
  static extractProperties(classDeclaration: ClassDeclaration): PropertyView[] {
    return classDeclaration.body
      .filter((member: ClassMember): member is ClassProperty | PrivateProperty =>
        member.type === "ClassProperty" || member.type === "PrivateProperty",
      )
      .map(property => new PropertyView(property));
  }

  /** Returns the underlying SWC node type. */
  getType(): string | null {
    const value = this.defaultValue();

    if (!value) {
      return null;
    }

    switch (value.type) {
      case "StringLiteral":
        return "string";
      case "BooleanLiteral":
        return "boolean";
      case "NumericLiteral":
        return "number";
      case "BigIntLiteral":
        return "bigint";
      case "ArrayExpression":
        return "array";
      case "ObjectExpression":
        return "object";
      case "NullLiteral":
        return "null";
      case "Identifier":
        return "identifier";
      default:
        return value.type;
    }
  }

  /** Returns `true` when the property has a decorator with the given name. */
  hasDecorator(name: string): boolean {
    return this.getDecorator(name) !== null;
  }

  /** Returns the first decorator with the given name, or `null` if not found. */
  getDecorator(name: string): Decorator | null {
    const decorators = this.property.decorators ?? [];
    return decorators.find(decorator => DecoratorUtils.decoratorName(decorator) === name) ?? null;
  }

  /** Returns the property's initializer expression, or `null` when not initialized. */
  defaultValue(): Expression | null {
    return this.property.value ?? null;
  }

  /**
   * Returns `true` when the property is required.
   *
   * A decorator argument of `@Property({ required: true|false })` wins when present.
   * Otherwise, properties without a default value are treated as required.
   */
  isRequired(): boolean {
    const propertyDecorator = this.getDecorator("Property");
    if (propertyDecorator) {
      const required = this.getRequiredFromDecorator(propertyDecorator);
      if (required !== null) {
        return required;
      }
    }

    return this.defaultValue() == null;
  }

  private getRequiredFromDecorator(decorator: Decorator): boolean | null {
    if (decorator.expression.type !== "CallExpression") {
      return null;
    }

    const firstArgument = decorator.expression.arguments[0];
    if (!firstArgument || firstArgument.expression.type !== "ObjectExpression") {
      return null;
    }

    const objectExpression = ObjectExpressionView.from(firstArgument.expression);
    const requiredProperty = objectExpression.getProperty("required");
    if (!requiredProperty) {
      return null;
    }

    const requiredValue = KeyValuePropertyView.from(requiredProperty).getBoolean();
    return requiredValue;
  }

  /**
   * Returns the property name for identifier-like keys.
   *
   * Supports public identifiers/string/numeric/bigint keys and private names.
   * Returns `null` for computed property names.
   */
  propertyName(): string | null {
    const key = this.property.key as PropertyName | PrivateName;

    switch (key.type) {
      case "Identifier":
      case "StringLiteral":
        return key.value;
      case "NumericLiteral":
      case "BigIntLiteral":
        return String(key.value);
      case "PrivateName":
        return key.id.value;
      default:
        return null;
    }
  }
}
