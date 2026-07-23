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

  it("keeps class offsets stable across repeated SWC parses", () => {
    const source = `const café = "☕";
@Component({ selector: "sample-view" })
class SampleView {}`;
    const loadContext = () => {
      const ast = parseSync(source, {
        syntax: "typescript",
        tsx: false,
        decorators: true,
      }) as Module;
      const classDecl = ast.body.find(
        (item): item is ClassDeclaration => item.type === "ClassDeclaration",
      );

      if (classDecl == null) {
        throw new Error("Expected a class declaration");
      }

      return {ast, classDecl};
    };

    const first = loadContext();
    const second = loadContext();
    const sourceStartOffset = source.search(/\S/);
    const firstOffset = ClassView.from(first.classDecl)
      .getSourceOffset(source, first.ast.span.start, sourceStartOffset);
    const secondOffset = ClassView.from(second.classDecl)
      .getSourceOffset(source, second.ast.span.start, sourceStartOffset);

    expect(firstOffset).toBe(source.indexOf("SampleView"));
    expect(secondOffset).toBe(firstOffset);
  });

  it('falls back to the class span when the declaration has no identifier', () => {
    const anonymousClass = {
      type: 'ClassDeclaration',
      span: { start: 12, end: 30 },
      identifier: null,
      body: [],
    } as unknown as ClassDeclaration;

    const view = ClassView.from(anonymousClass);

    expect(view.className()).toBeNull();
    expect(view.getSourceOffset()).toBe(12);
    expect(view.getSourceOffset('class {}', 0, 0)).toBeNull();
  });

  it('uses the normalized relative span when source text is omitted', () => {
    const classDecl = loadClassDeclaration('class Sample {}');
    const identifierStart = classDecl.identifier?.span.start;

    if (identifierStart == null) {
      throw new Error('Expected a class identifier.');
    }

    expect(ClassView.from(classDecl).getSourceOffset(undefined, classDecl.span.start, 5)).toBe(
      5 + identifierStart - classDecl.span.start,
    );
  });

  it('uses source matching when the identifier span is unavailable', () => {
    const classDeclaration = {
      type: 'ClassDeclaration',
      span: { start: 0, end: 20 },
      identifier: { value: 'Sample', span: { start: 99, end: 105 } },
      body: [],
    } as unknown as ClassDeclaration;

    expect(ClassView.from(classDeclaration).getSourceOffset('class Sample {}')).toBe(6);
  });
});
