import {Module} from "@swc/core";
import {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery";


export class DeclarationTerminalQueryImpl<T> implements DeclarationTerminalQuery<T> {
  readonly ast: Module;
  readonly selection: T[];

  constructor(
    ast: Module,
    selection: T[],
    private readonly nameExtractor: (item: T) => string | undefined = () => undefined,
  ) {
    this.ast = ast;
    this.selection = selection;
  }

  /** Returns the first item in the selection, or `null` if empty. */
  first(): T | null {
    return this.selection[0] ?? null;
  }

  /** Returns the last item in the selection, or `null` if empty. */
  last(): T | null {
    return this.selection[this.selection.length - 1] ?? null;
  }

  /** Returns the item at the given index, or `null` if out of bounds. */
  at(index: number): T | null {
    return this.selection[index] ?? null;
  }

  /** Returns a shallow copy of the selection array. */
  toArray(): T[] {
    return [...this.selection];
  }

  /**
   * Narrows the selection to items whose extracted name matches `name`.
   * The name is extracted via the `nameExtractor` passed to the constructor.
   */
  findByName(name: string): DeclarationTerminalQuery<T> {
    return new DeclarationTerminalQueryImpl(
      this.ast,
      this.selection.filter(item => this.nameExtractor(item) === name),
      this.nameExtractor,
    );
  }

  /** Narrows the selection to items that satisfy `predicate`. */
  filter(predicate: (item: T) => boolean): DeclarationTerminalQuery<T> {
    return new DeclarationTerminalQueryImpl(
      this.ast,
      this.selection.filter(predicate),
      this.nameExtractor,
    );
  }

  /** Returns the number of items in the selection. */
  count(): number {
    return this.selection.length;
  }

  /** Returns `true` if the selection contains no items. */
  isEmpty(): boolean {
    return this.selection.length === 0;
  }

  /** Calls `callback` for each item in the selection. */
  forEach(callback: (item: T, index: number) => void): void {
    this.selection.forEach(callback);
  }

  /** Transforms each item in the selection with `callback` and returns the results. */
  map<R>(callback: (item: T, index: number) => R): R[] {
    return this.selection.map(callback);
  }
}