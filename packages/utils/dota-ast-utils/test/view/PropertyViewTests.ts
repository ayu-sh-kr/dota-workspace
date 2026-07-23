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

function loadPropertyContext(source: string, propertyName: string): {
  property: ClassProperty;
  sourceStart: number;
  sourceStartOffset: number;
} {
  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: true,
  }) as Module;

  const classDecl = ast.body.find((item): item is ClassDeclaration => item.type === "ClassDeclaration");
  const property = classDecl?.body.find((member): member is ClassProperty =>
    member.type === "ClassProperty" &&
    member.key.type === "Identifier" &&
    member.key.value === propertyName,
  );

  if (property == null) {
    throw new Error(`Expected property ${propertyName}`);
  }

  return {
    property,
    sourceStart: ast.span.start,
    sourceStartOffset: source.search(/\S/),
  };
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

  it("returns the property identifier as the source offset", () => {
    const source = `
      class Sample {
        @Property({ name: "value" })
        value = 42;
      }
    `;
    const {property, sourceStart, sourceStartOffset} = loadPropertyContext(source, "value");
    const view = new PropertyView(property);

    expect(view.getSourceOffset(source, sourceStart, sourceStartOffset)).toBe(source.indexOf("value ="));
  });

  it("keeps the source offset stable across repeated SWC parses", () => {
    const source = `
      class Sample {
        @Property({
          name: "value",
        })
        value!: string;
      }
    `;
    const first = loadPropertyContext(source, "value");
    const second = loadPropertyContext(source, "value");

    const firstOffset = PropertyView.from(first.property)
      .getSourceOffset(source, first.sourceStart, first.sourceStartOffset);
    const secondOffset = PropertyView.from(second.property)
      .getSourceOffset(source, second.sourceStart, second.sourceStartOffset);

    expect(firstOffset).toBe(source.indexOf("value!:"));
    expect(secondOffset).toBe(firstOffset);
  });

  it("converts SWC byte offsets to source character offsets", () => {
    const source = `const café = "☕";
class Sample {
  @Property({ name: "value" })
  value!: string;
}`;
    const {property, sourceStart, sourceStartOffset} = loadPropertyContext(source, "value");

    const offset = PropertyView.from(property)
      .getSourceOffset(source, sourceStart, sourceStartOffset);

    expect(offset).toBe(source.indexOf("value!:"));
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

  it('infers the remaining supported initializer types', () => {
    const bigintView = new PropertyView(loadProperty(`
      class Sample {
        value = 42n;
      }
    `, "value"));
    const nullView = new PropertyView(loadProperty(`
      class Sample {
        value = null;
      }
    `, "value"));
    const identifierView = new PropertyView(loadProperty(`
      class Sample {
        value = defaultValue;
      }
    `, "value"));
    const callView = new PropertyView(loadProperty(`
      class Sample {
        value = createValue();
      }
    `, "value"));

    expect(bigintView.getType()).toBe('bigint');
    expect(nullView.getType()).toBe('null');
    expect(identifierView.getType()).toBe('identifier');
    expect(callView.getType()).toBe('CallExpression');
  });

  it('maps built-in and literal type annotations to simplified types', () => {
    const cases = [
      ['String', 'string'],
      ['Boolean', 'boolean'],
      ['Number', 'number'],
      ['BigInt', 'bigint'],
      ['Array<string>', 'array'],
      ['Object', 'object'],
      ['"ready"', 'string'],
      ['true', 'boolean'],
      ['7', 'number'],
    ] as const;

    for (const [annotation, expectedType] of cases) {
      const view = new PropertyView(loadProperty(`
        class Sample {
          value!: ${annotation};
        }
      `, "value"));

      expect(view.getType()).toBe(expectedType);
    }
  });

  it('returns null for properties without a value or annotation and for computed names', () => {
    const classDecl = loadClassDeclaration(`
      class Sample {
        [computed] = 1;
        value;
      }
    `);
    const views = PropertyView.extractProperties(classDecl);

    expect(views[0]?.propertyName()).toBeNull();
    expect(views[1]?.propertyName()).toBe('value');
    expect(views[1]?.defaultValue()).toBeNull();
    expect(views[1]?.getType()).toBeNull();
    expect(views[1]?.isRequired()).toBe(true);
  });

  it('uses the first matching decorator and handles non-call property decorators', () => {
    const view = new PropertyView(loadProperty(`
      class Sample {
        @Property
        @Property({ required: false })
        value!: string;
      }
    `, "value"));

    expect(view.hasDecorator('Property')).toBe(true);
    expect(view.getDecorator('Property')?.expression.type).toBe('Identifier');
    expect(view.getDecorator('Missing')).toBeNull();
    expect(view.isRequired()).toBe(true);
  });

  it('falls back to the property span when source context is unavailable', () => {
    const property = loadProperty(`
      class Sample {
        value = 1;
      }
    `, "value");
    const view = PropertyView.from(property);

    expect(view.getSourceOffset()).toBe(property.span.start);
    expect(view.getSourceOffset(undefined, property.span.start, 4)).toBe(4);
  });
});
