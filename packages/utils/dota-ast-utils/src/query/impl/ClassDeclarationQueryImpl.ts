import {ClassDeclarationQuery} from "@dota/query/contracts/DeclarationFluentQuery.ts";
import {
  ClassDeclaration,
  ClassMember,
  ClassMethod,
  ClassProperty,
  Constructor,
  Module,
  PrivateMethod,
  PrivateProperty,
  StaticBlock,
  TsIndexSignature,
} from "@swc/core";
import {DeclarationTerminalQuery} from "../contracts/DeclarationTerminalQuery";
import {DeclarationTerminalQueryImpl} from "./DeclarationTerminalQueryImpl";


export class ClassDeclarationQueryImpl implements ClassDeclarationQuery {
  readonly ast: Module;
  readonly selection: ClassDeclaration[];

  constructor(ast: Module, selection: ClassDeclaration[]) {
    this.ast = ast;
    this.selection = selection;
  }

  /** Collects `body` members from all classes, then returns the name from `key` (PropertyName). */
  private members<M extends ClassMember>(type: M["type"]): M[] {
    return this.selection.flatMap(d =>
      d.body.filter((m): m is M => m.type === type),
    );
  }

  /**
   * Collects all `Constructor` members across the selection.
   * Each class has at most one constructor, so the result length equals the number of matching classes.
   * `findByName` is not meaningful here; use `first()` or `toArray()` directly.
   */
  getConstructors(): DeclarationTerminalQuery<Constructor> {
    return new DeclarationTerminalQueryImpl(this.ast, this.members<Constructor>("Constructor"));
  }

  /**
   * Collects all `ClassMethod` members (`type === "ClassMethod"`) across the selection.
   * Covers regular methods, getters, and setters.
   * `findByName` on the result matches against the method key's string value.
   */
  getClassMethods(): DeclarationTerminalQuery<ClassMethod> {
    const members = this.members<ClassMethod>("ClassMethod");
    return new DeclarationTerminalQueryImpl(this.ast, members, m =>
      m.key.type === "Identifier" || m.key.type === "StringLiteral" ? m.key.value : undefined,
    );
  }

  /**
   * Collects all `PrivateMethod` members (`type === "PrivateMethod"`) across the selection.
   * `findByName` on the result matches against the `PrivateName` id value (without the `#`).
   */
  getPrivateMethods(): DeclarationTerminalQuery<PrivateMethod> {
    const members = this.members<PrivateMethod>("PrivateMethod");
    return new DeclarationTerminalQueryImpl(this.ast, members, m => m.key.id.value);
  }

  /**
   * Collects all `ClassProperty` members (`type === "ClassProperty"`) across the selection.
   * `findByName` on the result matches against the property key's string value.
   */
  getClassProperties(): DeclarationTerminalQuery<ClassProperty> {
    const members = this.members<ClassProperty>("ClassProperty");
    return new DeclarationTerminalQueryImpl(this.ast, members, p =>
      p.key.type === "Identifier" || p.key.type === "StringLiteral" ? p.key.value : undefined,
    );
  }

  /**
   * Collects all `PrivateProperty` members (`type === "PrivateProperty"`) across the selection.
   * `findByName` on the result matches against the `PrivateName` id value (without the `#`).
   */
  getPrivateProperties(): DeclarationTerminalQuery<PrivateProperty> {
    const members = this.members<PrivateProperty>("PrivateProperty");
    return new DeclarationTerminalQueryImpl(this.ast, members, p => p.key.id.value);
  }

  /**
   * Collects all `StaticBlock` members (`type === "StaticBlock"`) across the selection.
   * Static blocks have no name; use `toArray()` or `forEach()` to iterate.
   */
  getStaticBlocks(): DeclarationTerminalQuery<StaticBlock> {
    return new DeclarationTerminalQueryImpl(this.ast, this.members<StaticBlock>("StaticBlock"));
  }

  /**
   * Collects all `TsIndexSignature` members (`type === "TsIndexSignature"`) across the selection.
   * Index signatures have no name; use `toArray()` or `forEach()` to iterate.
   */
  getTsIndexSignatures(): DeclarationTerminalQuery<TsIndexSignature> {
    return new DeclarationTerminalQueryImpl(this.ast, this.members<TsIndexSignature>("TsIndexSignature"));
  }

  /** Returns the first class in the selection, or `null` if empty. */
  first(): ClassDeclaration | null { return this.selection[0] ?? null; }

  /** Returns the last class in the selection, or `null` if empty. */
  last(): ClassDeclaration | null { return this.selection[this.selection.length - 1] ?? null; }

  /** Returns the class at `index`, or `null` if out of bounds. */
  at(index: number): ClassDeclaration | null { return this.selection[index] ?? null; }

  /** Returns a shallow copy of the selection array. */
  toArray(): ClassDeclaration[] { return [...this.selection]; }

  /** Returns the number of classes in the selection. */
  count(): number { return this.selection.length; }

  /** Returns `true` if the selection contains no classes. */
  isEmpty(): boolean { return this.selection.length === 0; }

  /** Calls `callback` for each class in the selection. */
  forEach(callback: (item: ClassDeclaration, index: number) => void): void { this.selection.forEach(callback); }

  /** Transforms each class in the selection with `callback` and returns the results. */
  map<R>(callback: (item: ClassDeclaration, index: number) => R): R[] { return this.selection.map(callback); }

  /** Narrows the selection to classes whose `identifier.value` matches `name`. */
  findByName(name: string): ClassDeclarationQuery {
    return new ClassDeclarationQueryImpl(this.ast, this.selection.filter(d => d.identifier.value === name));
  }

  /** Narrows the selection to classes that satisfy `predicate`. */
  filter(predicate: (item: ClassDeclaration) => boolean): ClassDeclarationQuery {
    return new ClassDeclarationQueryImpl(this.ast, this.selection.filter(predicate));
  }
}