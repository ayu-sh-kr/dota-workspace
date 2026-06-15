import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ExportDeclaration, Module, parseSync} from "@swc/core";
import {ExportDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/export-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;
}

function getExportDeclarations(ast: Module): ExportDeclaration[] {
  return ast.body.filter((item): item is ExportDeclaration => item.type === "ExportDeclaration");
}


describe("ExportDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const exports = getExportDeclarations(ast);

  it("loads a shared fixture with multiple export declaration kinds", () => {
    expect(ast.body.some(item => item.type === "ExportDefaultDeclaration")).toBe(true);
    expect(ast.body.some(item => item.type === "ExportNamedDeclaration")).toBe(true);
    expect(ast.body.some(item => item.type === "ExportAllDeclaration")).toBe(true);
  });

  it("extracts only export declarations from the shared fixture", () => {
    expect(exports).toHaveLength(12);
    expect(exports.map(item => item.declaration.type)).toEqual([
      "ClassDeclaration",
      "FunctionDeclaration",
      "FunctionDeclaration",
      "VariableDeclaration",
      "VariableDeclaration",
      "VariableDeclaration",
      "VariableDeclaration",
      "VariableDeclaration",
      "TsInterfaceDeclaration",
      "TsTypeAliasDeclaration",
      "TsEnumDeclaration",
      "TsModuleDeclaration",
    ]);
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new ExportDeclarationQueryImpl(ast, exports);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(exports);
    expect(query.count()).toBe(12);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(exports[0]);
    expect(query.last()).toBe(exports[11]);
    expect(query.at(2)).toBe(exports[2]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(exports);
    expect(query.toArray()).not.toBe(exports);
  });

  it("finds wrapped declarations by declared name", () => {
    const query = new ExportDeclarationQueryImpl(ast, exports);

    expect(query.findByName("ExportedWidget").toArray()).toEqual([exports[0]]);
    expect(query.findByName("buildAlphaLabel").toArray()).toEqual([exports[1]]);
    expect(query.findByName("formatLabel").toArray()).toEqual([exports[2]]);
    expect(query.findByName("exportedVersion").toArray()).toEqual([exports[3]]);
    expect(query.findByName("exportedToggle").toArray()).toEqual([exports[4]]);
    expect(query.findByName("exportedCounter").toArray()).toEqual([exports[5]]);
    expect(query.findByName("multiFirst").toArray()).toEqual([exports[6]]);
    expect(query.findByName("multiSecond").toArray()).toEqual([]);
    expect(query.findByName("destructuredLabel").toArray()).toEqual([]);
    expect(query.findByName("ExportedConfig").toArray()).toEqual([exports[8]]);
    expect(query.findByName("ExportedName").toArray()).toEqual([exports[9]]);
    expect(query.findByName("ExportedKind").toArray()).toEqual([exports[10]]);
    expect(query.findByName("ExportedNamespace").toArray()).toEqual([exports[11]]);
    expect(query.findByName("Missing").isEmpty()).toBe(true);
  });

  it("supports filter chaining with a predicate spy", () => {
    const query = new ExportDeclarationQueryImpl(ast, exports);
    const predicate = vi.fn((item: ExportDeclaration) => item.declaration.type === "VariableDeclaration");

    const filtered = query.filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(12);
    expect(predicate).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(predicate).toHaveBeenNthCalledWith(12, exports[11], 11, exports);
    expect(filtered.count()).toBe(5);
    expect(filtered.findByName("exportedVersion").toArray()).toEqual([exports[3]]);
  });

  it("unwraps class, function, variable, and TypeScript declarations", () => {
    const query = new ExportDeclarationQueryImpl(ast, exports);

    const classQuery = query.getClassDeclarations();
    const functionQuery = query.getFunctionDeclarations();
    const variableQuery = query.getVariableDeclarations();
    const interfaceQuery = query.getTsInterfaceDeclarations();
    const typeAliasQuery = query.getTsTypeAliasDeclarations();
    const enumQuery = query.getTsEnumDeclarations();
    const moduleQuery = query.getTsModuleDeclarations();

    expect(classQuery.toArray()).toEqual([exports[0].declaration]);
    expect(functionQuery.toArray()).toEqual([exports[1].declaration, exports[2].declaration]);
    expect(variableQuery.toArray()).toEqual([
      exports[3].declaration,
      exports[4].declaration,
      exports[5].declaration,
      exports[6].declaration,
      exports[7].declaration,
    ]);
    expect(variableQuery.map(item => item.declarations.length)).toEqual([1, 1, 1, 2, 1]);
    expect(interfaceQuery.toArray()).toEqual([exports[8].declaration]);
    expect(typeAliasQuery.toArray()).toEqual([exports[9].declaration]);
    expect(enumQuery.toArray()).toEqual([exports[10].declaration]);
    expect(moduleQuery.toArray()).toEqual([exports[11].declaration]);
  });

  it("passes each item and index to forEach and map", () => {
    const query = new ExportDeclarationQueryImpl(ast, exports);
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: ExportDeclaration, index: number) => `${index}:${item.declaration.type}`);

    query.forEach(forEachCallback);

    expect(forEachCallback).toHaveBeenCalledTimes(12);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(forEachCallback).toHaveBeenNthCalledWith(12, exports[11], 11, exports);

    expect(query.map(mapCallback)).toEqual([
      "0:ClassDeclaration",
      "1:FunctionDeclaration",
      "2:FunctionDeclaration",
      "3:VariableDeclaration",
      "4:VariableDeclaration",
      "5:VariableDeclaration",
      "6:VariableDeclaration",
      "7:VariableDeclaration",
      "8:TsInterfaceDeclaration",
      "9:TsTypeAliasDeclaration",
      "10:TsEnumDeclaration",
      "11:TsModuleDeclaration",
    ]);
    expect(mapCallback).toHaveBeenCalledTimes(12);
    expect(mapCallback).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(mapCallback).toHaveBeenNthCalledWith(12, exports[11], 11, exports);
  });

  it("returns empty queries for missing names and empty selections", () => {
    const query = new ExportDeclarationQueryImpl(ast, exports);
    const emptyQuery = new ExportDeclarationQueryImpl(ast, []);

    expect(query.findByName("DoesNotExist").isEmpty()).toBe(true);
    expect(query.findByName("DoesNotExist").toArray()).toEqual([]);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyQuery.getClassDeclarations().isEmpty()).toBe(true);
    expect(emptyQuery.getVariableDeclarations().toArray()).toEqual([]);
  });

  it("returns a shallow copy from toArray", () => {
    const query = new ExportDeclarationQueryImpl(ast, exports);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(11);
    expect(query.toArray()).toHaveLength(12);
    expect(query.last()).toBe(exports[11]);
  });
});
