import {ExportAllDeclarationQuery} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {ExportAllDeclaration, Module} from "@swc/core";


export class ExportAllDeclarationQueryImpl implements ExportAllDeclarationQuery {
  readonly ast: Module;
  readonly selection: ExportAllDeclaration[];

  constructor(ast: Module, selection: ExportAllDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /**
   * Narrows the selection to declarations whose `source.value` matches `name`.
   * @example findByName('./utils') → matches `export * from './utils'`
   */
  findByName(name: string): ExportAllDeclarationQuery {
    return new ExportAllDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.source.value === name),
    );
  }

  /** Narrows the selection to declarations that satisfy `predicate`. */
  filter(predicate: (item: ExportAllDeclaration) => boolean): ExportAllDeclarationQuery {
    return new ExportAllDeclarationQueryImpl(
      this.ast,
      this.selection.filter(predicate),
    );
  }

  /**
   * Narrows the selection to declarations whose `source.value` matches `source`.
   * @example filterBySource('./utils') → matches `export * from './utils'`
   */
  filterBySource(source: string): ExportAllDeclarationQuery {
    return new ExportAllDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => d.source.value === source),
    );
  }

  /** Returns the first declaration in the selection, or `null` if empty. */
  first(): ExportAllDeclaration | null {
    return this.selection[0] ?? null;
  }

  /** Returns the last declaration in the selection, or `null` if empty. */
  last(): ExportAllDeclaration | null {
    return this.selection[this.selection.length - 1] ?? null;
  }

  /** Returns the declaration at `index`, or `null` if out of bounds. */
  at(index: number): ExportAllDeclaration | null {
    return this.selection[index] ?? null;
  }

  /** Returns a shallow copy of the selection array. */
  toArray(): ExportAllDeclaration[] {
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
  forEach(callback: (item: ExportAllDeclaration, index: number) => void): void {
    this.selection.forEach(callback);
  }

  /** Transforms each declaration in the selection with `callback` and returns the results. */
  map<R>(callback: (item: ExportAllDeclaration, index: number) => R): R[] {
    return this.selection.map(callback);
  }
}