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
import {utf8ByteOffsetToSourceOffset} from "./SourceOffsetUtils.ts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds the selected property identifier inside its AST-bounded source region.
 * Restricting the search to the property span avoids matching decorator arguments
 * or another property with the same name elsewhere in the file.
 * @param sourceText Original source file contents.
 * @param propertyName Static property name extracted from the AST node.
 * @param startOffset Start of the property span in source-string coordinates.
 * @param endOffset End of the property span in source-string coordinates.
 * @returns The identifier offset, or `null` when no declaration match is found.
 */
function findPropertyDeclarationOffset(
  sourceText: string,
  propertyName: string,
  startOffset: number,
  endOffset: number,
): number | null {
  const escapedName = escapeRegExp(propertyName);
  const declarationPattern = new RegExp(
    String.raw`(?:#?${escapedName}|["']${escapedName}["'])(?=\s*[!:?=;])`,
    "g",
  );
  const propertySource = sourceText.slice(startOffset, endOffset);
  let match: RegExpExecArray | null;
  let declarationOffset: number | null = null;

  while ((match = declarationPattern.exec(propertySource)) != null) {
    declarationOffset = startOffset + match.index;
  }

  return declarationOffset;
}

/**
 * Behavior-focused wrapper around a single class property node.
 *
 * The view supports both public class properties and private properties,
 * exposing the common operations used by higher-level consumers.
 */
export class PropertyView {
  /**
   * Creates a view that retains the original AST node for metadata inspection.
   * @param property Public or private class property represented by the view.
   */
  constructor(private readonly property: ClassProperty | PrivateProperty) {}

  /**
   * Wraps one SWC class-property node so property metadata can be queried consistently.
   * @param property Public or private class property represented by the view.
   * @returns A view backed by the supplied AST node.
   */
  static from(property: ClassProperty | PrivateProperty): PropertyView {
    return new PropertyView(property);
  }

  /**
   * Collects public and private fields while preserving their declaration order.
   * Wrapping the nodes keeps name, decorator, initializer, and type access consistent.
   * @param classDeclaration Class declaration whose direct members should be inspected.
   * @returns Views for every direct class or private property in the declaration.
   */
  static extractProperties(classDeclaration: ClassDeclaration): PropertyView[] {
    return classDeclaration.body
      .filter((member: ClassMember): member is ClassProperty | PrivateProperty =>
        member.type === "ClassProperty" || member.type === "PrivateProperty",
      )
      .map(property => new PropertyView(property));
  }

  /**
   * Resolves the property type from its initializer before consulting its annotation.
   * Initializer inference reflects the runtime value; annotations provide the fallback.
   * @returns A simplified type name, or `null` when neither source provides one.
   */
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

  /**
   * Checks whether the property has a decorator with the requested resolved name.
   * @param name Decorator name to find, such as `Property` or `Emitter`.
   * @returns `true` when at least one matching decorator is present.
   */
  hasDecorator(name: string): boolean {
    return this.getDecorator(name) !== null;
  }

  /**
   * Finds the first decorator whose resolved name matches the requested name.
   * @param name Decorator name to find.
   * @returns The matching decorator node, or `null` when the property has none.
   */
  getDecorator(name: string): Decorator | null {
    const decorators = this.property.decorators ?? [];
    return decorators.find(decorator => DecoratorUtils.decoratorName(decorator) === name) ?? null;
  }

  /**
   * Exposes the initializer used to infer a runtime property type or default presence.
   * @returns The initializer expression, or `null` for an uninitialized property.
   */
  defaultValue(): Expression | null {
    return this.property.value ?? null;
  }

  /**
   * Resolves the property identifier location for editor and generated-metadata navigation.
   * Normalizes SWC's process-global span against the module start when that context is given.
   * Converts SWC's UTF-8 byte position into the source text's character offset for web-types.
   * Source-text matching remains a recovery path for callers that only have the file contents.
   * @param sourceText Optional original file contents used to validate or recover the offset.
   * @param sourceStart Optional SWC module span start used for process-global normalization.
   * @param sourceStartOffset Local source index represented by `sourceStart`; defaults to zero.
   * @returns The property declaration offset, or `null` when no location is available.
   */
  getSourceOffset(sourceText?: string, sourceStart?: number, sourceStartOffset = 0): number | null {
    const span = this.property.span;
    if (span && typeof span.start === "number") {
      if (typeof sourceStart === "number") {
        const relativeByteOffset = span.start - sourceStart;
        if (sourceText != null) {
          const sourceOffset = utf8ByteOffsetToSourceOffset(
            sourceText,
            sourceStartOffset,
            relativeByteOffset,
          );
          if (sourceOffset != null && sourceOffset < sourceText.length) {
            const sourceEndOffset = typeof span.end === "number"
              ? utf8ByteOffsetToSourceOffset(
                sourceText,
                sourceStartOffset,
                span.end - sourceStart,
              )
              : null;
            const declarationOffset = findPropertyDeclarationOffset(
              sourceText,
              this.propertyName() ?? "",
              sourceOffset,
              sourceEndOffset ?? sourceText.length,
            );
            return declarationOffset ?? sourceOffset;
          }
        } else if (relativeByteOffset >= 0) {
          return sourceStartOffset + relativeByteOffset;
        }
      } else if (sourceText == null || span.start <= sourceText.length) {
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

    return sourceText == null && span && typeof span.start === "number" ? span.start : null;
  }

  /**
   * Determines whether consumers must provide a value for the property.
   * An explicit `required` option on `@Property` takes precedence over initializer presence;
   * otherwise, an uninitialized property is treated as required.
   * @returns `true` when the property is required by its metadata or declaration shape.
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
   * Resolves names for identifier-like, literal, and private property keys.
   * Computed keys are intentionally excluded because their names cannot be represented
   * reliably without evaluating the source expression.
   * @returns The static property name, or `null` for an unsupported computed key.
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
