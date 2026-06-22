import {describe, expect, it} from "vitest";
import {ClassDeclaration, ClassProperty, Module, parseSync} from "@swc/core";
import {PropertyView} from "@dota/view/PropertyView.ts";


function loadClassDeclaration(source: string): ClassDeclaration {
  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: true,
  }) as Module;

  const classDecl = ast.body.find((item): item is ClassDeclaration => item.type === "ClassDeclaration");

  if (classDecl == null) {
    throw new Error("Expected a class declaration");
  }

  return classDecl;
}


function loadProperty(source: string, propertyName: string): ClassProperty {
  const classDecl = loadClassDeclaration(source);

  const property = classDecl.body.find((member): member is ClassProperty =>
    member.type === "ClassProperty" &&
    member.key.type === "Identifier" &&
    member.key.value === propertyName,
  );

  if (property == null) {
    throw new Error(`Expected property ${propertyName}`);
  }

  return property;
}


describe("PropertyView", () => {
  it("wraps the same property node through from()", () => {
    const property = loadProperty(`
      class Sample {
        value = 42;
      }
    `, "value");

    const view = PropertyView.from(property);

    expect(view.defaultValue()).toBe(property.value);
    expect(view.propertyName()).toBe("value");
  });

  it("extracts all class and private properties from a class declaration", () => {
    const classDecl = loadClassDeclaration(`
      class Sample {
        value = 1;
        #secret = 2;
        method() {}
      }
    `);

    const views = PropertyView.extractProperties(classDecl);

    expect(views).toHaveLength(2);
    expect(views.map(view => view.propertyName())).toEqual(["value", "secret"]);
    expect(views[0]?.defaultValue()?.type).toBe("NumericLiteral");
    expect(views[1]?.defaultValue()?.type).toBe("NumericLiteral");
  });

  it("returns one property when the class has one property", () => {
    const classDecl = loadClassDeclaration(`
      class Sample {
        value = 1;
      }
    `);

    const views = PropertyView.extractProperties(classDecl);

    expect(views).toHaveLength(1);
    expect(views[0]?.propertyName()).toBe("value");
    expect(views[0]?.defaultValue()?.type).toBe("NumericLiteral");
  });

  it("returns the initializer as the default value when present", () => {
    const view = new PropertyView(loadProperty(`
      class Sample {
        value = 42;
      }
    `, "value"));

    const defaultValue = view.defaultValue();

    expect(defaultValue).not.toBeNull();
    expect(defaultValue?.type).toBe("NumericLiteral");
    if (defaultValue?.type === "NumericLiteral") {
      expect(defaultValue.value).toBe(42);
    }
  });

  it("returns null as the default value when no initializer exists", () => {
    const view = new PropertyView(loadProperty(`
      class Sample {
        value!: string;
      }
    `, "value"));

    expect(view.defaultValue()).toBeNull();
  });

  it("returns the property span start as the source offset", () => {
    const property = loadProperty(`
      class Sample {
        @Property({ name: "value" })
        value = 42;
      }
    `, "value");
    const view = new PropertyView(property);

    expect(view.getSourceOffset()).toBe(property.span.start);
  });

  it("detects decorators by name on the real property node", () => {
    const view = new PropertyView(loadProperty(`
      class Sample {
        @Property({ name: "value" })
        value = 42;
      }
    `, "value"));

    expect(view.hasDecorator("Property")).toBe(true);

    const decorator = view.getDecorator("Property");
    expect(decorator).not.toBeNull();
    expect(decorator?.expression.type).toBe("CallExpression");
    if (decorator?.expression.type === "CallExpression") {
      expect(decorator.expression.callee.type).toBe("Identifier");
      if (decorator.expression.callee.type === "Identifier") {
        expect(decorator.expression.callee.value).toBe("Property");
      }
    }
    expect(view.hasDecorator("Missing")).toBe(false);
    expect(view.getDecorator("Missing")).toBeNull();
  });

  it("treats decorator required as the source of truth", () => {
    const requiredView = new PropertyView(loadProperty(`
      class Sample {
        @Property({ required: true })
        value!: string;
      }
    `, "value"));

    const optionalView = new PropertyView(loadProperty(`
      class Sample {
        @Property({ required: false })
        value!: string;
      }
    `, "value"));

    expect(requiredView.isRequired()).toBe(true);
    expect(optionalView.isRequired()).toBe(false);
  });

  it("falls back to initializer presence when no required option is set", () => {
    const initializedView = new PropertyView(loadProperty(`
      class Sample {
        @Property({ name: "value" })
        value = 42;
      }
    `, "value"));

    const uninitializedView = new PropertyView(loadProperty(`
      class Sample {
        @Property({ name: "value" })
        value!: string;
      }
    `, "value"));

    expect(initializedView.isRequired()).toBe(false);
    expect(uninitializedView.isRequired()).toBe(true);
  });

  it("returns the property name from identifier, string, numeric, and private keys", () => {
    const classDecl = loadClassDeclaration(`
      class Sample {
        value = 1;
        "slug" = 2;
        7 = 3;
        #secret = 4;
      }
    `);

    const views = PropertyView.extractProperties(classDecl);

    expect(views.map(view => view.propertyName())).toEqual([
      "value",
      "slug",
      "7",
      "secret",
    ]);
  });

  it("infers types from initializers when present", () => {
    const stringView = new PropertyView(loadProperty(`
      class Sample {
        value = "hello";
      }
    `, "value"));

    const booleanView = new PropertyView(loadProperty(`
      class Sample {
        value = true;
      }
    `, "value"));

    const objectView = new PropertyView(loadProperty(`
      class Sample {
        value = { name: "demo" };
      }
    `, "value"));

    expect(stringView.getType()).toBe("string");
    expect(booleanView.getType()).toBe("boolean");
    expect(objectView.getType()).toBe("object");
  });

  it("infers types from type annotations when the initializer is missing", () => {
    const stringView = new PropertyView(loadProperty(`
      class Sample {
        value!: string;
      }
    `, "value"));

    const numberView = new PropertyView(loadProperty(`
      class Sample {
        value!: number;
      }
    `, "value"));

    const arrayView = new PropertyView(loadProperty(`
      class Sample {
        value!: string[];
      }
    `, "value"));

    expect(stringView.getType()).toBe("string");
    expect(numberView.getType()).toBe("number");
    expect(arrayView.getType()).toBe("array");
  });

  it("keeps custom type references instead of returning null", () => {
    const view = new PropertyView(loadProperty(`
      class Sample {
        value!: NotificationPosition;
      }
    `, "value"));

    expect(view.getType()).toBe("NotificationPosition");
  });
});
