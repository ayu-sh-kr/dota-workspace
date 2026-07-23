import type { Argument, CallExpression, Expression, ObjectExpression } from '@swc/core';

/**
 * Provides stable readers for call expressions without exposing SWC branching
 * to scanning plugins. It deliberately supports only statically named calls,
 * because computed callees cannot be classified without evaluating source.
 */
export class CallExpressionView {
  /** Creates a view for one SWC call-expression node. */
  static from(callExpression: CallExpression): CallExpressionView {
    return new CallExpressionView(callExpression);
  }

  /** @param callExpression - Call expression whose callee and arguments are inspected. */
  constructor(private readonly callExpression: CallExpression) {}

  /**
   * Reads the static callee name from identifier and member-expression calls.
   * Computed member access is intentionally excluded because its member name
   * cannot be known syntactically.
   * @returns The callee name, or `null` when the call has no static name.
   */
  getCalleeName(): string | null {
    const { callee } = this.callExpression;

    if (callee.type === 'Identifier') {
      return callee.value;
    }

    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
      return callee.property.value;
    }

    return null;
  }

  /** Returns every raw call argument, preserving its original source order. */
  getArguments(): Argument[] {
    return this.callExpression.arguments;
  }

  /**
   * Resolves one positional argument without requiring callers to inspect the
   * argument array directly.
   * @param index - Zero-based argument position to read.
   * @returns The argument, or `null` when the call does not provide it.
   */
  getArgument(index: number): Argument | null {
    return this.getArguments()[index] ?? null;
  }

  /**
   * Reads an object-literal argument used by configuration-style APIs.
   * @param index - Zero-based argument position to inspect.
   * @returns The object expression, or `null` when the argument has another shape.
   */
  getObjectArgument(index: number): ObjectExpression | null {
    const expression = this.getArgument(index)?.expression;
    return expression?.type === 'ObjectExpression' ? expression : null;
  }

  /**
   * Returns the receiver of a member call such as `publisher.publish(...)`.
   * @returns The receiver expression, or `null` for direct identifier calls.
   */
  getReceiver(): Expression | null {
    return this.callExpression.callee.type === 'MemberExpression'
      ? this.callExpression.callee.object
      : null;
  }
}
