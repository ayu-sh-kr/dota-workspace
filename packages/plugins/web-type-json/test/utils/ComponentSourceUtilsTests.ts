import {describe, expect, it} from "vitest";
import {resolve} from "node:path";
import {ComponentSourceUtils} from "@dota/utils/ComponentSourceUtils.ts";

describe("ComponentSourceUtils", () => {
  describe("toWebTypesSourceFile", () => {
    it("creates a slash-normalized package-relative source path", () => {
      const root = resolve("/workspace/package");
      const file = resolve(root, "src/components/example.component.ts");

      expect(ComponentSourceUtils.toWebTypesSourceFile(root, file)).toBe(
        "./src/components/example.component.ts",
      );
    });

    it("preserves a path that already escapes the package root", () => {
      const root = resolve("/workspace/package");
      const file = resolve("/workspace/shared/example.component.ts");

      expect(ComponentSourceUtils.toWebTypesSourceFile(root, file)).toBe(
        "../shared/example.component.ts",
      );
    });
  });

  describe("findModuleSourceOffset", () => {
    it.each([
      ["const value = true;", 0],
      ["\n  \tconst value = true;", 4],
      ["// heading\nconst value = true;", 11],
      ["/* heading */const value = true;", 13],
      [" \n// first\n/* second */\n  const value = true;", 26],
    ])("finds the first parsed token in %j", (sourceText, expected) => {
      expect(ComponentSourceUtils.findModuleSourceOffset(sourceText)).toBe(expected);
    });

    it.each(["", "   \n\t", "// comment only", "/* comment only */"])(
      "returns zero when %j has no parsed token",
      sourceText => {
        expect(ComponentSourceUtils.findModuleSourceOffset(sourceText)).toBe(0);
      },
    );

    it("returns zero for an unterminated leading block comment", () => {
      expect(ComponentSourceUtils.findModuleSourceOffset("/* unfinished")).toBe(0);
    });
  });

  describe("isScannableComponentFile", () => {
    const appRoot = resolve("/workspace/app");
    const libraryRoot = resolve("/workspace/library");

    it.each([
      resolve(appRoot, "src/example.component.ts"),
      resolve(appRoot, "src/components/example.component.ts"),
      resolve(appRoot, "src/pages/example.page.ts"),
    ])("accepts a supported source file at %s", file => {
      expect(ComponentSourceUtils.isScannableComponentFile(file, [appRoot])).toBe(true);
    });

    it.each([
      resolve(appRoot, "src/components/example.ts"),
      resolve(appRoot, "src/components/example.component.js"),
      resolve(appRoot, "test/example.component.ts"),
      resolve("/workspace/other/src/example.component.ts"),
    ])("rejects an unsupported or external file at %s", file => {
      expect(ComponentSourceUtils.isScannableComponentFile(file, [appRoot])).toBe(false);
    });

    it("checks every configured scan root", () => {
      const file = resolve(libraryRoot, "src/components/library.component.ts");

      expect(ComponentSourceUtils.isScannableComponentFile(file, [appRoot, libraryRoot])).toBe(true);
    });

    it("rejects every file when no scan roots are configured", () => {
      const file = resolve(appRoot, "src/example.component.ts");

      expect(ComponentSourceUtils.isScannableComponentFile(file, [])).toBe(false);
    });
  });
});
