import {Argument, Decorator} from "@swc/core";

/**
 * Behavior-focused wrapper around a single decorator node.
 *
 * The view treats plain identifier decorators and simple call decorators as
 * first-class cases and returns `null` for unsupported decorator expressions.
 */
export class DecoratorView {
  constructor(private readonly decorator: Decorator) {}

  /** Creates a view for the given decorator node. */
  static from(decorator: Decorator): DecoratorView {
    return new DecoratorView(decorator);
  }

  /** Returns `true` when the decorator is a call expression with an identifier callee. */
  isCallee(): boolean {
    return this.decorator.expression.type === "CallExpression" && this.decorator.expression.callee.type === "Identifier";
  }

  /** Returns `true` when the decorator call has at least one argument. */
  hasArguments(): boolean {
    return this.decorator.expression.type === "CallExpression" && this.decorator.expression.arguments.length > 0;
  }

  /** Returns the decorator call arguments or an empty array for non-call decorators. */
  getArguments(): Argument[] {
    if (this.decorator.expression.type !== "CallExpression") {
      return [];
    }

    return this.decorator.expression.arguments;
  }

  /**
   * Returns one decorator call argument by index when the decorator is callable.
   * The helper keeps argument-position logic centralized so callers do not need
   * to inspect the raw SWC shape before reading a value.
   * @param index - Zero-based call-argument position to resolve.
   * @returns The requested argument, or `null` when the decorator is not a call
   *   expression or the index is out of range.
   */
  getArgument(index: number): Argument | null {
    return this.getArguments()[index] ?? null;
  }

  /**
   * Reads a string-literal argument from a callable decorator without leaking
   * SWC traversal logic into callers.
   * @param index - Zero-based call-argument position to inspect. Defaults to the
   *   first argument because that is the common decorator pattern.
   * @returns The argument text when the indexed argument is a string literal,
   *   otherwise `null`.
   */
  getStringArgument(index: number = 0): string | null {
    const argument = this.getArgument(index);
    if (argument == null) return null;

    if (argument.expression.type !== "StringLiteral") {
      return null;
    }

    return argument.expression.value;
  }

  /**
   * Returns the decorator name for identifier decorators and simple call decorators.
   *
   * Returns `null` when the decorator expression is not a supported name-bearing
   * form, such as a member expression.
   */
  getName(): string | null {
    const expression = this.decorator.expression;

    if (expression.type === "Identifier") {
      return expression.value;
    }

    if (expression.type === "CallExpression" && expression.callee.type === "Identifier") {
      return expression.callee.value;
    }

    return null;
  }
}
