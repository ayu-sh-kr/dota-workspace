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

  it("returns string properties directly from getStringProperty()", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        selector: "notification-holder",
        shadow: false,
      };
    `);
    const view = new ObjectExpressionView(objectExpression);

    expect(view.getStringProperty("selector")).toBe("notification-holder");
    expect(view.getStringProperty("shadow")).toBeNull();
    expect(view.getStringProperty("missing")).toBeNull();
  });

  it("returns a plain object from toObject()", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        plain: "text",
        nested: {
          inner: 1,
        },
        withArray: [1, 2],
      };
    `);
    const view = new ObjectExpressionView(objectExpression);

    expect(view.toObject()).toEqual({
      plain: "text",
      nested: {
        inner: 1,
      },
      withArray: [1, 2],
    });
  });

  it("recursively converts an object expression into a plain JavaScript object", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        selector: "notification-holder",
        shadow: false,
        type: String,
        nested: {
          inner: 1,
        },
        withArray: [1, 2, 3],
        nestedArray: [[1], [2, 3]],
        nestedObjectWithArrayValues: {
          items: ["a", "b"],
          meta: {
            tags: ["x"],
          },
        },
      };
    `);

    expect(ObjectExpressionView.toPlainObject(objectExpression)).toEqual({
      selector: "notification-holder",
      shadow: false,
      type: "String",
      nested: {
        inner: 1,
      },
      withArray: [1, 2, 3],
      nestedArray: [[1], [2, 3]],
      nestedObjectWithArrayValues: {
        items: ["a", "b"],
        meta: {
          tags: ["x"],
        },
      },
    });
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

  it('indexes only statically named properties and keeps the last duplicate value', () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        duplicate: "first",
        duplicate: "last",
        [key]: "ignored",
        ...other,
      };
    `);
    const view = ObjectExpressionView.from(objectExpression);

    expect(view.hasProperties()).toBe(true);
    expect(view.getPropertiesNames()).toEqual(['duplicate']);
    expect(view.getPropertiesNames(true)).toEqual(['duplicate']);
    expect(view.getStringProperty('duplicate')).toBe('last');
    expect(view.getProperty('computed')).toBeNull();
  });

  it('converts supported wrappers, nulls, identifiers, arrays, and unsupported expressions', () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        nullValue: null,
        identifier: sample,
        parenthesized: (1),
        assertion: 2 as number,
        nonNull: sample!,
        values: [1, , 3],
        call: createValue(),
      };
    `);

    const result = ObjectExpressionView.toPlainObject(objectExpression);

    expect(result).toMatchObject({
      nullValue: null,
      identifier: 'sample',
      parenthesized: 1,
      assertion: 2,
      nonNull: 'sample',
      values: [1, null, 3],
    });
    expect(result.call).toMatchObject({ type: 'CallExpression' });
  });
});
