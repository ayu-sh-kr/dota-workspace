import {
  Module,
  TsEnumDeclaration,
  TsInterfaceDeclaration,
  TsModuleDeclaration,
  TsTypeAliasDeclaration,

} from "@swc/core";
import {
  ClassDeclarationQuery, ExportAllDeclarationQuery,
  ExportDeclarationQuery, ExportDefaultDeclarationQuery,
  ExportNamedDeclarationQuery,
  FunctionDeclarationQuery,
  ImportDeclarationQuery,
  VariableDeclarationQuery,
} from "@dota/query/contracts/DeclarationFluentQuery.ts";

export interface DeclarationBaseQuery<T = Module> {
  ast: Module;

  /**
   * Collects all `ImportDeclaration` nodes from the module body and returns them as a fluent query.
   * @example import { foo } from './mod' → ImportDeclaration { specifiers: [...], source: "./mod" }
   */
  getImportDeclarations(): ImportDeclarationQuery;

  /**
   * Collects all `ExportDeclaration` nodes (`export class/function/const/...`) from the module body
   * and returns them as a fluent query.
   * @example export class Foo {} → ExportDeclaration { declaration: ClassDeclaration }
   */
  getExportDeclarations(): ExportDeclarationQuery;

  /**
   * Collects all `ExportNamedDeclaration` nodes (`export { ... }`) from the module body
   * and returns them as a fluent query.
   * @example export { foo, bar as baz } from './mod' → ExportNamedDeclaration { specifiers: [...] }
   */
  getExportNamedDeclarations(): ExportNamedDeclarationQuery;

  /**
   * Collects all `ExportDefaultDeclaration` nodes from the module body and returns them as a query.
   * @example export default class Foo {} → ExportDefaultDeclaration { decl: ClassExpression }
   */
  getExportDefaultDeclarations(): ExportDefaultDeclarationQuery;

  /**
   * Collects all `ExportAllDeclaration` nodes (`export * from ...`) from the module body
   * and returns them as a query.
   * @example export * from './mod' → ExportAllDeclaration { source: "./mod" }
   */
  getExportAllDeclarations(): ExportAllDeclarationQuery;

  // Declarations

  /**
   * Collects all `ClassDeclaration` nodes from the module body and returns them as a fluent query.
   * @example class Foo extends Bar {} → ClassDeclaration { identifier: "Foo", superClass: "Bar", body: [...] }
   */
  getClassDeclarations(): ClassDeclarationQuery;

  /**
   * Collects all `FunctionDeclaration` nodes from the module body and returns them as a fluent query.
   * @example function foo(a: string): void {} → FunctionDeclaration { identifier: "foo", params: [...] }
   */
  getFunctionDeclarations(): FunctionDeclarationQuery;

  /**
   * Collects all `VariableDeclaration` nodes from the module body and returns them as a fluent query.
   * @example const x = 1, y = 2 → VariableDeclaration { kind: "const", declarations: [...] }
   */
  getVariableDeclarations(): VariableDeclarationQuery;
}