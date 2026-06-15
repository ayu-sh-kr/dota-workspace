import {ExportNamedDeclarationQuery} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {
  ExportDefaultSpecifier,
  ExportNamedDeclaration,
  ExportNamespaceSpecifier,
  Module,
  NamedExportSpecifier,
} from "@swc/core";
import type {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery.ts";
import {DeclarationTerminalQueryImpl} from "./DeclarationTerminalQueryImpl";

/**
 * Terminal query for named export specifiers.
 * It matches both the original binding name and the exported alias.
 * Use it for `export { foo }` and `export { foo as bar }` forms.
 */
class NamedExportSpecifierQueryImpl extends DeclarationTerminalQueryImpl<NamedExportSpecifier> {
  constructor(ast: Module, selection: NamedExportSpecifier[]) {
    super(ast, selection, s => s.orig.value);
  }

  /** Narrows the selection to specifiers that match `name`. */
  findByName(name: string): DeclarationTerminalQuery<NamedExportSpecifier> {
    return new NamedExportSpecifierQueryImpl(
      this.ast,
      this.selection.filter(s => s.orig.value === name || s.exported?.value === name),
    );
  }

  /** Narrows the selection to specifiers that satisfy `predicate`. */
  filter(predicate: (item: NamedExportSpecifier) => boolean): DeclarationTerminalQuery<NamedExportSpecifier> {
    return new NamedExportSpecifierQueryImpl(
      this.ast,
      this.selection.filter(predicate),
    );
  }
}


export class ExportNamedDeclarationQueryImpl implements ExportNamedDeclarationQuery {
  readonly ast: Module;
  readonly selection: ExportNamedDeclaration[];

  constructor(ast: Module, selection: ExportNamedDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /**
   * Narrows the selection to declarations whose `source.value` matches `name`.
   * Useful when working with re-exports to find by module path.
   * @example findByName('./utils') → matches `export { foo } from './utils'`
   */
  findByName(name: string): ExportNamedDeclarationQuery {
    return new ExportNamedDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.source?.value === name),
    );
  }

  /**
   * Narrows the selection to declarations that satisfy `predicate`.
   */
  filter(predicate: (item: ExportNamedDeclaration) => boolean): ExportNamedDeclarationQuery {
    return new ExportNamedDeclarationQueryImpl(
      this.ast,
      this.selection.filter(predicate),
    );
  }

  /**
   * Narrows the selection to declarations whose `typeOnly === true`.
   * @example export type { Foo } → kept; export { Foo } → dropped
   */
  filterTypeOnly(): ExportNamedDeclarationQuery {
    return new ExportNamedDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.typeOnly),
    );
  }

  /**
   * Narrows the selection to declarations that re-export from another module (`source` is set).
   * @example export { foo } from './mod' → kept; export { foo } → dropped
   */
  filterReExports(): ExportNamedDeclarationQuery {
    return new ExportNamedDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.source != null),
    );
  }

  /**
   * Narrows the selection to declarations that export local bindings (`source` is absent).
   * @example export { foo } → kept; export { foo } from './mod' → dropped
   */
  filterLocalExports(): ExportNamedDeclarationQuery {
    return new ExportNamedDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.source == null),
    );
  }

  /**
   * Collects all `NamedExportSpecifier` entries (`type === "ExportSpecifier"`) across the selection,
   * flattens them, and returns a terminal query over those specifiers.
   * `findByName` on the result matches against the local binding name or the exported alias.
   * @example export { foo, bar as baz } → query over `foo`, `bar`, and `baz`
   */
  getNamedSpecifiers(): DeclarationTerminalQuery<NamedExportSpecifier> {
    const specifiers = this.selection.flatMap(d =>
      d.specifiers.filter((s): s is NamedExportSpecifier => s.type === "ExportSpecifier"),
    );
    return new NamedExportSpecifierQueryImpl(this.ast, specifiers);
  }

  /**
   * Collects all `ExportNamespaceSpecifier` entries (`type === "ExportNamespaceSpecifier"`) across
   * the selection, flattens them, and returns a terminal query over those specifiers.
   * `findByName` on the result matches against `name.value` (the namespace alias).
   * @example export * as utils from './utils' → [{ name: "utils" }]
   */
  getNamespaceSpecifiers(): DeclarationTerminalQuery<ExportNamespaceSpecifier> {
    const specifiers = this.selection.flatMap(d =>
      d.specifiers.filter((s): s is ExportNamespaceSpecifier => s.type === "ExportNamespaceSpecifier"),
    );
    return new DeclarationTerminalQueryImpl(this.ast, specifiers, s => s.name.value);
  }

  /**
   * Collects all `ExportDefaultSpecifier` entries (`type === "ExportDefaultSpecifier"`) across
   * the selection, flattens them, and returns a terminal query over those specifiers.
   * `findByName` on the result matches against `exported.value` (the exported identifier).
   * @example export foo from './mod' → [{ exported: "foo" }]
   */
  getDefaultSpecifiers(): DeclarationTerminalQuery<ExportDefaultSpecifier> {
    const specifiers = this.selection.flatMap(d =>
      d.specifiers.filter((s): s is ExportDefaultSpecifier => s.type === "ExportDefaultSpecifier"),
    );
    return new DeclarationTerminalQueryImpl(this.ast, specifiers, s => s.exported.value);
  }

  /** Returns the first declaration in the selection, or `null` if empty. */
  first(): ExportNamedDeclaration | null {
    return this.selection[0] ?? null;
  }

  /** Returns the last declaration in the selection, or `null` if empty. */
  last(): ExportNamedDeclaration | null {
    return this.selection[this.selection.length - 1] ?? null;
  }

  /** Returns the declaration at `index`, or `null` if out of bounds. */
  at(index: number): ExportNamedDeclaration | null {
    return this.selection[index] ?? null;
  }

  /** Returns a shallow copy of the selection array. */
  toArray(): ExportNamedDeclaration[] {
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
  forEach(callback: (item: ExportNamedDeclaration, index: number) => void): void {
    this.selection.forEach(callback);
  }

  /** Transforms each declaration in the selection with `callback` and returns the results. */
  map<R>(callback: (item: ExportNamedDeclaration, index: number) => R): R[] {
    return this.selection.map(callback);
  }
}
