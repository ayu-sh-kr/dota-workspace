import { describe, expect, it } from 'vitest';
import { parseSync, type ClassDeclaration, type FunctionDeclaration, type Module } from '@swc/core';
import { DeclarationUtils } from '../../src/utils/DeclarationUtils.ts';

function parseModule(source: string): Module {
  return parseSync(source, { syntax: 'typescript' }) as Module;
}

describe('DeclarationUtils', () => {
  it('creates a top-level query that keeps the supplied module', () => {
    const ast = parseModule('class Feature {}');

    const query = DeclarationUtils.queryOf(ast);

    expect(query.ast).toBe(ast);
    expect(query.getClassDeclarations().toArray()).toHaveLength(1);
  });

  it('extracts only module items with the requested discriminant', () => {
    const ast = parseModule(`
      import { value } from './value';
      class Feature {}
      function createFeature() {}
    `);

    const classes = DeclarationUtils.extractDeclarations<ClassDeclaration>(ast.body, 'ClassDeclaration');

    expect(classes).toHaveLength(1);
    expect(classes[0]?.identifier?.value).toBe('Feature');
    expect(DeclarationUtils.extractDeclarations(ast.body, 'VariableDeclaration')).toEqual([]);
  });

  it('finds the first named declaration and returns null for another type or name', () => {
    const ast = parseModule(`
      class First {}
      class Second {}
      function First() {}
    `);

    const classDeclaration = DeclarationUtils.findDeclarationByName<ClassDeclaration>(
      ast.body,
      'ClassDeclaration',
      'Second',
    );
    const functionDeclaration = DeclarationUtils.findDeclarationByName<FunctionDeclaration>(
      ast.body,
      'FunctionDeclaration',
      'First',
    );

    expect(classDeclaration?.identifier?.value).toBe('Second');
    expect(functionDeclaration?.identifier?.value).toBe('First');
    expect(DeclarationUtils.findDeclarationByName<ClassDeclaration>(ast.body, 'ClassDeclaration', 'Missing')).toBeNull();
    expect(DeclarationUtils.findDeclarationByName<ClassDeclaration>(ast.body, 'ClassDeclaration', 'First')).not.toBeNull();
  });

  it('returns the first matching item while preserving module order', () => {
    const ast = parseModule(`
      function first() {}
      function second() {}
    `);

    const declaration = DeclarationUtils.findFirstDeclaration<FunctionDeclaration>(
      ast.body,
      'FunctionDeclaration',
    );

    expect(declaration?.identifier?.value).toBe('first');
    expect(DeclarationUtils.findFirstDeclaration(ast.body, 'ClassDeclaration')).toBeNull();
  });
});
