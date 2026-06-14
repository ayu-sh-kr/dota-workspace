import {
  Module
} from "@swc/core";
import type {
  ClassDeclarationQuery, ExportAllDeclarationQuery,
  ExportDeclarationQuery, ExportDefaultDeclarationQuery,
  ExportNamedDeclarationQuery,
  FunctionDeclarationQuery,
  ImportDeclarationQuery,
  VariableDeclarationQuery,
} from "@dota/query/contracts/DeclarationFluentQuery.ts";

export interface DeclarationBaseQuery {
  ast: Module;

  /**
   * Collects all import statements from the module body and returns them as a fluent query.
   * This is the entry point for narrowing down by imported bindings, default imports, or module imports.
   * Use it when you want to inspect what a file pulls in from other modules.
   * @example import { foo } from './mod' → query over that import statement
   */
  getImportDeclarations(): ImportDeclarationQuery;

  /**
   * Collects `export class`, `export function`, and `export const` declarations from the module body.
   * These are exports that wrap a real declaration node, not re-export lists or default exports.
   * Use this when you need to inspect the declared symbol itself and then narrow by its inner node.
   * @example export class Foo {} → query over the wrapped class declaration
   */
  getExportDeclarations(): ExportDeclarationQuery;

  /**
   * Collects named export lists such as `export { foo }` or `export { foo } from './mod'`.
   * These nodes describe exported bindings directly, whether they are local exports or re-exports.
   * Use this when you need the specifier list rather than a wrapped declaration node.
   * @example export { foo, bar as baz } from './mod' → query over the named export list
   */
  getExportNamedDeclarations(): ExportNamedDeclarationQuery;

  /**
   * Collects default export statements from the module body and returns them as a query.
   * Use this for `export default ...` forms, including default classes, functions, and interfaces.
   * The query lets you inspect the exported value before narrowing to its concrete shape.
   * @example export default class Foo {} → query over the default export node
   */
  getExportDefaultDeclarations(): ExportDefaultDeclarationQuery;

  /**
   * Collects `export * from ...` statements from the module body and returns them as a query.
   * Each item represents a module re-export and exposes the imported module path through `source`.
   * Use this when you want to reason about barrel files or package re-export surfaces.
   * @example export * from './mod' → query over that re-export source
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
