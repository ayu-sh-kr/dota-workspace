import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ImportDeclaration, Module, parseSync} from "@swc/core";
import {ImportDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/export-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;
}

function getImportDeclarations(ast: Module): ImportDeclaration[] {
  return ast.body.filter((item): item is ImportDeclaration => item.type === "ImportDeclaration");
}


describe("ImportDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const imports = getImportDeclarations(ast);

  it("loads the shared fixture with default, named, namespace, type-only, and side-effect imports", () => {
    expect(imports).toHaveLength(6);
    expect(imports.map(item => ({
      typeOnly: item.typeOnly ?? false,
      source: item.source.value,
      specifiers: item.specifiers.map(specifier => specifier.type),
    }))).toEqual([
      {
        typeOnly: false,
        source: "./delta",
        specifiers: ["ImportDefaultSpecifier"],
      },
      {
        typeOnly: false,
        source: "./alpha",
        specifiers: ["ImportSpecifier"],
      },
      {
        typeOnly: false,
        source: "./delta",
        specifiers: ["ImportSpecifier", "ImportSpecifier"],
      },
      {
        typeOnly: false,
        source: "./beta",
        specifiers: ["ImportNamespaceSpecifier"],
      },
      {
        typeOnly: true,
        source: "./delta",
        specifiers: ["ImportSpecifier"],
      },
      {
        typeOnly: false,
        source: "./gamma",
        specifiers: [],
      },
    ]);
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new ImportDeclarationQueryImpl(ast, imports);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(imports);
    expect(query.count()).toBe(6);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(imports[0]);
    expect(query.last()).toBe(imports[5]);
    expect(query.at(2)).toBe(imports[2]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(imports);
    expect(query.toArray()).not.toBe(imports);
  });

  it("filters by source path and type-only imports", () => {
    const query = new ImportDeclarationQueryImpl(ast, imports);

    expect(query.findByName("./delta").toArray()).toEqual([imports[0], imports[2], imports[4]]);
    expect(query.filterBySource("./alpha").toArray()).toEqual([imports[1]]);
    expect(query.filterBySource("./gamma").toArray()).toEqual([imports[5]]);
    expect(query.filterBySource("./missing").toArray()).toEqual([]);
    expect(query.filterTypeOnly().toArray()).toEqual([imports[4]]);
  });

  it("supports predicate filtering with call verification", () => {
    const query = new ImportDeclarationQueryImpl(ast, imports);
    const predicate = vi.fn((item: ImportDeclaration) => item.specifiers.length > 0);

    const filtered = query.filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(6);
    expect(predicate).toHaveBeenNthCalledWith(1, imports[0], 0, imports);
    expect(predicate).toHaveBeenNthCalledWith(6, imports[5], 5, imports);
    expect(filtered.toArray()).toEqual([imports[0], imports[1], imports[2], imports[3], imports[4]]);
  });

  it("flattens named, default, and namespace specifiers from the selection", () => {
    const query = new ImportDeclarationQueryImpl(ast, imports);
    const namedSpecifiers = query.getNamedSpecifiers();
    const defaultSpecifiers = query.getDefaultSpecifiers();
    const namespaceSpecifiers = query.getNamespaceSpecifiers();

    expect(namedSpecifiers.count()).toBe(4);
    expect(namedSpecifiers.findByName("alphaLabel").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("deltaValue").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("deltaAlias").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("DeltaOptions").toArray()).toHaveLength(1);
    expect(namedSpecifiers.findByName("missing").toArray()).toEqual([]);

    expect(defaultSpecifiers.count()).toBe(1);
    expect(defaultSpecifiers.findByName("DeltaWidget").toArray()).toHaveLength(1);
    expect(defaultSpecifiers.findByName("missing").toArray()).toEqual([]);

    expect(namespaceSpecifiers.count()).toBe(1);
    expect(namespaceSpecifiers.findByName("betaNS").toArray()).toHaveLength(1);
    expect(namespaceSpecifiers.findByName("missing").toArray()).toEqual([]);
  });

  it("preserves empty specifier results for side-effect-only imports", () => {
    const query = new ImportDeclarationQueryImpl(ast, imports);
    const sideEffectQuery = query.filterBySource("./gamma");

    expect(sideEffectQuery.count()).toBe(1);
    expect(sideEffectQuery.getNamedSpecifiers().toArray()).toEqual([]);
    expect(sideEffectQuery.getDefaultSpecifiers().toArray()).toEqual([]);
    expect(sideEffectQuery.getNamespaceSpecifiers().toArray()).toEqual([]);
  });

  it("passes each item and index to forEach and map", () => {
    const query = new ImportDeclarationQueryImpl(ast, imports);
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: ImportDeclaration, index: number) => `${index}:${item.source.value}`);

    query.forEach(forEachCallback);

    expect(forEachCallback).toHaveBeenCalledTimes(6);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, imports[0], 0, imports);
    expect(forEachCallback).toHaveBeenNthCalledWith(6, imports[5], 5, imports);

    expect(query.map(mapCallback)).toEqual([
      "0:./delta",
      "1:./alpha",
      "2:./delta",
      "3:./beta",
      "4:./delta",
      "5:./gamma",
    ]);
    expect(mapCallback).toHaveBeenCalledTimes(6);
    expect(mapCallback).toHaveBeenNthCalledWith(1, imports[0], 0, imports);
    expect(mapCallback).toHaveBeenNthCalledWith(6, imports[5], 5, imports);
  });

  it("handles empty selections and missing lookups", () => {
    const emptyQuery = new ImportDeclarationQueryImpl(ast, []);

    expect(emptyQuery.isEmpty()).toBe(true);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyQuery.findByName("./missing").toArray()).toEqual([]);
    expect(emptyQuery.filterTypeOnly().toArray()).toEqual([]);
    expect(emptyQuery.filterBySource("./missing").toArray()).toEqual([]);
    expect(emptyQuery.getNamedSpecifiers().toArray()).toEqual([]);
    expect(emptyQuery.getDefaultSpecifiers().toArray()).toEqual([]);
    expect(emptyQuery.getNamespaceSpecifiers().toArray()).toEqual([]);
    expect(emptyQuery.map(() => "x")).toEqual([]);
    expect(emptyQuery.forEach(() => undefined)).toBeUndefined();
  });

  it("returns a shallow copy from toArray", () => {
    const query = new ImportDeclarationQueryImpl(ast, imports);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(5);
    expect(query.toArray()).toHaveLength(6);
    expect(query.last()).toBe(imports[5]);
  });
});
