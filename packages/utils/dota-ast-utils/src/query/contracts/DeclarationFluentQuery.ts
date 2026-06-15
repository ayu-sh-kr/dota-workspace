import type {
  ClassDeclaration,
  ClassExpression,
  ClassMethod,
  ClassProperty,
  Constructor,
  Decorator, ExportAllDeclaration,
  ExportDeclaration,
  ExportDefaultDeclaration,
  ExportDefaultSpecifier,
  ExportNamedDeclaration,
  ExportNamespaceSpecifier,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  Module,
  NamedExportSpecifier,
  NamedImportSpecifier,
  Param,
  PrivateMethod,
  PrivateProperty,
  StaticBlock,
  TsEnumDeclaration,
  TsIndexSignature,
  TsInterfaceDeclaration,
  TsModuleDeclaration,
  TsTypeAliasDeclaration,
  TsTypeParameter,
  VariableDeclaration,
  VariableDeclarator,
} from "@swc/core";

import type {DeclarationTerminalQuery} from "@dota/query/contracts/DeclarationTerminalQuery.ts";


export interface DeclarationFluentQuery<T = Module> extends DeclarationTerminalQuery<T>{
  readonly ast: Module;
  readonly selection: T[];
}

export interface ExportNamedDeclarationQuery extends DeclarationFluentQuery<ExportNamedDeclaration> {
  readonly ast: Module;
  readonly selection: ExportNamedDeclaration[];

  /**
   * Filters `selection` to `ExportNamedDeclaration` nodes whose `typeOnly === true`,
   * and returns them as the new selection.
   * @example export type { Foo, Bar } → ExportNamedDeclaration { typeOnly: true, specifiers: [...] }
   */
  filterTypeOnly(): ExportNamedDeclarationQuery;

  /**
   * Filters `selection` to `ExportNamedDeclaration` nodes that have a `source` (re-exports),
   * and returns them as the new selection.
   * @example export { foo } from './mod' → ExportNamedDeclaration { source: StringLiteral("./mod"), ... }
   */
  filterReExports(): ExportNamedDeclarationQuery;

  /**
   * Filters `selection` to `ExportNamedDeclaration` nodes with no `source` (local exports),
   * and returns them as the new selection.
   * @example export { foo } → ExportNamedDeclaration { source: undefined, ... }
   */
  filterLocalExports(): ExportNamedDeclarationQuery;

  /**
   * Iterates `selection`, filters `ExportNamedDeclaration.specifiers` whose `type === "ExportSpecifier"`,
   * and returns the flattened list of `NamedExportSpecifier` nodes as the new selection.
   * @example export { foo, bar as baz } → [NamedExportSpecifier { orig: "foo" }, NamedExportSpecifier { orig: "bar", exported: "baz" }]
   */
  getNamedSpecifiers(): DeclarationTerminalQuery<NamedExportSpecifier>;

  /**
   * Iterates `selection`, filters `ExportNamedDeclaration.specifiers` whose `type === "ExportNamespaceSpecifier"`,
   * and returns the flattened list of `ExportNamespaceSpecifier` nodes as the new selection.
   * @example export * as ns from './mod' → ExportNamespaceSpecifier { name: "ns" }
   */
  getNamespaceSpecifiers(): DeclarationTerminalQuery<ExportNamespaceSpecifier>;

  /**
   * Iterates `selection`, filters `ExportNamedDeclaration.specifiers` whose `type === "ExportDefaultSpecifier"`,
   * and returns the flattened list of `ExportDefaultSpecifier` nodes as the new selection.
   * @example export foo from './mod' → ExportDefaultSpecifier { exported: Identifier("foo") }
   */
  getDefaultSpecifiers(): DeclarationTerminalQuery<ExportDefaultSpecifier>;
}

export interface VariableDeclarationQuery extends DeclarationFluentQuery<VariableDeclaration> {
  readonly ast: Module;
  readonly selection: VariableDeclaration[];

  /**
   * Filters `selection` to `VariableDeclaration` nodes whose `kind === "var"`,
   * and returns them as the new selection.
   * @example var x = 1 → VariableDeclaration { kind: "var", declarations: [...] }
   */
  filterVar(): VariableDeclarationQuery;

  /**
   * Filters `selection` to `VariableDeclaration` nodes whose `kind === "let"`,
   * and returns them as the new selection.
   * @example let x = 1 → VariableDeclaration { kind: "let", declarations: [...] }
   */
  filterLet(): VariableDeclarationQuery;

  /**
   * Filters `selection` to `VariableDeclaration` nodes whose `kind === "const"`,
   * and returns them as the new selection.
   * @example const x = 1 → VariableDeclaration { kind: "const", declarations: [...] }
   */
  filterConst(): VariableDeclarationQuery;

  /**
   * Iterates `selection`, collects `VariableDeclaration.declarations` from each node,
   * and returns the flattened list of `VariableDeclarator` nodes as the new selection.
   * @example const a = 1, b = 2 → [VariableDeclarator { id: "a", init: 1 }, VariableDeclarator { id: "b", init: 2 }]
   */
  getDeclarators(): DeclarationTerminalQuery<VariableDeclarator>;
}

/**
 * Fluent query over top-level class declarations selected from a module.
 * Use it to inspect class members after narrowing by name, kind, or predicate.
 * It exposes constructors, methods, properties, private members, static blocks, index signatures, and decorators.
 */
export interface ClassDeclarationQuery extends DeclarationFluentQuery<ClassDeclaration> {
  readonly ast: Module;
  readonly selection: ClassDeclaration[];

  /**
   * Iterates `selection`, collects `ClassDeclaration.body` members of type `Constructor`,
   * and returns them as the new selection. Each class has at most one constructor.
   * @example constructor(private x: number) {} → Constructor { params: [...], body: BlockStatement }
   */
  getConstructors(): DeclarationTerminalQuery<Constructor>;

  /**
   * Iterates `selection`, filters `ClassDeclaration.body` members whose `type === "ClassMethod"`,
   * and returns them as the new selection.
   * @example foo() {} / get bar() {} / set bar(v) {} → ClassMethod { key, function, kind, isStatic, accessibility }
   */
  getClassMethods(): DeclarationTerminalQuery<ClassMethod>;

  /**
   * Iterates `selection`, filters `ClassDeclaration.body` members whose `type === "PrivateMethod"`,
   * and returns them as the new selection.
   * @example #foo() {} → PrivateMethod { key: PrivateName, function, kind, isStatic }
   */
  getPrivateMethods(): DeclarationTerminalQuery<PrivateMethod>;

  /**
   * Iterates `selection`, filters `ClassDeclaration.body` members whose `type === "ClassProperty"`,
   * and returns them as the new selection.
   * @example foo = 1 / static bar: string → ClassProperty { key, value, typeAnnotation, isStatic, accessibility }
   */
  getClassProperties(): DeclarationTerminalQuery<ClassProperty>;

  /**
   * Iterates `selection`, filters `ClassDeclaration.body` members whose `type === "PrivateProperty"`,
   * and returns them as the new selection.
   * @example #foo = 1 → PrivateProperty { key: PrivateName, value, typeAnnotation, isStatic }
   */
  getPrivateProperties(): DeclarationTerminalQuery<PrivateProperty>;

  /**
   * Iterates `selection`, filters `ClassDeclaration.body` members whose `type === "StaticBlock"`,
   * and returns them as the new selection.
   * @example static { this.x = 1 } → StaticBlock { body: BlockStatement }
   */
  getStaticBlocks(): DeclarationTerminalQuery<StaticBlock>;

  /**
   * Iterates `selection`, filters `ClassDeclaration.body` members whose `type === "TsIndexSignature"`,
   * and returns them as the new selection.
   * @example [key: string]: number → TsIndexSignature { params, typeAnnotation, isStatic, readonly }
   */
  getTsIndexSignatures(): DeclarationTerminalQuery<TsIndexSignature>;

  /**
   * Iterates `selection`, collects `ClassDeclaration.decorators` from each class,
   * and returns the flattened list of `Decorator` nodes as the new selection.
   * Use this to inspect annotations such as `@sealed` or `@entity("user")`.
   * When present, the terminal query matches `@foo` and `@foo(...)` by `foo`.
   * @example @sealed class Foo {} → [Decorator { expression: Identifier("sealed") }]
   */
  getDecorators(): DeclarationTerminalQuery<Decorator>;
}

export interface FunctionDeclarationQuery extends DeclarationFluentQuery<FunctionDeclaration> {
  readonly ast: Module;
  readonly selection: FunctionDeclaration[];

  /**
   * Iterates `selection`, collects `Fn.params` from each `FunctionDeclaration`,
   * and returns the flattened list of `Param` nodes as the new selection.
   * @example function foo(a: string, b: number) → [Param { pat: "a" }, Param { pat: "b" }]
   */
  getParams(): DeclarationTerminalQuery<Param>;

  /**
   * Iterates `selection`, collects `HasDecorator.decorators` from each `FunctionDeclaration`,
   * and returns the flattened list of `Decorator` nodes as the new selection.
   * @example @sealed function foo() {} → [Decorator { expression: Identifier("sealed") }]
   */
  getDecorators(): DeclarationTerminalQuery<Decorator>;

  /**
   * Iterates `selection`, reads `Fn.typeParameters.parameters` from each `FunctionDeclaration`,
   * and returns the flattened list of `TsTypeParameter` nodes as the new selection.
   * Skips functions with no `typeParameters`.
   * @example function foo<T extends string, U = number>() {} → [TsTypeParameter { name: "T", constraint }, TsTypeParameter { name: "U", default }]
   */
  getTypeParameters(): DeclarationTerminalQuery<TsTypeParameter>;
}

export interface ExportDeclarationQuery extends DeclarationFluentQuery<ExportDeclaration> {
  readonly ast: Module;
  readonly selection: ExportDeclaration[];

  /**
   * Filters `selection` to `ExportDeclaration` nodes whose `declaration` is a `ClassDeclaration`,
   * then unwraps and returns those inner `ClassDeclaration` nodes as the new selection.
   * @example export class Foo {} → ClassDeclaration { id: "Foo", ... }
   */
  getClassDeclarations(): ClassDeclarationQuery;

  /**
   * Filters `selection` to `ExportDeclaration` nodes whose `declaration` is a `FunctionDeclaration`,
   * then unwraps and returns those inner `FunctionDeclaration` nodes as the new selection.
   * @example export function foo() {} → FunctionDeclaration { identifier: "foo", ... }
   */
  getFunctionDeclarations(): FunctionDeclarationQuery;

  /**
   * Filters `selection` to `ExportDeclaration` nodes whose `declaration` is a `VariableDeclaration`,
   * then unwraps and returns those inner `VariableDeclaration` nodes as the new selection.
   * @example export const foo = 1 → VariableDeclaration { kind: "const", declarations: [...] }
   */
  getVariableDeclarations(): VariableDeclarationQuery;

  /**
   * Filters `selection` to `ExportDeclaration` nodes whose `declaration` is a `TsInterfaceDeclaration`,
   * then unwraps and returns those inner `TsInterfaceDeclaration` nodes as the new selection.
   * @example export interface Foo {} → TsInterfaceDeclaration { id: "Foo", ... }
   */
  getTsInterfaceDeclarations(): DeclarationTerminalQuery<TsInterfaceDeclaration>;

  /**
   * Filters `selection` to `ExportDeclaration` nodes whose `declaration` is a `TsTypeAliasDeclaration`,
   * then unwraps and returns those inner `TsTypeAliasDeclaration` nodes as the new selection.
   * @example export type Foo = string → TsTypeAliasDeclaration { id: "Foo", ... }
   */
  getTsTypeAliasDeclarations(): DeclarationTerminalQuery<TsTypeAliasDeclaration>;

  /**
   * Filters `selection` to `ExportDeclaration` nodes whose `declaration` is a `TsEnumDeclaration`,
   * then unwraps and returns those inner `TsEnumDeclaration` nodes as the new selection.
   * @example export enum Foo { A, B } → TsEnumDeclaration { id: "Foo", members: [...] }
   */
  getTsEnumDeclarations(): DeclarationTerminalQuery<TsEnumDeclaration>;

  /**
   * Filters `selection` to `ExportDeclaration` nodes whose `declaration` is a `TsModuleDeclaration`,
   * then unwraps and returns those inner `TsModuleDeclaration` nodes as the new selection.
   * @example export namespace Foo {} → TsModuleDeclaration { id: "Foo", ... }
   */
  getTsModuleDeclarations(): DeclarationTerminalQuery<TsModuleDeclaration>;
}

export interface ImportDeclarationQuery extends DeclarationFluentQuery<ImportDeclaration> {
  readonly ast: Module;
  readonly selection: ImportDeclaration[];

  /**
   * Filters `selection` to `ImportDeclaration` nodes whose `typeOnly === true`,
   * and returns them as the new selection.
   * @example import type { Foo } from './mod' → ImportDeclaration { typeOnly: true, ... }
   */
  filterTypeOnly(): ImportDeclarationQuery;

  /**
   * Filters `selection` to `ImportDeclaration` nodes whose `source.value` matches `source`,
   * and returns them as the new selection.
   * @example filterBySource('./utils') → matches `import { foo } from './utils'`
   */
  filterBySource(source: string): ImportDeclarationQuery;

  /**
   * Iterates `selection`, filters `ImportDeclaration.specifiers` whose `type === "ImportSpecifier"`,
   * and returns the flattened list of `NamedImportSpecifier` nodes as the new selection.
   * @example import { foo, bar as baz } from './mod' → [NamedImportSpecifier { local: "foo" }, NamedImportSpecifier { local: "baz", imported: "bar" }]
   */
  getNamedSpecifiers(): DeclarationTerminalQuery<NamedImportSpecifier>;

  /**
   * Iterates `selection`, filters `ImportDeclaration.specifiers` whose `type === "ImportDefaultSpecifier"`,
   * and returns the flattened list of `ImportDefaultSpecifier` nodes as the new selection.
   * @example import Foo from './mod' → [ImportDefaultSpecifier { local: "Foo" }]
   */
  getDefaultSpecifiers(): DeclarationTerminalQuery<ImportDefaultSpecifier>;

  /**
   * Iterates `selection`, filters `ImportDeclaration.specifiers` whose `type === "ImportNamespaceSpecifier"`,
   * and returns the flattened list of `ImportNamespaceSpecifier` nodes as the new selection.
   * @example import * as ns from './mod' → [ImportNamespaceSpecifier { local: "ns" }]
   */
  getNamespaceSpecifiers(): DeclarationTerminalQuery<ImportNamespaceSpecifier>;
}

export interface ExportDefaultDeclarationQuery extends DeclarationFluentQuery<ExportDefaultDeclaration> {
  readonly ast: Module;
  readonly selection: ExportDefaultDeclaration[];

  /**
   * Filters `selection` to `ExportDefaultDeclaration` nodes whose `decl` is a `ClassExpression`,
   * then unwraps and returns those inner `ClassExpression` nodes as the new selection.
   * @example export default class Foo {} → ClassExpression { identifier: "Foo", body: [...] }
   */
  getClassExpressions(): DeclarationTerminalQuery<ClassExpression>;

  /**
   * Filters `selection` to `ExportDefaultDeclaration` nodes whose `decl` is a `FunctionExpression`,
   * then unwraps and returns those inner `FunctionExpression` nodes as the new selection.
   * @example export default function foo() {} → FunctionExpression { identifier: "foo", params: [...] }
   */
  getFunctionExpressions(): DeclarationTerminalQuery<FunctionExpression>;

  /**
   * Filters `selection` to `ExportDefaultDeclaration` nodes whose `decl` is a `TsInterfaceDeclaration`,
   * then unwraps and returns those inner `TsInterfaceDeclaration` nodes as the new selection.
   * @example export default interface Foo {} → TsInterfaceDeclaration { id: "Foo", body: [...] }
   */
  getTsInterfaceDeclarations(): DeclarationTerminalQuery<TsInterfaceDeclaration>;
}


export interface ExportAllDeclarationQuery extends DeclarationFluentQuery<ExportAllDeclaration> {
  readonly ast: Module;
  readonly selection: ExportAllDeclaration[];

  /**
   * Filters `selection` to `ExportAllDeclaration` nodes whose `source.value` matches `source`,
   * and returns them as the new selection.
   * @example filterBySource('./utils') → matches `export * from './utils'`
   */
  filterBySource(source: string): ExportAllDeclarationQuery;
}
