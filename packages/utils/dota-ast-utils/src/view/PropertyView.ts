import type {
  ClassDeclaration,
  ClassMember,
  ClassProperty,
  Decorator,
  Expression,
  PrivateName,
  PrivateProperty,
  PropertyName,
} from "@swc/core";
import {ObjectExpressionView} from "./ObjectExpressionView.ts";
import {KeyValuePropertyView} from "./KeyValuePropertyView.ts";
import {DecoratorUtils} from "../utils/DecoratorUtils.ts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

  /** Returns a simplified property type inferred from the initializer or type annotation. */
  getType(): string | null {
    const value = this.defaultValue();

    if (value) {
      const inferredType = this.getTypeFromExpression(value);
      if (inferredType) {
        return inferredType;
      }
    }

    return this.getTypeFromTypeAnnotation();
  }

  private getTypeFromExpression(value: Expression): string | null {
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

  private getTypeFromTypeAnnotation(): string | null {
    const typeAnnotation = this.property.typeAnnotation?.typeAnnotation;
    if (!typeAnnotation) {
      return null;
    }

    switch (typeAnnotation.type) {
      case "TsKeywordType":
        return typeAnnotation.kind;
      case "TsArrayType":
        return "array";
      case "TsTypeReference":
        if (typeAnnotation.typeName.type === "Identifier") {
          const typeName = typeAnnotation.typeName.value;

          switch (typeName) {
            case "String":
            case "Boolean":
            case "Number":
            case "BigInt":
              return typeName.toLowerCase();
            case "Array":
              return "array";
            case "Object":
              return "object";
            default:
              return typeName;
          }
        }

        return "custom";
      case "TsLiteralType":
        switch (typeAnnotation.literal.type) {
          case "StringLiteral":
            return "string";
          case "BooleanLiteral":
            return "boolean";
          case "NumericLiteral":
            return "number";
          default:
            return "custom";
        }
      default:
        return "custom";
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

  /** Returns the start offset for the property declaration when SWC provides one. */
  getSourceOffset(sourceText?: string): number | null {
    return this.determineSourceOffset(sourceText);
  }

  private determineSourceOffset(sourceText?: string): number | null {
    const span = this.property.span;
    if (span && typeof span.start === "number") {
      if (sourceText == null || span.start <= sourceText.length) {
        return span.start;
      }
    }

    if (sourceText != null) {
      const propertyName = this.propertyName();
      if (propertyName) {
        const propertyPattern = new RegExp(
          String.raw`(?:^|\n)\s*(?:@[^\n]*\n\s*)*${escapeRegExp(propertyName)}\s*[!:?=]`,
        );
        const match = sourceText.match(propertyPattern);
        if (match?.index != null) {
          return match.index;
        }
      }
    }

    return span && typeof span.start === "number" ? span.start : null;
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

    return KeyValuePropertyView.from(requiredProperty).getBoolean();
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
        return (key as PrivateName & { value?: string; id?: { value?: string } }).value
          ?? (key as PrivateName & { value?: string; id?: { value?: string } }).id?.value
          ?? null;
      default:
        return null;
    }
  }
}
