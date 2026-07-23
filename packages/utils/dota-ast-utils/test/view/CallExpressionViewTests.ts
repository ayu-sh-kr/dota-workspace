import { describe, expect, it } from 'vitest';
import { parseSync, type CallExpression, type Module } from '@swc/core';
import { AstTraversalUtils } from '../../src/utils/AstTraversalUtils.ts';
import { CallExpressionView } from '../../src/view/CallExpressionView.ts';

function callFrom(source: string): CallExpression {
  const ast = parseSync(source, { syntax: 'typescript' }) as Module;
  const call = AstTraversalUtils.findNodes<CallExpression>(ast, 'CallExpression')[0];
  if (call == null) throw new Error('Expected a call expression.');
  return call;
}

describe('CallExpressionView', () => {
  it('reads the receiver, static callee, and positional object arguments', () => {
    const view = CallExpressionView.from(callFrom(`publisher.publish({ name: 'sample' }, true);`));

    expect(view.getCalleeName()).toBe('publish');
    expect(view.getArguments()).toHaveLength(2);
    expect(view.getArgument(0)?.expression.type).toBe('ObjectExpression');
    expect(view.getArgument(3)).toBeNull();
    expect(view.getObjectArgument(0)?.type).toBe('ObjectExpression');
    expect(view.getObjectArgument(1)).toBeNull();
    expect(view.getReceiver()?.type).toBe('Identifier');
  });

  it('returns no receiver for direct calls and no name for computed members', () => {
    const directView = new CallExpressionView(callFrom(`publish('sample');`));
    const computedView = CallExpressionView.from(callFrom(`publisher['publish']({ name: 'sample' });`));

    expect(directView.getCalleeName()).toBe('publish');
    expect(directView.getReceiver()).toBeNull();
    expect(computedView.getCalleeName()).toBeNull();
  });

  it('preserves an empty argument list and returns null for missing object arguments', () => {
    const view = CallExpressionView.from(callFrom('publish();'));

    expect(view.getArguments()).toEqual([]);
    expect(view.getArgument(-1)).toBeNull();
    expect(view.getObjectArgument(0)).toBeNull();
  });
});
