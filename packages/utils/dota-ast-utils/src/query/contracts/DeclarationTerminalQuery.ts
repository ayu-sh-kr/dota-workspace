import {Module} from "@swc/core";

export interface DeclarationTerminalQuery<T = Module> {
  readonly ast: Module;
  readonly selection: T[];

  // Access
  first(): T | null;

  last(): T | null;

  at(index: number): T | null;

  toArray(): T[];

  // Filtering
  findByName(name: string): DeclarationTerminalQuery<T>;

  filter(predicate: (item: T) => boolean): DeclarationTerminalQuery<T>;

  // Aggregation
  count(): number;

  isEmpty(): boolean;

  // Iteration
  forEach(callback: (item: T, index: number) => void): void;

  map<R>(callback: (item: T, index: number) => R): R[];
}