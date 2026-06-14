import {Module} from "@swc/core";

/**
 * Terminal query result for a set of AST declarations extracted from a `Module`.
 * Holds the source AST alongside a typed selection and exposes access, filtering,
 * aggregation, and iteration over the matched nodes. Filtering methods return a
 * new query with the same AST but a narrowed selection, leaving the original unchanged.
 * Use `toArray()` or iteration methods to consume results outside the query chain.
 */
export interface DeclarationTerminalQuery<T = Module> {
  /** The source AST module this query was built from. */
  readonly ast: Module;
  /** The currently matched nodes — narrows on each filter call. */
  readonly selection: T[];

  // Access

  /** Returns the first matched node, or `null` if the selection is empty. */
  first(): T | null;

  /** Returns the last matched node, or `null` if the selection is empty. */
  last(): T | null;

  /** Returns the node at `index`, or `null` if the index is out of bounds. */
  at(index: number): T | null;

  /** Returns a shallow copy of the current selection as a plain array. */
  toArray(): T[];

  // Filtering

  /**
   * Narrows the selection to nodes whose name equals `name`.
   * Name resolution depends on the extractor provided at construction time.
   * Returns a new query; the original is unchanged.
   */
  findByName(name: string): DeclarationTerminalQuery<T>;

  /**
   * Narrows the selection to nodes that satisfy `predicate`.
   * Returns a new query; the original is unchanged.
   */
  filter(predicate: (item: T) => boolean): DeclarationTerminalQuery<T>;

  // Aggregation

  /** Returns the number of nodes in the current selection. */
  count(): number;

  /** Returns `true` when the selection contains no nodes. */
  isEmpty(): boolean;

  // Iteration

  /** Calls `callback` once for each node in the selection, in order. */
  forEach(callback: (item: T, index: number) => void): void;

  /** Transforms each node with `callback` and returns the mapped results as an array. */
  map<R>(callback: (item: T, index: number) => R): R[];
}