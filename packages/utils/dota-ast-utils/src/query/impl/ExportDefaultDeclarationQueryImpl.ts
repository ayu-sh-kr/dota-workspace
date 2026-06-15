import {ExportDefaultDeclarationQuery} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {
  ClassExpression,
  ExportDefaultDeclaration,
  FunctionExpression,
  Module,
  TsInterfaceDeclaration,
} from "@swc/core";
import type {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery.ts";
import {DeclarationTerminalQueryImpl} from "./DeclarationTerminalQueryImpl";


export class ExportDefaultDeclarationQueryImpl implements ExportDefaultDeclarationQuery {
  readonly ast: Module;
  readonly selection: ExportDefaultDeclaration[];

  constructor(ast: Module, selection: ExportDefaultDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /**
   * Narrows the selection to declarations whose `decl.identifier.value` matches `name`.
   * Only applicable when `decl` is a `ClassExpression` or `FunctionExpression` with an identifier.
   * @example findByName('Foo') → matches `export default class Foo {}`
   */
  findByName(name: string): ExportDefaultDeclarationQuery {
    return new ExportDefaultDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => {
        const decl = d.decl;
        if (decl.type === "ClassExpression" || decl.type === "FunctionExpression") {
          return decl.identifier?.value === name;
        }
        if (decl.type === "TsInterfaceDeclaration") {
          return decl.id.value === name;
        }
        return false;
      }),
    );
  }

  /** Narrows the selection to declarations that satisfy `predicate`. */
  filter(predicate: (item: ExportDefaultDeclaration) => boolean): ExportDefaultDeclarationQuery {
    return new ExportDefaultDeclarationQueryImpl(
      this.ast,
      this.selection.filter(predicate),
    );
  }

  /**
   * Unwraps declarations whose `decl` is a `ClassExpression` and returns them as a terminal query.
   * `findByName` on the result matches against `identifier.value`.
   * @example export default class Foo {} → ClassExpression { identifier: "Foo", body: [...] }
   */
  getClassExpressions(): DeclarationTerminalQuery<ClassExpression> {
    const nodes = this.selection
      .filter((d): d is ExportDefaultDeclaration & { decl: ClassExpression } => d.decl.type === "ClassExpression")
      .map(d => d.decl);
    return new DeclarationTerminalQueryImpl(this.ast, nodes, n => n.identifier?.value);
  }

  /**
   * Unwraps declarations whose `decl` is a `FunctionExpression` and returns them as a terminal query.
   * `findByName` on the result matches against `identifier.value`.
   * @example export default function foo() {} → FunctionExpression { identifier: "foo", params: [...] }
   */
  getFunctionExpressions(): DeclarationTerminalQuery<FunctionExpression> {
    const nodes = this.selection
      .filter((d): d is ExportDefaultDeclaration & { decl: FunctionExpression } => d.decl.type === "FunctionExpression")
      .map(d => d.decl);
    return new DeclarationTerminalQueryImpl(this.ast, nodes, n => n.identifier?.value);
  }

  /**
   * Unwraps declarations whose `decl` is a `TsInterfaceDeclaration` and returns them as a terminal query.
   * `findByName` on the result matches against `id.value`.
   * @example export default interface Foo {} → TsInterfaceDeclaration { id: "Foo", body: [...] }
   */
  getTsInterfaceDeclarations(): DeclarationTerminalQuery<TsInterfaceDeclaration> {
    const nodes = this.selection
      .filter((d): d is ExportDefaultDeclaration & { decl: TsInterfaceDeclaration } => d.decl.type === "TsInterfaceDeclaration")
      .map(d => d.decl);
    return new DeclarationTerminalQueryImpl(this.ast, nodes, n => n.id.value);
  }

  /** Returns the first declaration in the selection, or `null` if empty. */
  first(): ExportDefaultDeclaration | null {
    return this.selection[0] ?? null;
  }

  /** Returns the last declaration in the selection, or `null` if empty. */
  last(): ExportDefaultDeclaration | null {
    return this.selection[this.selection.length - 1] ?? null;
  }

  /** Returns the declaration at `index`, or `null` if out of bounds. */
  at(index: number): ExportDefaultDeclaration | null {
    return this.selection[index] ?? null;
  }

  /** Returns a shallow copy of the selection array. */
  toArray(): ExportDefaultDeclaration[] {
    return [...this.selection];
  }

  /** Returns the number of declarations in the selection. */
  count(): number {
    return this.selection.length;
  }

  /** Returns `true` if the selection contains no declarations. */
  isEmpty(): boolean {
    return this.selection.length === 0;
  }

  /** Calls `callback` for each declaration in the selection. */
  forEach(callback: (item: ExportDefaultDeclaration, index: number) => void): void {
    this.selection.forEach(callback);
  }

  /** Transforms each declaration in the selection with `callback` and returns the results. */
  map<R>(callback: (item: ExportDefaultDeclaration, index: number) => R): R[] {
    return this.selection.map(callback);
  }
}
