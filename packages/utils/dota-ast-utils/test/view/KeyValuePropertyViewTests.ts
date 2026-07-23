import {describe, expect, it} from "vitest";
import {KeyValueProperty, Module, ObjectExpression, parseSync, VariableDeclaration} from "@swc/core";
import {KeyValuePropertyView} from "../../src/view/KeyValuePropertyView";


function loadObjectExpression(source: string): ObjectExpression {
  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: false,
  }) as Module;

  const init = ast.body
    .filter((item): item is VariableDeclaration => item.type === "VariableDeclaration")
    .flatMap(statement => statement.declarations.map(declaration => declaration.init))
    .find((candidate): candidate is ObjectExpression => candidate != null && candidate.type === "ObjectExpression");

  if (init == null) {
    throw new Error("Expected an object expression initializer");
  }

  return init;
}


function getProperty(objectExpression: ObjectExpression, index: number): KeyValueProperty {
  const property = objectExpression.properties[index];

  if (property == null || property.type !== "KeyValueProperty") {
    throw new Error("Expected a key-value property");
  }

  return property;
}


describe("KeyValuePropertyView", () => {
  it("returns the key name for identifier keys", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        alpha: 1,
      };
    `);
    const view = new KeyValuePropertyView(getProperty(objectExpression, 0));

    expect(view.getKeyName()).toBe("alpha");
  });

  it("returns the key name for string literal keys", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        "beta": 2,
      };
    `);
    const view = new KeyValuePropertyView(getProperty(objectExpression, 0));

    expect(view.getKeyName()).toBe("beta");
  });

  it("returns null for unsupported key types", () => {
    const objectExpression = loadObjectExpression(`
      const key = "gamma";
      const value = {
        [key]: 3,
      };
    `);
    const view = new KeyValuePropertyView(getProperty(objectExpression, 0));

    expect(view.getKeyName()).toBeNull();
  });

  it("returns typed values from key value properties", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        num: 42,
        str: "hello",
        bool: true,
        obj: { nested: "value" },
        arr: [1, "two"],
        nil: null,
        ident: sampleValue,
      };
    `);

    expect(new KeyValuePropertyView(getProperty(objectExpression, 0)).getNumeric()).toBe(42);
    expect(new KeyValuePropertyView(getProperty(objectExpression, 1)).getString()).toBe("hello");
    expect(new KeyValuePropertyView(getProperty(objectExpression, 2)).getBoolean()).toBe(true);

    const objectValue = new KeyValuePropertyView(getProperty(objectExpression, 3)).getObject();
    if (objectValue == null) {
      throw new Error("Expected nested object expression");
    }
    if (objectValue.type !== "ObjectExpression") {
      throw new Error("Expected nested object expression");
    }
    expect(objectValue.type).toBe("ObjectExpression");
    expect(objectValue.properties).toHaveLength(1);

    const arrayValue = new KeyValuePropertyView(getProperty(objectExpression, 4)).getArray();
    if (arrayValue == null) {
      throw new Error("Expected nested array expression");
    }
    if (arrayValue.type !== "ArrayExpression") {
      throw new Error("Expected nested array expression");
    }
    expect(arrayValue.type).toBe("ArrayExpression");
    expect(arrayValue.elements).toHaveLength(2);

    expect(new KeyValuePropertyView(getProperty(objectExpression, 5)).getNull()).toBeNull();
    expect(new KeyValuePropertyView(getProperty(objectExpression, 6)).getIdentifier()).toBe("sampleValue");
  });

  it("returns null when a typed getter is used on the wrong value type", () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        str: "hello",
      };
    `);
    const view = new KeyValuePropertyView(getProperty(objectExpression, 0));

    expect(view.getNumeric()).toBeNull();
    expect(view.getBoolean()).toBeNull();
    expect(view.getObject()).toBeNull();
    expect(view.getArray()).toBeNull();
    expect(view.getNull()).toBeNull();
    expect(view.getIdentifier()).toBeNull();
  });

  it('reads false boolean values and preserves the nested raw nodes', () => {
    const objectExpression = loadObjectExpression(`
      const value = {
        enabled: false,
        nested: { item: 1 },
        items: [1, 2],
      };
    `);

    const booleanView = KeyValuePropertyView.from(getProperty(objectExpression, 0));
    const objectView = KeyValuePropertyView.from(getProperty(objectExpression, 1));
    const arrayView = KeyValuePropertyView.from(getProperty(objectExpression, 2));

    expect(booleanView.getBoolean()).toBe(false);
    expect(objectView.getObject()?.type).toBe('ObjectExpression');
    expect(arrayView.getArray()?.type).toBe('ArrayExpression');
  });
});
