import {describe, expect, it} from "vitest";
import {Module, ObjectExpression, parseSync, VariableDeclaration} from "@swc/core";
import {ObjectExpressionView} from "@dota/view/ObjectExpressionView.ts";


function loadObjectExpression(source: string): ObjectExpression {
  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;

  const declaration = ast.body.find((item): item is VariableDeclaration => item.type === "VariableDeclaration");
  const initializer = declaration?.declarations[0]?.init;

  if (initializer == null || initializer.type !== "ObjectExpression") {
    throw new Error("Expected a top-level object expression initializer");
  }

  return initializer;
}


describe("ObjectExpressionView", () => {
  it("lists all the properties of the object expression", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        alpha: 1,
        "beta": "two",
        gamma: true,
      };
    `);
    const view = new ObjectExpressionView(objectExpression);

    expect(view.getPropertiesNames()).toEqual(["alpha", "beta", "gamma"]);
    expect(view.getProperties()).toHaveLength(3);
  });

  it("gets a specific property as a KeyValueProperty from the object expression", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        alpha: 1,
        "beta": "two",
      };
    `);
    const view = new ObjectExpressionView(objectExpression);

    const property = view.getProperty("beta");

    expect(property).not.toBeNull();
    expect(property?.type).toBe("KeyValueProperty");
    if (property == null) {
      throw new Error("Expected beta property to exist");
    }

    expect(property.key.type).toBe("StringLiteral");
    if (property.key.type !== "StringLiteral") {
      throw new Error("Expected beta property key to be a string literal");
    }

    expect(property.key.value).toBe("beta");
    expect(property.value.type).toBe("StringLiteral");
    if (property.value.type !== "StringLiteral") {
      throw new Error("Expected beta property value to be a string literal");
    }

    expect(property.value.value).toBe("two");
    expect(view.getProperty("missing")).toBeNull();
  });

  it("handles empty objects robustly", () => {
    const objectExpression = loadObjectExpression(`
      const value = {};
    `);
    const view = new ObjectExpressionView(objectExpression);

    expect(view.hasProperties()).toBe(false);
    expect(view.getProperties()).toEqual([]);
    expect(view.getPropertiesNames()).toEqual([]);
    expect(view.getProperty("missing")).toBeNull();
  });
});
