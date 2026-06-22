import type {Module, ModuleItem} from "@swc/core";
import type {DeclarationBaseQuery} from "../contracts/DeclarationBaseQuery.ts";
import type {
  ClassDeclarationQuery,
  ExportAllDeclarationQuery,
  ExportDeclarationQuery,
  ExportDefaultDeclarationQuery,
  ExportNamedDeclarationQuery,
  FunctionDeclarationQuery,
  ImportDeclarationQuery,
  VariableDeclarationQuery,
} from "../contracts/DeclarationFluentQuery.ts";
import {DeclarationUtils} from "../../utils/DeclarationUtils.ts";
import {ClassDeclarationQueryImpl} from "./ClassDeclarationQueryImpl";
import {ExportAllDeclarationQueryImpl} from "./ExportAllDeclarationQueryImpl";
import {ExportDeclarationQueryImpl} from "./ExportDeclarationQueryImpl";
import {ExportDefaultDeclarationQueryImpl} from "./ExportDefaultDeclarationQueryImpl";
import {ExportNamedDeclarationQueryImpl} from "./ExportNamedDeclarationQueryImpl";
import {FunctionDeclarationQueryImpl} from "./FunctionDeclarationQueryImpl";
import {ImportDeclarationQueryImpl} from "./ImportDeclarationQueryImpl";
import {VariableDeclarationQueryImpl} from "./VariableDeclarationQueryImpl";


export class DeclarationBaseQueryImpl implements DeclarationBaseQuery {

  constructor(readonly ast: Module) { }

  private declarations<T extends ModuleItem>(type: T["type"]): T[] {
    return DeclarationUtils.extractDeclarations<T>(this.ast.body, type);
  }

  getImportDeclarations(): ImportDeclarationQuery {
    return new ImportDeclarationQueryImpl(this.ast, this.declarations("ImportDeclaration"));
  }

  getExportDeclarations(): ExportDeclarationQuery {
    return new ExportDeclarationQueryImpl(this.ast, this.declarations("ExportDeclaration"));
  }

  getExportNamedDeclarations(): ExportNamedDeclarationQuery {
    return new ExportNamedDeclarationQueryImpl(this.ast, this.declarations("ExportNamedDeclaration"));
  }

  getExportDefaultDeclarations(): ExportDefaultDeclarationQuery {
    return new ExportDefaultDeclarationQueryImpl(this.ast, this.declarations("ExportDefaultDeclaration"));
  }

  getExportAllDeclarations(): ExportAllDeclarationQuery {
    return new ExportAllDeclarationQueryImpl(this.ast, this.declarations("ExportAllDeclaration"));
  }

  getClassDeclarations(): ClassDeclarationQuery {
    return new ClassDeclarationQueryImpl(this.ast, this.declarations("ClassDeclaration"));
  }

  getFunctionDeclarations(): FunctionDeclarationQuery {
    return new FunctionDeclarationQueryImpl(this.ast, this.declarations("FunctionDeclaration"));
  }

  getVariableDeclarations(): VariableDeclarationQuery {
    return new VariableDeclarationQueryImpl(this.ast, this.declarations("VariableDeclaration"));
  }

}
