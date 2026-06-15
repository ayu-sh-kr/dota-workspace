import type {ClassDeclaration, Decorator} from "@swc/core";

/**
 * Static utilities for inspecting and querying decorators on a single ClassDeclaration.
 * Operates at the individual-class level — use ClassDeclarationQuery.getDecorators() when
 * working across a collection of classes.
 */
export class DecoratorUtils {
  /**
   * Resolves the display name of a decorator from its expression.
   * Handles `@foo` (Identifier) and `@foo(...)` (CallExpression) forms.
   * Returns `undefined` for complex expressions such as member access.
   */
  static decoratorName(decorator: Decorator): string | undefined {
    const expr = decorator.expression;
    if (expr.type === "Identifier") return expr.value;
    if (expr.type === "CallExpression" && expr.callee.type === "Identifier") return expr.callee.value;
    return undefined;
  }

  /**
   * Returns all decorators attached to `classDecl`, or an empty array when none are present.
   */
  static extractDecorators(classDecl: ClassDeclaration): Decorator[] {
    return classDecl.decorators ?? [];
  }
}
