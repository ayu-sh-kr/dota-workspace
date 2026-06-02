import {ImportDeclarationQuery} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  Module,
  NamedImportSpecifier,
} from "@swc/core";
import {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery";
import {DeclarationTerminalQueryImpl} from "./DeclarationTerminalQueryImpl";


export class ImportDeclarationQueryImpl implements ImportDeclarationQuery {
  readonly ast: Module;
  readonly selection: ImportDeclaration[];

  constructor(ast: Module, selection: ImportDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /**
   * Narrows the selection to declarations whose `source.value` matches `name`.
   * @example findByName('./utils') → matches `import { foo } from './utils'`
   */
  findByName(name: string): ImportDeclarationQuery {
    return new ImportDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.source.value === name),
    );
  }

  /** Narrows the selection to declarations that satisfy `predicate`. */
  filter(predicate: (item: ImportDeclaration) => boolean): ImportDeclarationQuery {
    return new ImportDeclarationQueryImpl(
      this.ast,
      this.selection.filter(predicate),
    );
  }

  /**
   * Narrows the selection to declarations whose `typeOnly === true`.
   * @example import type { Foo } from './mod' → kept; import { Foo } from './mod' → dropped
   */
  filterTypeOnly(): ImportDeclarationQuery {
    return new ImportDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.typeOnly),
    );
  }

  /**
   * Narrows the selection to declarations whose `source.value` matches `source`.
   * @example filterBySource('./utils') → matches `import { foo } from './utils'`
   */
  filterBySource(source: string): ImportDeclarationQuery {
    return new ImportDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.source.value === source),
    );
  }

  /**
   * Collects all `NamedImportSpecifier` entries (`type === "ImportSpecifier"`) across the selection,
   * flattens them, and returns a terminal query over those specifiers.
   * `findByName` on the result matches against `local.value` (the local binding name).
   * @example import { foo, bar as baz } from './mod' → [{ local: "foo" }, { local: "baz", imported: "bar" }]
   */
  getNamedSpecifiers(): DeclarationTerminalQuery<NamedImportSpecifier> {
    const specifiers = this.selection.flatMap(d =>
      d.specifiers.filter((s): s is NamedImportSpecifier => s.type === "ImportSpecifier"),
    );
    return new DeclarationTerminalQueryImpl(this.ast, specifiers, s => s.local.value);
  }

  /**
   * Collects all `ImportDefaultSpecifier` entries (`type === "ImportDefaultSpecifier"`) across
   * the selection, flattens them, and returns a terminal query over those specifiers.
   * `findByName` on the result matches against `local.value` (the local binding name).
   * @example import Foo from './mod' → [{ local: "Foo" }]
   */
  getDefaultSpecifiers(): DeclarationTerminalQuery<ImportDefaultSpecifier> {
    const specifiers = this.selection.flatMap(d =>
      d.specifiers.filter((s): s is ImportDefaultSpecifier => s.type === "ImportDefaultSpecifier"),
    );
    return new DeclarationTerminalQueryImpl(this.ast, specifiers, s => s.local.value);
  }

  /**
   * Collects all `ImportNamespaceSpecifier` entries (`type === "ImportNamespaceSpecifier"`) across
   * the selection, flattens them, and returns a terminal query over those specifiers.
   * `findByName` on the result matches against `local.value` (the namespace alias).
   * @example import * as ns from './mod' → [{ local: "ns" }]
   */
  getNamespaceSpecifiers(): DeclarationTerminalQuery<ImportNamespaceSpecifier> {
    const specifiers = this.selection.flatMap(d =>
      d.specifiers.filter((s): s is ImportNamespaceSpecifier => s.type === "ImportNamespaceSpecifier"),
    );
    return new DeclarationTerminalQueryImpl(this.ast, specifiers, s => s.local.value);
  }

  /** Returns the first declaration in the selection, or `null` if empty. */
  first(): ImportDeclaration | null {
    return this.selection[0] ?? null;
  }

  /** Returns the last declaration in the selection, or `null` if empty. */
  last(): ImportDeclaration | null {
    return this.selection[this.selection.length - 1] ?? null;
  }

  /** Returns the declaration at `index`, or `null` if out of bounds. */
  at(index: number): ImportDeclaration | null {
    return this.selection[index] ?? null;
  }

  /** Returns a shallow copy of the selection array. */
  toArray(): ImportDeclaration[] {
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
  forEach(callback: (item: ImportDeclaration, index: number) => void): void {
    this.selection.forEach(callback);
  }

  /** Transforms each declaration in the selection with `callback` and returns the results. */
  map<R>(callback: (item: ImportDeclaration, index: number) => R): R[] {
    return this.selection.map(callback);
  }
}