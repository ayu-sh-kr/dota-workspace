import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ExportAllDeclaration, Module, parseSync} from "@swc/core";
import {ExportAllDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/export-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;
}

function getExportAllDeclarations(ast: Module): ExportAllDeclaration[] {
  return ast.body.filter((item): item is ExportAllDeclaration => item.type === "ExportAllDeclaration");
}


describe("ExportAllDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const exports = getExportAllDeclarations(ast);

  it("loads a real file fixture with exported function, class, and const declarations", () => {
    expect(ast.body.some(item => item.type === "ExportDeclaration" && item.declaration.type === "FunctionDeclaration")).toBe(true);
    expect(ast.body.some(item => item.type === "ExportDeclaration" && item.declaration.type === "ClassDeclaration")).toBe(true);
    expect(ast.body.filter(item => item.type === "ExportDeclaration" && item.declaration.type === "VariableDeclaration")).toHaveLength(5);
  });

  it("extracts only export-all declarations from the file fixture", () => {
    expect(exports).toHaveLength(3);
    expect(exports.map(item => item.source.value)).toEqual([
      "./beta",
      "./alpha",
      "./gamma",
    ]);
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new ExportAllDeclarationQueryImpl(ast, exports);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(exports);
    expect(query.count()).toBe(3);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(exports[0]);
    expect(query.last()).toBe(exports[2]);
    expect(query.at(2)).toBe(exports[2]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(exports);
    expect(query.toArray()).not.toBe(exports);
  });

  it("filters by source name and returns a new query that preserves ast", () => {
    const query = new ExportAllDeclarationQueryImpl(ast, exports);

    const alphaQuery = query.findByName("./alpha");

    expect(alphaQuery).toBeInstanceOf(ExportAllDeclarationQueryImpl);
    expect(alphaQuery).not.toBe(query);
    expect(alphaQuery.ast).toBe(ast);
    expect(alphaQuery.toArray()).toEqual([exports[1]]);
    expect(query.toArray()).toEqual(exports);

    const betaQuery = query.filterBySource("./beta");

    expect(betaQuery.toArray()).toEqual([exports[0]]);
    expect(query.toArray()).toEqual(exports);
  });

  it("returns empty queries for names and sources that do not exist", () => {
    const query = new ExportAllDeclarationQueryImpl(ast, exports);

    expect(query.findByName("./missing").isEmpty()).toBe(true);
    expect(query.findByName("./missing").toArray()).toEqual([]);
    expect(query.filterBySource("./missing").isEmpty()).toBe(true);
    expect(query.filterBySource("./missing").first()).toBeNull();
  });

  it("supports chaining with an explicit predicate filter", () => {
    const query = new ExportAllDeclarationQueryImpl(ast, exports);
    const predicate = vi.fn((item: ExportAllDeclaration) => item.source.value === "./alpha");

    const chained = query
      .filterBySource("./alpha")
      .filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(1);
    expect(predicate).toHaveBeenNthCalledWith(1, exports[1], 0, [exports[1]]);
    expect(chained.toArray()).toEqual([exports[1]]);
    expect(chained.ast).toBe(ast);
  });

  it("passes each item and index to forEach and map", () => {
    const query = new ExportAllDeclarationQueryImpl(ast, exports);
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: ExportAllDeclaration, index: number) => `${index}:${item.source.value}`);

    query.forEach(forEachCallback);

    expect(forEachCallback).toHaveBeenCalledTimes(3);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(forEachCallback).toHaveBeenNthCalledWith(2, exports[1], 1, exports);
    expect(forEachCallback).toHaveBeenNthCalledWith(3, exports[2], 2, exports);

    expect(query.map(mapCallback)).toEqual([
      "0:./beta",
      "1:./alpha",
      "2:./gamma",
    ]);
    expect(mapCallback).toHaveBeenCalledTimes(3);
    expect(mapCallback).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(mapCallback).toHaveBeenNthCalledWith(3, exports[2], 2, exports);
  });

  it("handles empty selections and unmatched lookups", () => {
    const emptyQuery = new ExportAllDeclarationQueryImpl(ast, []);
    const emptyFilter = emptyQuery.findByName("./missing");

    expect(emptyQuery.isEmpty()).toBe(true);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyFilter.isEmpty()).toBe(true);
    expect(emptyFilter.toArray()).toEqual([]);
    expect(emptyQuery.map(() => "x")).toEqual([]);
    expect(emptyQuery.forEach(() => undefined)).toBeUndefined();
  });

  it("returns a shallow copy from toArray", () => {
    const query = new ExportAllDeclarationQueryImpl(ast, exports);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(2);
    expect(query.toArray()).toHaveLength(3);
    expect(query.last()).toBe(exports[2]);
  });
});
