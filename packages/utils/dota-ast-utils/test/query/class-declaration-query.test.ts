import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {ClassDeclaration, Decorator, Module, parseSync} from "@swc/core";
import {ClassDeclarationQueryImpl} from "@dota/query";


function loadModuleFixture(): Module {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/class-declarations.fixture.ts"), "utf8");

  return parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: true,
  }) as Module;
}

function getClassDeclarations(ast: Module): ClassDeclaration[] {
  return ast.body.filter((item): item is ClassDeclaration => item.type === "ClassDeclaration");
}

function readDecoratorArgument(decorator: Decorator): unknown {
  if (decorator.expression.type !== "CallExpression") {
    return null;
  }

  const argument = decorator.expression.arguments[0];

  if (argument == null) {
    return null;
  }

  return readExpression(argument.expression);
}

function readExpression(expression: any): unknown {
  switch (expression.type) {
    case "NumericLiteral":
    case "StringLiteral":
      return expression.value;
    case "BooleanLiteral":
      return expression.value;
    case "NullLiteral":
      return null;
    case "Identifier":
      return expression.value;
    case "ArrayExpression":
      return expression.elements.map((item: any) => (item == null ? null : readExpression(item.expression)));
    case "ObjectExpression":
      return expression.properties.reduce((acc: Record<string, unknown>, property: any) => {
        if (property.type !== "KeyValueProperty") {
          return acc;
        }

        const key = property.key.type === "Identifier" || property.key.type === "StringLiteral"
          ? property.key.value
          : property.key.type;

        acc[key] = readExpression(property.value);
        return acc;
      }, {});
    default:
      return expression.type;
  }
}


describe("ClassDeclarationQueryImpl", () => {
  const ast = loadModuleFixture();
  const classes = getClassDeclarations(ast);

  it("loads the shared class fixture with decorators and member shapes", () => {
    expect(classes).toHaveLength(3);
    expect(classes.map(item => item.identifier.value)).toEqual([
      "DecoratedWidget",
      "FeatureRichWidget",
      "EmptyWidget",
    ]);
  });

  it("exposes the original ast and selection without mutation", () => {
    const query = new ClassDeclarationQueryImpl(ast, classes);

    expect(query.ast).toBe(ast);
    expect(query.selection).toBe(classes);
    expect(query.count()).toBe(3);
    expect(query.isEmpty()).toBe(false);
    expect(query.first()).toBe(classes[0]);
    expect(query.last()).toBe(classes[2]);
    expect(query.at(1)).toBe(classes[1]);
    expect(query.at(-1)).toBeNull();
    expect(query.at(99)).toBeNull();
    expect(query.toArray()).toEqual(classes);
    expect(query.toArray()).not.toBe(classes);
  });

  it("finds classes by name and supports predicate filtering", () => {
    const query = new ClassDeclarationQueryImpl(ast, classes);
    const predicate = vi.fn((item: ClassDeclaration) => item.decorators != null && item.decorators.length > 0);

    expect(query.findByName("DecoratedWidget").toArray()).toEqual([classes[0]]);
    expect(query.findByName("FeatureRichWidget").toArray()).toEqual([classes[1]]);
    expect(query.findByName("missing").toArray()).toEqual([]);

    const filtered = query.filter(predicate);

    expect(predicate).toHaveBeenCalledTimes(3);
    expect(predicate).toHaveBeenNthCalledWith(1, classes[0], 0, classes);
    expect(predicate).toHaveBeenNthCalledWith(3, classes[2], 2, classes);
    expect(filtered.toArray()).toEqual([classes[0]]);
  });

  it("returns constructors, members, and decorators as terminal queries", () => {
    const query = new ClassDeclarationQueryImpl(ast, classes);
    const constructors = query.getConstructors();
    const methods = query.getClassMethods();
    const properties = query.getClassProperties();
    const privateMethods = query.getPrivateMethods();
    const privateProperties = query.getPrivateProperties();
    const staticBlocks = query.getStaticBlocks();
    const indexSignatures = query.getTsIndexSignatures();
    const decorators = query.getDecorators();

    expect(constructors.count()).toBe(1);
    expect(constructors.toArray()[0]).toBe(classes[1].body.find(item => item.type === "Constructor"));

    expect(methods.count()).toBe(4);
    expect(methods.findByName("value").toArray()).toHaveLength(2);
    expect(methods.findByName("methodA").toArray()).toHaveLength(1);
    expect(methods.findByName("missing").toArray()).toEqual([]);

    expect(properties.count()).toBe(2);
    expect(properties.findByName("label").toArray()).toHaveLength(1);
    expect(properties.findByName("version").toArray()).toHaveLength(1);

    expect(privateMethods.count()).toBe(1);
    expect(privateMethods.findByName("reset").toArray()).toHaveLength(1);

    expect(privateProperties.count()).toBe(1);
    expect(privateProperties.findByName("count").toArray()).toHaveLength(1);

    expect(staticBlocks.count()).toBe(1);
    expect(staticBlocks.toArray()[0].type).toBe("StaticBlock");

    expect(indexSignatures.count()).toBe(1);
    expect(indexSignatures.toArray()[0].type).toBe("TsIndexSignature");

    expect(decorators.count()).toBe(6);
    expect(decorators.findByName("sealed").toArray()).toHaveLength(1);
    expect(decorators.findByName("entity").toArray()).toHaveLength(1);
    expect(decorators.findByName("tag").toArray()).toHaveLength(4);
    expect(decorators.findByName("missing").toArray()).toEqual([]);

    expect(decorators.findByName("tag").map(readDecoratorArgument)).toEqual([
      42,
      "featured",
      ["alpha", "beta", 3],
      {
        kind: "widget",
        enabled: true,
        meta: {
          version: 1,
        },
      },
    ]);
  });

  it("passes each item and index to forEach and map", () => {
    const query = new ClassDeclarationQueryImpl(ast, classes);
    const forEachCallback = vi.fn();
    const mapCallback = vi.fn((item: ClassDeclaration, index: number) => `${index}:${item.identifier.value}`);

    query.forEach(forEachCallback);

    expect(forEachCallback).toHaveBeenCalledTimes(3);
    expect(forEachCallback).toHaveBeenNthCalledWith(1, classes[0], 0, classes);
    expect(forEachCallback).toHaveBeenNthCalledWith(3, classes[2], 2, classes);

    expect(query.map(mapCallback)).toEqual([
      "0:DecoratedWidget",
      "1:FeatureRichWidget",
      "2:EmptyWidget",
    ]);
    expect(mapCallback).toHaveBeenCalledTimes(3);
    expect(mapCallback).toHaveBeenNthCalledWith(1, classes[0], 0, classes);
    expect(mapCallback).toHaveBeenNthCalledWith(3, classes[2], 2, classes);
  });

  it("handles empty selections and missing lookups", () => {
    const emptyQuery = new ClassDeclarationQueryImpl(ast, []);

    expect(emptyQuery.isEmpty()).toBe(true);
    expect(emptyQuery.count()).toBe(0);
    expect(emptyQuery.first()).toBeNull();
    expect(emptyQuery.last()).toBeNull();
    expect(emptyQuery.at(0)).toBeNull();
    expect(emptyQuery.toArray()).toEqual([]);
    expect(emptyQuery.findByName("missing").toArray()).toEqual([]);
    expect(emptyQuery.getConstructors().toArray()).toEqual([]);
    expect(emptyQuery.getClassMethods().toArray()).toEqual([]);
    expect(emptyQuery.getClassProperties().toArray()).toEqual([]);
    expect(emptyQuery.getPrivateMethods().toArray()).toEqual([]);
    expect(emptyQuery.getPrivateProperties().toArray()).toEqual([]);
    expect(emptyQuery.getStaticBlocks().toArray()).toEqual([]);
    expect(emptyQuery.getTsIndexSignatures().toArray()).toEqual([]);
    expect(emptyQuery.getDecorators().toArray()).toEqual([]);
    expect(emptyQuery.map(() => "x")).toEqual([]);
    expect(emptyQuery.forEach(() => undefined)).toBeUndefined();
  });

  it("returns a shallow copy from toArray", () => {
    const query = new ClassDeclarationQueryImpl(ast, classes);
    const copy = query.toArray();

    copy.pop();

    expect(copy).toHaveLength(2);
    expect(query.toArray()).toHaveLength(3);
    expect(query.last()).toBe(classes[2]);
  });
});
