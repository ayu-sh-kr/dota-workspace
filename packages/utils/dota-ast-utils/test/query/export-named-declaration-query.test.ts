import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ExportNamedDeclaration, Module, parseSync} from "@swc/core";
import {ExportNamedDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/export-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;
}

function getExportNamedDeclarations(ast: Module): ExportNamedDeclaration[] {
  return ast.body.filter((item): item is ExportNamedDeclaration => item.type === "ExportNamedDeclaration");
}


describe("ExportNamedDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const exports = getExportNamedDeclarations(ast);

  it("loads the shared fixture with local exports, re-exports, and type-only exports", () => {
    expect(exports).toHaveLength(4);
    expect(exports.map(item => ({
      typeOnly: item.typeOnly ?? false,
      source: item.source?.value ?? null,
      specifiers: item.specifiers.map(specifier => specifier.type),
    }))).toEqual([
      {
        typeOnly: false,
        source: null,
        specifiers: ["ExportSpecifier"],
      },
      {
        typeOnly: true,
        source: null,
        specifiers: ["ExportSpecifier"],
      },
      {
        typeOnly: false,
        source: "./alpha",
        specifiers: ["ExportSpecifier"],
      },
      {
        typeOnly: false,
        source: "./beta",
        specifiers: ["ExportNamespaceSpecifier"],
      },
    ]);
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new ExportNamedDeclarationQueryImpl(ast, exports);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(exports);
    expect(query.count()).toBe(4);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(exports[0]);
    expect(query.last()).toBe(exports[3]);
    expect(query.at(1)).toBe(exports[1]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(exports);
    expect(query.toArray()).not.toBe(exports);
  });

  it("finds named exports by source path and keeps local exports separate", () => {
    const query = new ExportNamedDeclarationQueryImpl(ast, exports);

    expect(query.findByName("./alpha").toArray()).toEqual([exports[2]]);
    expect(query.findByName("./beta").toArray()).toEqual([exports[3]]);
    expect(query.findByName("./missing").toArray()).toEqual([]);
    expect(query.filterLocalExports().toArray()).toEqual([exports[0], exports[1]]);
    expect(query.filterReExports().toArray()).toEqual([exports[2], exports[3]]);
    expect(query.filterTypeOnly().toArray()).toEqual([exports[1]]);
  });

  it("supports predicate filtering with call verification", () => {
    const query = new ExportNamedDeclarationQueryImpl(ast, exports);
    const predicate = vi.fn((item: ExportNamedDeclaration) => item.typeOnly === true);

    const filtered = query.filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(4);
    expect(predicate).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(predicate).toHaveBeenNthCalledWith(4, exports[3], 3, exports);
    expect(filtered.toArray()).toEqual([exports[1]]);
  });

  it("flattens named and namespace specifiers from the selection", () => {
    const query = new ExportNamedDeclarationQueryImpl(ast, exports);
    const namedSpecifiers = query.getNamedSpecifiers();
    const namespaceSpecifiers = query.getNamespaceSpecifiers();
    const defaultSpecifiers = query.getDefaultSpecifiers();

    expect(namedSpecifiers.count()).toBe(3);
    expect(namedSpecifiers.toArray().map(specifier => specifier.type)).toEqual([
      "ExportSpecifier",
      "ExportSpecifier",
      "ExportSpecifier",
    ]);
    expect(namedSpecifiers.findByName("buildAlphaLabel").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("namedBuild").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("ExportedName").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("ExportedNameAlias").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("alphaAlias").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("missing").toArray()).toEqual([]);

    expect(namespaceSpecifiers.count()).toBe(1);
    expect(namespaceSpecifiers.first()?.type).toBe("ExportNamespaceSpecifier");
    expect(namespaceSpecifiers.findByName("betaNamespace").toArray()).toHaveLength(1);

    expect(defaultSpecifiers.isEmpty()).toBe(true);
    expect(defaultSpecifiers.toArray()).toEqual([]);
  });

  it("passes each item and index to forEach and map", () => {
    const query = new ExportNamedDeclarationQueryImpl(ast, exports);
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: ExportNamedDeclaration, index: number) => `${index}:${item.source?.value ?? "local"}`);

    query.forEach(forEachCallback);

    expect(forEachCallback).toHaveBeenCalledTimes(4);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(forEachCallback).toHaveBeenNthCalledWith(4, exports[3], 3, exports);

    expect(query.map(mapCallback)).toEqual([
      "0:local",
      "1:local",
      "2:./alpha",
      "3:./beta",
    ]);
    expect(mapCallback).toHaveBeenCalledTimes(4);
    expect(mapCallback).toHaveBeenNthCalledWith(1, exports[0], 0, exports);
    expect(mapCallback).toHaveBeenNthCalledWith(4, exports[3], 3, exports);
  });

  it("handles empty selections and missing lookups", () => {
    const emptyQuery = new ExportNamedDeclarationQueryImpl(ast, []);

    expect(emptyQuery.isEmpty()).toBe(true);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyQuery.findByName("./missing").toArray()).toEqual([]);
    expect(emptyQuery.filterTypeOnly().toArray()).toEqual([]);
    expect(emptyQuery.filterLocalExports().toArray()).toEqual([]);
    expect(emptyQuery.getNamedSpecifiers().toArray()).toEqual([]);
    expect(emptyQuery.getNamespaceSpecifiers().toArray()).toEqual([]);
    expect(emptyQuery.getDefaultSpecifiers().toArray()).toEqual([]);
    expect(emptyQuery.map(() => "x")).toEqual([]);
    expect(emptyQuery.forEach(() => undefined)).toBeUndefined();
  });

  it("returns a shallow copy from toArray", () => {
    const query = new ExportNamedDeclarationQueryImpl(ast, exports);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(3);
    expect(query.toArray()).toHaveLength(4);
    expect(query.last()).toBe(exports[3]);
  });
});
