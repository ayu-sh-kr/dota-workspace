import {
  ClassDeclaration,
  ExportAllDeclaration,
  ExportDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  FunctionDeclaration,
  ImportDeclaration,
  Module,
  TsEnumDeclaration,
  TsInterfaceDeclaration,
  TsModuleDeclaration,
  TsTypeAliasDeclaration,
  VariableDeclaration,
} from "@swc/core";
import {
  ClassDeclarationQuery,
  ExportDeclarationQuery, FunctionDeclarationQuery,
  VariableDeclarationQuery
} from "@dota/query/contracts/DeclarationFluentQuery.ts";

export interface DeclarationBaseQuery<T = Module> {
  ast: Module;

  // Module declarations
  getImportDeclarations(): DeclarationBaseQuery<ImportDeclaration>;
  getExportDeclarations(): ExportDeclarationQuery<ExportDeclaration>;
  getExportNamedDeclarations(): DeclarationBaseQuery<ExportNamedDeclaration>;
  getExportDefaultDeclarations(): DeclarationBaseQuery<ExportDefaultDeclaration>;
  getExportAllDeclarations(): DeclarationBaseQuery<ExportAllDeclaration>;

  // Declarations
  getClassDeclarations(): ClassDeclarationQuery<ClassDeclaration>;
  getFunctionDeclarations(): FunctionDeclarationQuery<FunctionDeclaration>;
  getVariableDeclarations(): VariableDeclarationQuery<VariableDeclaration>;
  getTsInterfaceDeclarations(): DeclarationBaseQuery<TsInterfaceDeclaration>;
  getTsTypeAliasDeclarations(): DeclarationBaseQuery<TsTypeAliasDeclaration>;
  getTsEnumDeclarations(): DeclarationBaseQuery<TsEnumDeclaration>;
  getTsModuleDeclarations(): DeclarationBaseQuery<TsModuleDeclaration>;
}