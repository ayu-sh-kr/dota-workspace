import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ExportDefaultDeclaration, Module, parseSync} from "@swc/core";
import {ExportDefaultDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/export-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;
}

function getExportDefaultDeclarations(ast: Module): ExportDefaultDeclaration[] {
  return ast.body.filter((item): item is ExportDefaultDeclaration => item.type === "ExportDefaultDeclaration");
}


describe("ExportDefaultDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const defaults = getExportDefaultDeclarations(ast);

  it("loads the shared fixture with a default export", () => {
    expect(defaults).toHaveLength(1);
    expect(defaults[0].decl.type).toBe("ClassExpression");
    expect(defaults[0].decl.type === "ClassExpression" ? defaults[0].decl.identifier?.value : null).toBe("DefaultExportedWidget");
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new ExportDefaultDeclarationQueryImpl(ast, defaults);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(defaults);
    expect(query.count()).toBe(1);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(defaults[0]);
    expect(query.last()).toBe(defaults[0]);
    expect(query.at(0)).toBe(defaults[0]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(defaults);
    expect(query.toArray()).not.toBe(defaults);
  });

  it("finds the default export by its declared name", () => {
    const query = new ExportDefaultDeclarationQueryImpl(ast, defaults);

    expect(query.findByName("DefaultExportedWidget").toArray()).toEqual([defaults[0]]);
    expect(query.findByName("Missing").isEmpty()).toBe(true);
  });

  it("unwraps the default class expression", () => {
    const query = new ExportDefaultDeclarationQueryImpl(ast, defaults);
    const classExpressions = query.getClassExpressions();

    expect(classExpressions.toArray()).toEqual([
      defaults[0].decl,
    ]);
    expect(classExpressions.findByName("DefaultExportedWidget").toArray()).toEqual([
      defaults[0].decl,
    ]);
  });

  it("supports filter, forEach, and map on the default export selection", () => {
    const query = new ExportDefaultDeclarationQueryImpl(ast, defaults);
    const predicate = vi.fn((item: ExportDefaultDeclaration) => item.decl.type === "ClassExpression");
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: ExportDefaultDeclaration, index: number) => `${index}:${item.decl.type}`);

    const filtered = query.filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(1);
    expect(predicate).toHaveBeenNthCalledWith(1, defaults[0], 0, defaults);
    expect(filtered.toArray()).toEqual([defaults[0]]);

    query.forEach(forEachCallback);
    expect(forEachCallback).toHaveBeenCalledTimes(1);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, defaults[0], 0, defaults);

    expect(query.map(mapCallback)).toEqual(["0:ClassExpression"]);
    expect(mapCallback).toHaveBeenCalledTimes(1);
    expect(mapCallback).toHaveBeenNthCalledWith(1, defaults[0], 0, defaults);
  });

  it("handles empty selections and missing lookups", () => {
    const emptyQuery = new ExportDefaultDeclarationQueryImpl(ast, []);

    expect(emptyQuery.isEmpty()).toBe(true);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyQuery.findByName("Missing").toArray()).toEqual([]);
    expect(emptyQuery.getClassExpressions().isEmpty()).toBe(true);
    expect(emptyQuery.map(() => "x")).toEqual([]);
    expect(emptyQuery.forEach(() => undefined)).toBeUndefined();
  });

  it("returns a shallow copy from toArray", () => {
    const query = new ExportDefaultDeclarationQueryImpl(ast, defaults);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(0);
    expect(query.toArray()).toHaveLength(1);
    expect(query.last()).toBe(defaults[0]);
  });
});
