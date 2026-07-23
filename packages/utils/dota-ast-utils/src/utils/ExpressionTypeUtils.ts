import type { CallExpression, Expression, KeyValueProperty, ObjectExpression } from '@swc/core';
import { KeyValuePropertyView } from '../view/KeyValuePropertyView.ts';
import { TypeAnnotationUtils } from './TypeAnnotationUtils.ts';

/** A syntactically recovered payload type and whether every nested value was resolved. */
export type ExpressionTypeInfo = {
  text: string;
  isComplete: boolean;
  referencedNames: string[];
};

/** Context supplied by a scanner when identifiers need same-file resolution. */
export type ExpressionTypeResolutionOptions = {
  /** Original module text used to preserve source-authored type annotations. */
  sourceText: string;
  /** SWC module span start used when converting annotation spans to source offsets. */
  moduleStart: number;
  /** Resolves identifier and member expressions whose lexical scope belongs to the caller. */
  resolveReference?: (expression: Expression) => ExpressionTypeInfo | null;
  /** Resolves statically named calls whose return annotation belongs to the caller. */
  resolveCall?: (expression: CallExpression) => ExpressionTypeInfo | null;
};

/**
 * Converts value expressions into declaration-safe TypeScript type text.
 * It resolves literals and object shapes directly, while delegating identifiers
 * and member access to the caller because lexical scope is domain-specific.
 */
export class ExpressionTypeUtils {
  /**
   * Resolves an expression without evaluating source or invoking a type checker.
   * @param expression - Payload expression whose syntactic type should be recovered.
   * @param options - Source and optional same-file reference resolver for the expression.
   * @returns The richest safe type text; incomplete resolutions contain `unknown`.
   */
  static resolve(expression: Expression, options: ExpressionTypeResolutionOptions): ExpressionTypeInfo {
    switch (expression.type) {
      case 'StringLiteral':
      case 'TemplateLiteral':
        return this.complete('string');
      case 'BooleanLiteral':
        return this.complete('boolean');
      case 'NumericLiteral':
        return this.complete('number');
      case 'BigIntLiteral':
        return this.complete('bigint');
      case 'NullLiteral':
        return this.complete('null');
      case 'ArrayExpression':
        return this.resolveArray(expression, options);
      case 'ObjectExpression':
        return this.resolveObject(expression, options);
      case 'TsAsExpression':
      case 'TsTypeAssertion':
      case 'TsSatisfiesExpression': {
        const annotation = TypeAnnotationUtils.read(expression.typeAnnotation, options.sourceText, options.moduleStart);
        return annotation == null
          ? this.unknown()
          : { text: annotation.text, isComplete: true, referencedNames: annotation.referencedNames };
      }
      case 'TsConstAssertion':
      case 'ParenthesisExpression':
        return this.resolve(expression.expression, options);
      case 'Identifier':
      case 'MemberExpression':
        return options.resolveReference?.(expression) ?? this.unknown();
      case 'CallExpression':
        return options.resolveCall?.(expression) ?? this.unknown();
      default:
        return this.unknown();
    }
  }

  /** Builds an array type while preserving the union of heterogeneous elements. */
  private static resolveArray(expression: Extract<Expression, { type: 'ArrayExpression' }>, options: ExpressionTypeResolutionOptions): ExpressionTypeInfo {
    const elements = expression.elements
      .map(element => element?.expression == null ? this.unknown() : this.resolve(element.expression, options));
    const elementTypes = [...new Set(elements.map(element => element.text))];
    const text = elementTypes.length === 0 ? 'unknown[]' : `(${elementTypes.join(' | ')})[]`;
    return this.merge(text, elements);
  }

  /** Builds a structural object type from statically named object-literal properties. */
  private static resolveObject(expression: ObjectExpression, options: ExpressionTypeResolutionOptions): ExpressionTypeInfo {
    const entries = expression.properties.map(property => this.resolveObjectProperty(property, options));
    const text = `{ ${entries.map(entry => entry.text).join('; ')} }`;
    return this.merge(text, entries);
  }

  /** Resolves one object member, retaining partial information for unsupported spreads. */
  private static resolveObjectProperty(property: ObjectExpression['properties'][number], options: ExpressionTypeResolutionOptions): ExpressionTypeInfo {
    if (property.type === 'KeyValueProperty') {
      return this.resolveKeyValueProperty(property, options);
    }

    if (property.type === 'Identifier') {
      const value = this.resolve(property, options);
      return { ...value, text: `${property.value}: ${value.text}` };
    }

    return this.unknown();
  }

  /** Resolves a key-value property only when its key is safe to reproduce in a type literal. */
  private static resolveKeyValueProperty(property: KeyValueProperty, options: ExpressionTypeResolutionOptions): ExpressionTypeInfo {
    const name = KeyValuePropertyView.from(property).getKeyName();
    if (name == null) return this.unknown();

    const value = this.resolve(property.value, options);
    return { ...value, text: `${this.formatPropertyName(name)}: ${value.text}` };
  }

  /** Quotes object keys that are not valid TypeScript identifiers. */
  private static formatPropertyName(name: string): string {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
  }

  /** Creates a fully known resolution with no imported type names. */
  private static complete(text: string): ExpressionTypeInfo {
    return { text, isComplete: true, referencedNames: [] };
  }

  /** Marks a value unknown instead of manufacturing a type from unsupported syntax. */
  private static unknown(): ExpressionTypeInfo {
    return { text: 'unknown', isComplete: false, referencedNames: [] };
  }

  /** Merges nested completeness and imported names into one composite type. */
  private static merge(text: string, entries: ExpressionTypeInfo[]): ExpressionTypeInfo {
    return {
      text,
      isComplete: entries.every(entry => entry.isComplete),
      referencedNames: [...new Set(entries.flatMap(entry => entry.referencedNames))].sort((left, right) => left.localeCompare(right)),
    };
  }
}
