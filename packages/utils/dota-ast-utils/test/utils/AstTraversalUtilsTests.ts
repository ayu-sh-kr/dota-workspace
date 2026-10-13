import { describe, expect, it } from 'vitest';
import { parseSync, type CallExpression, type Module } from '@swc/core';
import { AstTraversalUtils } from '../../src/utils/AstTraversalUtils.ts';

describe('AstTraversalUtils', () => {
  it('finds nested nodes in source traversal order', () => {
    const ast = parseSync(`
      publisher.publish({ name: 'first' });
      function publishLater() {
        publisher.publish({ name: 'second' });
      }
    `, { syntax: 'typescript' }) as Module;

    const calls = AstTraversalUtils.findNodes<CallExpression>(ast, 'CallExpression');

    expect(calls).toHaveLength(2);
    expect(calls.map(call => call.callee.type === 'MemberExpression' ? call.callee.property.type === 'Identifier' ? call.callee.property.value : null : null)).toEqual([
      'publish',
      'publish',
    ]);
  });

  it('handles primitive roots, arrays, and a matching root node defensively', () => {
    const matchingRoot = { type: 'Marker', nested: [{ type: 'Marker' }] };

    expect(AstTraversalUtils.findNodes(matchingRoot, 'Marker')).toEqual([
      matchingRoot,
      matchingRoot.nested[0],
    ]);
    expect(AstTraversalUtils.findNodes(null, 'Marker')).toEqual([]);
    expect(AstTraversalUtils.findNodes(['text', 0, false], 'Marker')).toEqual([]);
  });

  it('groups several node types in one traversal, matching per-type discovery', () => {
    const ast = parseSync(`
      const first = (value: string) => publisher.publish({ name: value });
      class Holder { field = 1; method(input: number) { return emit(input); } }
    `, { syntax: 'typescript' }) as Module;
    const types = ['CallExpression', 'Parameter', 'ClassProperty', 'VariableDeclarator'] as const;

    const grouped = AstTraversalUtils.findNodesByType(ast, types);

    for (const type of types) {
      expect(grouped.get(type)).toEqual(AstTraversalUtils.findNodes(ast, type));
    }
  });

  it('returns an empty list for every requested type that is absent', () => {
    const grouped = AstTraversalUtils.findNodesByType({ type: 'Marker' }, ['Marker', 'Missing']);

    expect(grouped.get('Marker')).toEqual([{ type: 'Marker' }]);
    expect(grouped.get('Missing')).toEqual([]);
  });
});
