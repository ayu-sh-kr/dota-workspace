import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ExportDeclaration, Module, VariableDeclaration, parseSync} from "@swc/core";
import {VariableDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/export-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;
}

function getVariableDeclarations(ast: Module): VariableDeclaration[] {
  return ast.body.filter((item): item is ExportDeclaration & { declaration: VariableDeclaration } =>
    item.type === "ExportDeclaration" && item.declaration.type === "VariableDeclaration",
  ).map(item => item.declaration);
}


describe("VariableDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const variables = getVariableDeclarations(ast);

  it("loads the shared fixture with exported variables", () => {
    expect(variables).toHaveLength(5);
    expect(variables.map(item => item.kind)).toEqual([
      "const",
      "let",
      "var",
      "const",
      "const",
    ]);
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new VariableDeclarationQueryImpl(ast, variables);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(variables);
    expect(query.count()).toBe(5);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(variables[0]);
    expect(query.last()).toBe(variables[4]);
    expect(query.at(2)).toBe(variables[2]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(variables);
    expect(query.toArray()).not.toBe(variables);
  });

  it("filters by kind and first declarator name", () => {
    const query = new VariableDeclarationQueryImpl(ast, variables);

    expect(query.filterConst().toArray()).toEqual([variables[0], variables[3], variables[4]]);
    expect(query.filterLet().toArray()).toEqual([variables[1]]);
    expect(query.filterVar().toArray()).toEqual([variables[2]]);
    expect(query.findByName("exportedVersion").toArray()).toEqual([variables[0]]);
    expect(query.findByName("multiFirst").toArray()).toEqual([variables[3]]);
    expect(query.findByName("multiSecond").toArray()).toEqual([]);
    expect(query.findByName("destructuredLabel").toArray()).toEqual([]);
  });

  it("supports predicate filtering with call verification", () => {
    const query = new VariableDeclarationQueryImpl(ast, variables);
    const predicate = vi.fn((item: VariableDeclaration) => item.declarations.length > 1);

    const filtered = query.filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(5);
    expect(predicate).toHaveBeenNthCalledWith(1, variables[0], 0, variables);
    expect(predicate).toHaveBeenNthCalledWith(5, variables[4], 4, variables);
    expect(filtered.toArray()).toEqual([variables[3]]);
  });

  it("flattens declarators from the selection", () => {
    const query = new VariableDeclarationQueryImpl(ast, variables);
    const declarators = query.getDeclarators();

    expect(declarators.count()).toBe(6);
    expect(declarators.findByName("exportedVersion").toArray()).toHaveLength(1);
    expect(declarators.findByName("exportedToggle").toArray()).toHaveLength(1);
    expect(declarators.findByName("exportedCounter").toArray()).toHaveLength(1);
    expect(declarators.findByName("multiFirst").toArray()).toHaveLength(1);
    expect(declarators.findByName("multiSecond").toArray()).toHaveLength(1);
    expect(declarators.findByName("destructuredLabel").toArray()).toEqual([]);
  });

  it("passes each item and index to forEach and map", () => {
    const query = new VariableDeclarationQueryImpl(ast, variables);
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: VariableDeclaration, index: number) => `${index}:${item.kind}`);

    query.forEach(forEachCallback);

    expect(forEachCallback).toHaveBeenCalledTimes(5);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, variables[0], 0, variables);
    expect(forEachCallback).toHaveBeenNthCalledWith(5, variables[4], 4, variables);

    expect(query.map(mapCallback)).toEqual([
      "0:const",
      "1:let",
      "2:var",
      "3:const",
      "4:const",
    ]);
    expect(mapCallback).toHaveBeenCalledTimes(5);
    expect(mapCallback).toHaveBeenNthCalledWith(1, variables[0], 0, variables);
    expect(mapCallback).toHaveBeenNthCalledWith(5, variables[4], 4, variables);
  });

  it("handles empty selections and missing lookups", () => {
    const emptyQuery = new VariableDeclarationQueryImpl(ast, []);

    expect(emptyQuery.isEmpty()).toBe(true);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyQuery.findByName("missing").toArray()).toEqual([]);
    expect(emptyQuery.filterConst().toArray()).toEqual([]);
    expect(emptyQuery.filterLet().toArray()).toEqual([]);
    expect(emptyQuery.filterVar().toArray()).toEqual([]);
    expect(emptyQuery.getDeclarators().toArray()).toEqual([]);
    expect(emptyQuery.map(() => "x")).toEqual([]);
    expect(emptyQuery.forEach(() => undefined)).toBeUndefined();
  });

  it("returns a shallow copy from toArray", () => {
    const query = new VariableDeclarationQueryImpl(ast, variables);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(4);
    expect(query.toArray()).toHaveLength(5);
    expect(query.last()).toBe(variables[4]);
  });
});
