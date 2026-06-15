import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ExportDeclaration, FunctionDeclaration, Module, parseSync} from "@swc/core";
import {FunctionDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/export-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;
}

function getFunctionDeclarations(ast: Module): FunctionDeclaration[] {
  return ast.body.filter((item): item is ExportDeclaration & { declaration: FunctionDeclaration } =>
    item.type === "ExportDeclaration" && item.declaration.type === "FunctionDeclaration",
  ).map(item => item.declaration);
}


describe("FunctionDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const functions = getFunctionDeclarations(ast);

  it("loads the shared fixture with exported functions", () => {
    expect(functions).toHaveLength(2);
    expect(functions.map(item => item.identifier.value)).toEqual([
      "buildAlphaLabel",
      "formatLabel",
    ]);
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new FunctionDeclarationQueryImpl(ast, functions);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(functions);
    expect(query.count()).toBe(2);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(functions[0]);
    expect(query.last()).toBe(functions[1]);
    expect(query.at(1)).toBe(functions[1]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(functions);
    expect(query.toArray()).not.toBe(functions);
  });

  it("finds functions by name and supports predicate filtering", () => {
    const query = new FunctionDeclarationQueryImpl(ast, functions);
    const predicate = vi.fn((item: FunctionDeclaration) => item.typeParameters != null);

    expect(query.findByName("buildAlphaLabel").toArray()).toEqual([functions[0]]);
    expect(query.findByName("formatLabel").toArray()).toEqual([functions[1]]);
    expect(query.findByName("missing").toArray()).toEqual([]);

    const filtered = query.filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(2);
    expect(predicate).toHaveBeenNthCalledWith(1, functions[0], 0, functions);
    expect(predicate).toHaveBeenNthCalledWith(2, functions[1], 1, functions);
    expect(filtered.toArray()).toEqual([functions[1]]);
  });

  it("returns params, decorators, and type parameters as terminal queries", () => {
    const query = new FunctionDeclarationQueryImpl(ast, functions);
    const params = query.getParams();
    const decorators = query.getDecorators();
    const typeParameters = query.getTypeParameters();

    expect(params.count()).toBe(2);
    expect(params.map(param => param.pat.type === "Identifier" ? param.pat.value : "other")).toEqual([
      "prefix",
      "suffix",
    ]);
    expect(params.findByName("prefix").toArray()).toEqual([]);
    expect(decorators.isEmpty()).toBe(true);
    expect(decorators.toArray()).toEqual([]);
    expect(typeParameters.count()).toBe(1);
    expect(typeParameters.findByName("T").toArray()).toHaveLength(1);
    expect(typeParameters.findByName("missing").toArray()).toEqual([]);
  });

  it("passes each item and index to forEach and map", () => {
    const query = new FunctionDeclarationQueryImpl(ast, functions);
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: FunctionDeclaration, index: number) => `${index}:${item.identifier.value}`);

    query.forEach(forEachCallback);

    expect(forEachCallback).toHaveBeenCalledTimes(2);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, functions[0], 0, functions);
    expect(forEachCallback).toHaveBeenNthCalledWith(2, functions[1], 1, functions);

    expect(query.map(mapCallback)).toEqual([
      "0:buildAlphaLabel",
      "1:formatLabel",
    ]);
    expect(mapCallback).toHaveBeenCalledTimes(2);
    expect(mapCallback).toHaveBeenNthCalledWith(1, functions[0], 0, functions);
    expect(mapCallback).toHaveBeenNthCalledWith(2, functions[1], 1, functions);
  });

  it("handles empty selections and missing lookups", () => {
    const emptyQuery = new FunctionDeclarationQueryImpl(ast, []);

    expect(emptyQuery.isEmpty()).toBe(true);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyQuery.findByName("missing").toArray()).toEqual([]);
    expect(emptyQuery.getParams().toArray()).toEqual([]);
    expect(emptyQuery.getDecorators().toArray()).toEqual([]);
    expect(emptyQuery.getTypeParameters().toArray()).toEqual([]);
    expect(emptyQuery.map(() => "x")).toEqual([]);
    expect(emptyQuery.forEach(() => undefined)).toBeUndefined();
  });

  it("returns a shallow copy from toArray", () => {
    const query = new FunctionDeclarationQueryImpl(ast, functions);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(1);
    expect(query.toArray()).toHaveLength(2);
    expect(query.last()).toBe(functions[1]);
  });
});
