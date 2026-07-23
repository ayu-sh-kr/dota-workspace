import type { ClassMethod, Decorator } from '@swc/core';

/**
 * Exposes method-level metadata shared by decorator-driven source scanners.
 * Keeping decorator access here avoids every plugin reaching into SWC's nested
 * function shape and centralizes the distinction from class-level decorators.
 */
export class ClassMethodView {
  /** Creates a view for one class method. */
  static from(classMethod: ClassMethod): ClassMethodView {
    return new ClassMethodView(classMethod);
  }

  /** @param classMethod - Method whose function metadata should be inspected. */
  constructor(private readonly classMethod: ClassMethod) {}

  /** Returns method decorators in declaration order, or an empty list when absent. */
  getDecorators(): Decorator[] {
    return this.classMethod.function.decorators ?? [];
  }
}
