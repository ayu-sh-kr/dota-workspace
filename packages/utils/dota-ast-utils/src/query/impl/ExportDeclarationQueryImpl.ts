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
import type {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery.ts";
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

/**
 * Fluent query for exports that wrap a real declaration node.
 * Use this when a file contains `export class`, `export function`, or `export const` forms.
 * The query keeps the full export node so you can inspect, filter, and then unwrap the inner declaration.
 * It also supports name lookup across the wrapped declaration's identifier or declared name.
 */
export class ExportDeclarationQueryImpl implements ExportDeclarationQuery {
  readonly ast: Module;
  readonly selection: ExportDeclaration[];

  constructor(ast: Module, selection: ExportDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /**
   * Narrows the selection to exports whose wrapped declaration name matches `name`.
   * For classes and functions this is the declared identifier; for interfaces, types, enums,
   * and namespaces it is the inner `id`; for variables it is the first identifier declarator.
   * @example findByName("Foo") → matches `export class Foo {}` and `export function Foo() {}`
   */
  findByName(name: string): ExportDeclarationQuery {
    return new ExportDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => nameFromDeclaration(d.declaration) === name),
    );
  }

  /** Narrows the selection to exports that satisfy `predicate`. */
  filter(predicate: (item: ExportDeclaration) => boolean): ExportDeclarationQuery {
    return new ExportDeclarationQueryImpl(this.ast, this.selection.filter(predicate));
  }

  /**
   * Keeps only `export class` nodes, then unwraps the inner class declarations.
   * This is useful when you want class-specific queries like methods, fields, or constructors.
   * @example export class Foo {} → query over the inner class declaration
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
   * Keeps only `export function` nodes and unwraps the inner function declarations.
   * Use the returned query to inspect params, decorators, or type parameters.
   * @example export function foo() {} → query over the inner function declaration
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
   * Keeps only `export const`, `export let`, and `export var` declarations, then unwraps them.
   * Use the returned query to inspect the actual variable declaration and its declarators.
   * @example export const foo = 1 → query over the inner variable declaration
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
   * Keeps only exported TypeScript interfaces and unwraps them into a terminal query.
   * The returned query matches names against the interface `id`.
   * @example export interface Foo {} → query over the inner interface declaration
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
   * Keeps only exported TypeScript type aliases and unwraps them into a terminal query.
   * The returned query matches names against the alias `id`.
   * @example export type Foo = string → query over the inner type alias declaration
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
   * Keeps only exported TypeScript enums and unwraps them into a terminal query.
   * The returned query matches names against the enum `id`.
   * @example export enum Foo { A, B } → query over the inner enum declaration
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
   * Keeps only exported namespaces/modules and unwraps them into a terminal query.
   * The returned query matches names against the namespace `id`, whether it is an identifier or string literal.
   * @example export namespace Foo {} → query over the inner namespace declaration
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
