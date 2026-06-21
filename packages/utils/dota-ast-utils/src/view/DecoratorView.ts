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
