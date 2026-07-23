import {describe, expect, it} from "vitest";
import {ClassDeclaration, Decorator, Module, parseSync} from "@swc/core";
import {DecoratorView} from "@dota/view/DecoratorView.ts";


function loadDecorator(source: string): Decorator {
  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: true,
  }) as Module;

  const classDecl = ast.body[0];

  if (classDecl == null || classDecl.type !== "ClassDeclaration") {
    throw new Error("Expected a class declaration");
  }

  const decorator = (classDecl as ClassDeclaration).decorators?.[0];

  if (decorator == null) {
    throw new Error("Expected a decorator");
  }

  return decorator;
}


describe("DecoratorView", () => {
  it("returns the decorator name for identifier decorators", () => {
    const view = new DecoratorView(loadDecorator(`
      @sealed
      class Foo {}
    `));

    expect(view.isCallee()).toBe(false);
    expect(view.hasArguments()).toBe(false);
    expect(view.getArguments()).toEqual([]);
    expect(view.getName()).toBe("sealed");
    expect(view.getArgument(0)).toBeNull();
    expect(view.getStringArgument()).toBeNull();
  });

  it("returns the decorator name and arguments for call decorators", () => {
    const view = new DecoratorView(loadDecorator(`
      @tag("alpha", 1)
      class Foo {}
    `));

    expect(view.isCallee()).toBe(true);
    expect(view.hasArguments()).toBe(true);
    expect(view.getArguments()).toHaveLength(2);
    expect(view.getArgument(0)).not.toBeNull();
    expect(view.getArgument(1)).not.toBeNull();
    expect(view.getStringArgument()).toBe("alpha");
    expect(view.getStringArgument(1)).toBeNull();
    expect(view.getName()).toBe("tag");
  });

  it("returns null and empty values for unsupported decorator expressions", () => {
    const view = new DecoratorView(loadDecorator(`
      @ns.tag
      class Foo {}
    `));

    expect(view.isCallee()).toBe(false);
    expect(view.hasArguments()).toBe(false);
    expect(view.getArguments()).toEqual([]);
    expect(view.getName()).toBeNull();
    expect(view.getArgument(0)).toBeNull();
    expect(view.getStringArgument()).toBeNull();
  });

  it('returns null for a missing or non-string argument', () => {
    const view = DecoratorView.from(loadDecorator('@tag(1) class Foo {}'));

    expect(view.getStringArgument()).toBeNull();
    expect(view.getArgument(1)).toBeNull();
    expect(view.getStringArgument(1)).toBeNull();
  });
});
