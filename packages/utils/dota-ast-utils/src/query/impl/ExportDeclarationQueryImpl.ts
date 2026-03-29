import {
  ClassDeclarationQuery,
  ExportDeclarationQuery,
  FunctionDeclarationQuery,
  VariableDeclarationQuery,
} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {
  ClassDeclaration,
  Declaration,
  ExportDeclaration,
  FunctionDeclaration,
  Module,
  TsEnumDeclaration,
  TsInterfaceDeclaration,
  TsModuleDeclaration,
  TsTypeAliasDeclaration,
  VariableDeclaration,
} from "@swc/core";
import {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery";
import {DeclarationTerminalQueryImpl} from "./DeclarationTerminalQueryImpl";
import {ClassDeclarationQueryImpl} from "./ClassDeclarationQueryImpl";
import {FunctionDeclarationQueryImpl} from "./FunctionDeclarationQueryImpl";
import {VariableDeclarationQueryImpl} from "./VariableDeclarationQueryImpl";


/** Extracts the declared name from an inner `Declaration` node. */
function nameFromDeclaration(declaration: Declaration): string | undefined {
  switch (declaration.type) {
    case "ClassDeclaration":
    case "FunctionDeclaration":
      return declaration.identifier.value;
    case "TsInterfaceDeclaration":
    case "TsTypeAliasDeclaration":
    case "TsEnumDeclaration":
      return declaration.id.value;
    case "TsModuleDeclaration":
      return declaration.id.value;
    case "VariableDeclaration": {
      const first = declaration.declarations[0];
      return first?.id.type === "Identifier" ? first.id.value : undefined;
    }
  }
}


export class ExportDeclarationQueryImpl implements ExportDeclarationQuery {
  readonly ast: Module;
  readonly selection: ExportDeclaration[];

  constructor(ast: Module, selection: ExportDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /**
   * Narrows the selection to declarations whose inner declaration name matches `name`.
   * The name is resolved via the declared identifier/id of the wrapped declaration.
   * @example findByName("Foo") → matches `export class Foo {}`, `export function Foo() {}`, etc.
   */
  findByName(name: string): ExportDeclarationQuery {
    return new ExportDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => nameFromDeclaration(d.declaration) === name),
    );
  }

  /** Narrows the selection to declarations that satisfy `predicate`. */
  filter(predicate: (item: ExportDeclaration) => boolean): ExportDeclarationQuery {
    return new ExportDeclarationQueryImpl(this.ast, this.selection.filter(predicate));
  }

  /**
   * Filters the selection to `ExportDeclaration` nodes whose inner declaration is a `ClassDeclaration`,
   * unwraps them, and returns a `ClassDeclarationQuery` over the inner nodes.
   * @example export class Foo {} → ClassDeclaration { identifier: "Foo", body: [...] }
   */
  getClassDeclarations(): ClassDeclarationQuery {
    const inner = this.selection
      .filter((d): d is ExportDeclaration & { declaration: ClassDeclaration } =>
        d.declaration.type === "ClassDeclaration",
      )
      .map(d => d.declaration);
    return new ClassDeclarationQueryImpl(this.ast, inner);
  }

  /**
   * Filters the selection to `ExportDeclaration` nodes whose inner declaration is a `FunctionDeclaration`,
   * unwraps them, and returns a `FunctionDeclarationQuery` over the inner nodes.
   * @example export function foo() {} → FunctionDeclaration { identifier: "foo", params: [...] }
   */
  getFunctionDeclarations(): FunctionDeclarationQuery {
    const inner = this.selection
      .filter((d): d is ExportDeclaration & { declaration: FunctionDeclaration } =>
        d.declaration.type === "FunctionDeclaration",
      )
      .map(d => d.declaration);
    return new FunctionDeclarationQueryImpl(this.ast, inner);
  }

  /**
   * Filters the selection to `ExportDeclaration` nodes whose inner declaration is a `VariableDeclaration`,
   * unwraps them, and returns a `VariableDeclarationQuery` over the inner nodes.
   * @example export const foo = 1 → VariableDeclaration { kind: "const", declarations: [...] }
   */
  getVariableDeclarations(): VariableDeclarationQuery {
    const inner = this.selection
      .filter((d): d is ExportDeclaration & { declaration: VariableDeclaration } =>
        d.declaration.type === "VariableDeclaration",
      )
      .map(d => d.declaration);
    return new VariableDeclarationQueryImpl(this.ast, inner);
  }

  /**
   * Filters the selection to `ExportDeclaration` nodes whose inner declaration is a `TsInterfaceDeclaration`,
   * unwraps them, and returns a terminal query over the inner nodes.
   * `findByName` on the result matches against `id.value`.
   * @example export interface Foo {} → TsInterfaceDeclaration { id: "Foo", ... }
   */
  getTsInterfaceDeclarations(): DeclarationTerminalQuery<TsInterfaceDeclaration> {
    const inner = this.selection
      .filter((d): d is ExportDeclaration & { declaration: TsInterfaceDeclaration } =>
        d.declaration.type === "TsInterfaceDeclaration",
      )
      .map(d => d.declaration);
    return new DeclarationTerminalQueryImpl(this.ast, inner, d => d.id.value);
  }

  /**
   * Filters the selection to `ExportDeclaration` nodes whose inner declaration is a `TsTypeAliasDeclaration`,
   * unwraps them, and returns a terminal query over the inner nodes.
   * `findByName` on the result matches against `id.value`.
   * @example export type Foo = string → TsTypeAliasDeclaration { id: "Foo", ... }
   */
  getTsTypeAliasDeclarations(): DeclarationTerminalQuery<TsTypeAliasDeclaration> {
    const inner = this.selection
      .filter((d): d is ExportDeclaration & { declaration: TsTypeAliasDeclaration } =>
        d.declaration.type === "TsTypeAliasDeclaration",
      )
      .map(d => d.declaration);
    return new DeclarationTerminalQueryImpl(this.ast, inner, d => d.id.value);
  }

  /**
   * Filters the selection to `ExportDeclaration` nodes whose inner declaration is a `TsEnumDeclaration`,
   * unwraps them, and returns a terminal query over the inner nodes.
   * `findByName` on the result matches against `id.value`.
   * @example export enum Foo { A, B } → TsEnumDeclaration { id: "Foo", members: [...] }
   */
  getTsEnumDeclarations(): DeclarationTerminalQuery<TsEnumDeclaration> {
    const inner = this.selection
      .filter((d): d is ExportDeclaration & { declaration: TsEnumDeclaration } =>
        d.declaration.type === "TsEnumDeclaration",
      )
      .map(d => d.declaration);
    return new DeclarationTerminalQueryImpl(this.ast, inner, d => d.id.value);
  }

  /**
   * Filters the selection to `ExportDeclaration` nodes whose inner declaration is a `TsModuleDeclaration`,
   * unwraps them, and returns a terminal query over the inner nodes.
   * `findByName` on the result matches against `id.value` (works for both `Identifier` and `StringLiteral`).
   * @example export namespace Foo {} → TsModuleDeclaration { id: "Foo", ... }
   */
  getTsModuleDeclarations(): DeclarationTerminalQuery<TsModuleDeclaration> {
    const inner = this.selection
      .filter((d): d is ExportDeclaration & { declaration: TsModuleDeclaration } =>
        d.declaration.type === "TsModuleDeclaration",
      )
      .map(d => d.declaration);
    return new DeclarationTerminalQueryImpl(this.ast, inner, d => d.id.value);
  }

  /** Returns the first declaration in the selection, or `null` if empty. */
  first(): ExportDeclaration | null {
    return this.selection[0] ?? null;
  }

  /** Returns the last declaration in the selection, or `null` if empty. */
  last(): ExportDeclaration | null {
    return this.selection[this.selection.length - 1] ?? null;
  }

  /** Returns the declaration at `index`, or `null` if out of bounds. */
  at(index: number): ExportDeclaration | null {
    return this.selection[index] ?? null;
  }

  /** Returns a shallow copy of the selection array. */
  toArray(): ExportDeclaration[] {
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
  forEach(callback: (item: ExportDeclaration, index: number) => void): void {
    this.selection.forEach(callback);
  }

  /** Transforms each declaration in the selection with `callback` and returns the results. */
  map<R>(callback: (item: ExportDeclaration, index: number) => R): R[] {
    return this.selection.map(callback);
  }
}