import {FunctionDeclarationQuery} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {Decorator, FunctionDeclaration, Module, Param, TsTypeParameter} from "@swc/core";
import {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery";
import {DeclarationTerminalQueryImpl} from "./DeclarationTerminalQueryImpl";


export class FunctionDeclarationQueryImpl implements FunctionDeclarationQuery {
  readonly ast: Module;
  readonly selection: FunctionDeclaration[];

  constructor(ast: Module, selection: FunctionDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /**
   * Collects `Fn.params` from all functions in the selection and returns the flattened list.
   * `findByName` on the result is not applicable since `Param` wraps a `Pattern`;
   * use `filter()` with a pattern check instead.
   */
  getParams(): DeclarationTerminalQuery<Param> {
    const params = this.selection.flatMap(d => d.params);
    return new DeclarationTerminalQueryImpl(this.ast, params);
  }

  /**
   * Collects `HasDecorator.decorators` from all functions in the selection and returns the flattened list.
   * Skips functions with no decorators.
   * `findByName` is not applicable here; use `filter()` to match by decorator expression.
   */
  getDecorators(): DeclarationTerminalQuery<Decorator> {
    const decorators = this.selection.flatMap(d => d.decorators ?? []);
    return new DeclarationTerminalQueryImpl(this.ast, decorators);
  }

  /**
   * Collects `Fn.typeParameters.parameters` from all functions in the selection and returns the flattened list.
   * Skips functions with no `typeParameters`.
   * `findByName` on the result matches against the type parameter's `name.value`.
   * @example function foo<T, U>() {} → [TsTypeParameter { name: "T" }, TsTypeParameter { name: "U" }]
   */
  getTypeParameters(): DeclarationTerminalQuery<TsTypeParameter> {
    const params = this.selection.flatMap(d => d.typeParameters?.parameters ?? []);
    return new DeclarationTerminalQueryImpl(this.ast, params, p => p.name.value);
  }

  /** Returns the first function in the selection, or `null` if empty. */
  first(): FunctionDeclaration | null { return this.selection[0] ?? null; }

  /** Returns the last function in the selection, or `null` if empty. */
  last(): FunctionDeclaration | null { return this.selection[this.selection.length - 1] ?? null; }

  /** Returns the function at `index`, or `null` if out of bounds. */
  at(index: number): FunctionDeclaration | null { return this.selection[index] ?? null; }

  /** Returns a shallow copy of the selection array. */
  toArray(): FunctionDeclaration[] { return [...this.selection]; }

  /** Returns the number of functions in the selection. */
  count(): number { return this.selection.length; }

  /** Returns `true` if the selection contains no functions. */
  isEmpty(): boolean { return this.selection.length === 0; }

  /** Calls `callback` for each function in the selection. */
  forEach(callback: (item: FunctionDeclaration, index: number) => void): void { this.selection.forEach(callback); }

  /** Transforms each function in the selection with `callback` and returns the results. */
  map<R>(callback: (item: FunctionDeclaration, index: number) => R): R[] { return this.selection.map(callback); }

  /** Narrows the selection to functions whose `identifier.value` matches `name`. */
  findByName(name: string): FunctionDeclarationQuery {
    return new FunctionDeclarationQueryImpl(this.ast, this.selection.filter(d => d.identifier.value === name));
  }

  /** Narrows the selection to functions that satisfy `predicate`. */
  filter(predicate: (item: FunctionDeclaration) => boolean): FunctionDeclarationQuery {
    return new FunctionDeclarationQueryImpl(this.ast, this.selection.filter(predicate));
  }
}