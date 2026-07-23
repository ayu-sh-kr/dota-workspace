import { describe, expect, it } from 'vitest';
import { parseSync, type ClassDeclaration, type Decorator, type Module } from '@swc/core';
import { DecoratorUtils } from '../../src/utils/DecoratorUtils.ts';

function classFrom(source: string): ClassDeclaration {
  const ast = parseSync(source, {
    syntax: 'typescript',
    decorators: true,
  }) as Module;
  const classDeclaration = ast.body.find(
    (item): item is ClassDeclaration => item.type === 'ClassDeclaration',
  );

  if (classDeclaration == null) {
    throw new Error('Expected a class declaration.');
  }

  return classDeclaration;
}

function decoratorsFrom(source: string): Decorator[] {
  return classFrom(source).decorators ?? [];
}

describe('DecoratorUtils', () => {
  it.each([
    ['@sealed class Feature {}', 'sealed'],
    ['@configured("sample") class Feature {}', 'configured'],
  ])('resolves the name from %s', (source, expectedName) => {
    const decorator = decoratorsFrom(source)[0];

    if (decorator == null) {
      throw new Error('Expected a decorator.');
    }

    expect(DecoratorUtils.decoratorName(decorator)).toBe(expectedName);
  });

  it('returns undefined for a decorator with a member-expression callee', () => {
    const decorator = decoratorsFrom('@library.config class Feature {}')[0];

    if (decorator == null) {
      throw new Error('Expected a decorator.');
    }

    expect(DecoratorUtils.decoratorName(decorator)).toBeUndefined();
  });

  it('returns decorators in declaration order and an empty list when absent', () => {
    const decorated = decoratorsFrom('@First @Second() class Feature {}');
    const undecoratedClass = classFrom('class Feature {}');

    expect(decorated.map(decorator => DecoratorUtils.decoratorName(decorator))).toEqual([
      'First',
      'Second',
    ]);
    expect(DecoratorUtils.extractDecorators(undecoratedClass)).toEqual([]);
  });
});
