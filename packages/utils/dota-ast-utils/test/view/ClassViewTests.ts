import {describe, expect, it} from "vitest";
import {ClassDeclaration, Module, parseSync} from "@swc/core";
import {ClassView} from "@dota/view/ClassView.ts";


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


describe("ClassView", () => {
  it("prefers the class identifier span as the source offset", () => {
    const classDecl = loadClassDeclaration(`
      @Component({ selector: "sample-view" })
      class SampleView {}
    `);

    const view = ClassView.from(classDecl);

    expect(view.className()).toBe("SampleView");
    expect(view.getSourceOffset()).toBe(classDecl.identifier?.span.start ?? null);
  });
});
