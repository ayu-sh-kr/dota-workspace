import { describe, expect, it } from 'vitest';
import { parseSync, type ClassMethod, type Module } from '@swc/core';
import { AstTraversalUtils } from '../../src/utils/AstTraversalUtils.ts';
import { ClassMethodView } from '../../src/view/ClassMethodView.ts';

describe('ClassMethodView', () => {
  it('returns method decorators in declaration order', () => {
    const ast = parseSync(`class Feature { @First() @Second() handle() {} }`, {
      syntax: 'typescript',
      decorators: true,
    }) as Module;
    const method = AstTraversalUtils.findNodes<ClassMethod>(ast, 'ClassMethod')[0];
    if (method == null) throw new Error('Expected a class method.');

    expect(ClassMethodView.from(method).getDecorators().map(decorator => decorator.expression.type === 'CallExpression' && decorator.expression.callee.type === 'Identifier' ? decorator.expression.callee.value : null)).toEqual([
      'First',
      'Second',
    ]);
  });

  it('returns an empty decorator list for an undecorated method', () => {
    const ast = parseSync(`class Feature { handle() {} }`, { syntax: 'typescript' }) as Module;
    const method = AstTraversalUtils.findNodes<ClassMethod>(ast, 'ClassMethod')[0];
    if (method == null) throw new Error('Expected a class method.');

    expect(new ClassMethodView(method).getDecorators()).toEqual([]);
  });
});
