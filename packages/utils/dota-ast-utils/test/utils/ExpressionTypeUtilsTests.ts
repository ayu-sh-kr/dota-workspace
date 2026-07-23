import { describe, expect, it, vi } from 'vitest';
import { parseSync, type Expression, type Module, type VariableDeclarator } from '@swc/core';
import { AstTraversalUtils } from '../../src/utils/AstTraversalUtils.ts';
import { ExpressionTypeUtils, type ExpressionTypeInfo } from '../../src/utils/ExpressionTypeUtils.ts';

function expressionFrom(source: string): { ast: Module; expression: Expression } {
  const ast = parseSync(source, { syntax: 'typescript' }) as Module;
  const expression = AstTraversalUtils.findNodes<Expression>(ast, 'ObjectExpression')[0];
  if (expression == null) throw new Error('Expected an object expression.');
  return { ast, expression };
}

function initializerFrom(source: string): { ast: Module; initializer: Expression } {
  const ast = parseSync(source, { syntax: 'typescript' }) as Module;
  const declarator = AstTraversalUtils.findNodes<VariableDeclarator>(ast, 'VariableDeclarator')[0];
  const initializer = declarator?.init;

  if (initializer == null) {
    throw new Error('Expected a variable initializer.');
  }

  return { ast, initializer };
}

describe('ExpressionTypeUtils', () => {
  it('builds structural types, including resolved shorthand references and partial unknown fields', () => {
    const source = `const payload = { name: 'dota', enabled: true, count: 3, item, missing };`;
    const { ast, expression } = expressionFrom(source);
    const itemType: ExpressionTypeInfo = {
      text: 'ImportedItem',
      isComplete: true,
      referencedNames: ['ImportedItem'],
    };

    expect(ExpressionTypeUtils.resolve(expression, {
      sourceText: source,
      moduleStart: ast.span.start,
      resolveReference: reference => reference.type === 'Identifier' && reference.value === 'item' ? itemType : null,
    })).toEqual({
      text: '{ name: string; enabled: boolean; count: number; item: ImportedItem; missing: unknown }',
      isComplete: false,
      referencedNames: ['ImportedItem'],
    });
  });

  it('preserves explicit casts and produces union array element types', () => {
    const source = `const payload = ['first' as ThemeName, 2];`;
    const ast = parseSync(source, { syntax: 'typescript' }) as Module;
    const expression = AstTraversalUtils.findNodes<Expression>(ast, 'ArrayExpression')[0];
    if (expression == null) throw new Error('Expected an array expression.');

    expect(ExpressionTypeUtils.resolve(expression, { sourceText: source, moduleStart: ast.span.start })).toEqual({
      text: '(ThemeName | number)[]',
      isComplete: true,
      referencedNames: ['ThemeName'],
    });
  });

  it('resolves primitive, template, bigint, null, and unsupported expressions', () => {
    const expressions = [
      ['"value"', 'string', true],
      ['`value`', 'string', true],
      ['true', 'boolean', true],
      ['42', 'number', true],
      ['42n', 'bigint', true],
      ['null', 'null', true],
      ['undefined', 'unknown', false],
    ] as const;

    for (const [expressionSource, text, isComplete] of expressions) {
      const source = `const payload = ${expressionSource};`;
      const { ast, initializer } = initializerFrom(source);

      expect(ExpressionTypeUtils.resolve(initializer, {
        sourceText: source,
        moduleStart: ast.span.start,
      })).toEqual({ text, isComplete, referencedNames: [] });
    }
  });

  it('resolves nested arrays and object keys while preserving incomplete members', () => {
    const source = `const payload = {
      valid: ['one', 2],
      'not-valid': item,
      shorthand,
      [computed]: true,
      ...spread,
    };`;
    const ast = parseSync(source, { syntax: 'typescript' }) as Module;
    const expression = AstTraversalUtils.findNodes<Expression>(ast, 'ObjectExpression')[0];
    const resolveReference = vi.fn((reference: Expression) => reference.type === 'Identifier' && reference.value === 'item'
      ? { text: 'Item', isComplete: true, referencedNames: ['Item'] }
      : null);

    if (expression == null) {
      throw new Error('Expected an object expression.');
    }

    expect(ExpressionTypeUtils.resolve(expression, {
      sourceText: source,
      moduleStart: ast.span.start,
      resolveReference,
    })).toEqual({
      text: '{ valid: (string | number)[]; "not-valid": Item; shorthand: unknown; unknown; unknown }',
      isComplete: false,
      referencedNames: ['Item'],
    });
    expect(resolveReference).toHaveBeenCalledTimes(2);
    expect(resolveReference).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'Identifier', value: 'item' }));
    expect(resolveReference).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'Identifier', value: 'shorthand' }));
  });

  it('delegates identifier and member references, and unwraps TypeScript expressions', () => {
    const source = `const payload = {
      identifier,
      member: model.value,
      parenthesized: (1),
      asserted: value as ThemeName,
      satisfied: value satisfies Payload,
      constant: ['a'] as const,
    };`;
    const ast = parseSync(source, { syntax: 'typescript' }) as Module;
    const expression = AstTraversalUtils.findNodes<Expression>(ast, 'ObjectExpression')[0];
    const resolveReference = vi.fn((reference: Expression) => ({
      text: reference.type === 'MemberExpression' ? 'ModelValue' : 'IdentifierValue',
      isComplete: true,
      referencedNames: reference.type === 'MemberExpression' ? ['ModelValue'] : ['IdentifierValue'],
    }));

    if (expression == null) {
      throw new Error('Expected an object expression.');
    }

    expect(ExpressionTypeUtils.resolve(expression, {
      sourceText: source,
      moduleStart: ast.span.start,
      resolveReference,
    })).toEqual({
      text: '{ identifier: IdentifierValue; member: ModelValue; parenthesized: number; asserted: ThemeName; satisfied: Payload; constant: (string)[] }',
      isComplete: true,
      referencedNames: ['IdentifierValue', 'ModelValue', 'Payload', 'ThemeName'],
    });
    expect(resolveReference).toHaveBeenCalledTimes(2);
    expect(resolveReference).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'Identifier', value: 'identifier' }));
    expect(resolveReference).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'MemberExpression' }));
  });

  it('uses unknown for empty arrays and de-duplicates referenced names', () => {
    const source = `const payload = [first as Item, second as Item];`;
    const ast = parseSync(source, { syntax: 'typescript' }) as Module;
    const expression = AstTraversalUtils.findNodes<Expression>(ast, 'ArrayExpression')[0];

    if (expression == null) {
      throw new Error('Expected an array expression.');
    }

    expect(ExpressionTypeUtils.resolve(expression, {
      sourceText: source,
      moduleStart: ast.span.start,
    })).toEqual({
      text: '(Item)[]',
      isComplete: true,
      referencedNames: ['Item'],
    });

    const emptySource = 'const payload = [];';
    const emptyAst = parseSync(emptySource, { syntax: 'typescript' }) as Module;
    const emptyExpression = AstTraversalUtils.findNodes<Expression>(emptyAst, 'ArrayExpression')[0];

    if (emptyExpression == null) {
      throw new Error('Expected an empty array expression.');
    }

    expect(ExpressionTypeUtils.resolve(emptyExpression, {
      sourceText: emptySource,
      moduleStart: emptyAst.span.start,
    })).toEqual({ text: 'unknown[]', isComplete: true, referencedNames: [] });
  });
});
