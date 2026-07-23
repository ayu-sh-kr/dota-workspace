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
});
