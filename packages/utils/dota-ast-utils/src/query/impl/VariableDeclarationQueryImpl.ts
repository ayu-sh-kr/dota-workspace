import {VariableDeclarationQuery} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {Module, VariableDeclaration, VariableDeclarator} from "@swc/core";
import {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery";
import {DeclarationTerminalQueryImpl} from "./DeclarationTerminalQueryImpl";


export class VariableDeclarationQueryImpl implements VariableDeclarationQuery {
  readonly ast: Module;
  readonly selection: VariableDeclaration[];

  constructor(ast: Module, selection: VariableDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /** Narrows the selection to `VariableDeclaration` nodes declared with `var`. */
  filterVar(): VariableDeclarationQuery {
    return new VariableDeclarationQueryImpl(this.ast, this.selection.filter(d => d.kind === "var"));
  }

  /** Narrows the selection to `VariableDeclaration` nodes declared with `let`. */
  filterLet(): VariableDeclarationQuery {
    return new VariableDeclarationQueryImpl(this.ast, this.selection.filter(d => d.kind === "let"));
  }

  /** Narrows the selection to `VariableDeclaration` nodes declared with `const`. */
  filterConst(): VariableDeclarationQuery {
    return new VariableDeclarationQueryImpl(this.ast, this.selection.filter(d => d.kind === "const"));
  }

  /**
   * Collects `VariableDeclaration.declarations` from all nodes in the selection and returns the flattened list.
   * `findByName` on the result matches against the declarator's `id` when it is an `Identifier`.
   * Declarators with destructured patterns (`ArrayPattern`, `ObjectPattern`) won't match by name.
   * @example const a = 1, b = 2 → [VariableDeclarator { id: "a" }, VariableDeclarator { id: "b" }]
   */
  getDeclarators(): DeclarationTerminalQuery<VariableDeclarator> {
    const declarators = this.selection.flatMap(d => d.declarations);
    return new DeclarationTerminalQueryImpl(this.ast, declarators, d =>
      d.id.type === "Identifier" ? d.id.value : undefined,
    );
  }

  /** Returns the first declaration in the selection, or `null` if empty. */
  first(): VariableDeclaration | null { return this.selection[0] ?? null; }

  /** Returns the last declaration in the selection, or `null` if empty. */
  last(): VariableDeclaration | null { return this.selection[this.selection.length - 1] ?? null; }

  /** Returns the declaration at `index`, or `null` if out of bounds. */
  at(index: number): VariableDeclaration | null { return this.selection[index] ?? null; }

  /** Returns a shallow copy of the selection array. */
  toArray(): VariableDeclaration[] { return [...this.selection]; }

  /** Returns the number of declarations in the selection. */
  count(): number { return this.selection.length; }

  /** Returns `true` if the selection contains no declarations. */
  isEmpty(): boolean { return this.selection.length === 0; }

  /** Calls `callback` for each declaration in the selection. */
  forEach(callback: (item: VariableDeclaration, index: number) => void): void { this.selection.forEach(callback); }

  /** Transforms each declaration in the selection with `callback` and returns the results. */
  map<R>(callback: (item: VariableDeclaration, index: number) => R): R[] { return this.selection.map(callback); }

  /**
   * Narrows the selection to declarations whose first declarator `id` is an `Identifier` matching `name`.
   * Declarations with destructured patterns (`ArrayPattern`, `ObjectPattern`) as the first declarator won't match.
   * @example findByName("foo") → matches `const foo = 1` but not `const { foo } = obj`
   */
  findByName(name: string): VariableDeclarationQuery {
    return new VariableDeclarationQueryImpl(
      this.ast,
      this.selection.filter(d => {
        const first = d.declarations[0];
        return first?.id.type === "Identifier" && first.id.value === name;
      }),
    );
  }

  /** Narrows the selection to declarations that satisfy `predicate`. */
  filter(predicate: (item: VariableDeclaration) => boolean): VariableDeclarationQuery {
    return new VariableDeclarationQueryImpl(this.ast, this.selection.filter(predicate));
  }
}