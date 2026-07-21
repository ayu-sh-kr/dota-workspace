import {describe, expect, it} from "vitest";
import {resolve} from "node:path";
import {CustomElementsManifestUtils} from "@dota/utils/CustomElementsManifestUtils.ts";

describe("CustomElementsManifestUtils", () => {
  describe("normalizeConfig", () => {
    it("uses enabled defaults for Boolean true", () => {
      expect(CustomElementsManifestUtils.normalizeConfig(true)).toEqual({
        enabled: true,
        outFile: "custom-elements.json",
        updatePackageJson: true,
      });
    });

    it.each([undefined, false])("uses disabled defaults for %s", config => {
      expect(CustomElementsManifestUtils.normalizeConfig(config)).toEqual({
        enabled: false,
        outFile: "custom-elements.json",
        updatePackageJson: false,
      });
    });

    it("normalizes an enabled object and preserves its module mapper", () => {
      const modulePath = (sourceFile: string, root: string) =>
        `dist/${sourceFile.slice(root.length).replace(/^\//, "")}`;

      const result = CustomElementsManifestUtils.normalizeConfig({
        enabled: true,
        outFile: "metadata/custom-elements.json",
        updatePackageJson: false,
        modulePath,
      });

      expect(result).toEqual({
        enabled: true,
        outFile: "metadata/custom-elements.json",
        updatePackageJson: false,
        modulePath,
      });
      expect(result.modulePath).toBe(modulePath);
    });

    it("applies enabled object defaults", () => {
      expect(CustomElementsManifestUtils.normalizeConfig({enabled: true})).toEqual({
        enabled: true,
        outFile: "custom-elements.json",
        updatePackageJson: true,
        modulePath: undefined,
      });
    });

    it("does not update package metadata when an object is not explicitly enabled", () => {
      expect(CustomElementsManifestUtils.normalizeConfig({
        outFile: "metadata/custom-elements.json",
        updatePackageJson: true,
      })).toEqual({
        enabled: false,
        outFile: "metadata/custom-elements.json",
        updatePackageJson: false,
        modulePath: undefined,
      });
    });
  });

  describe("isPackageOwnedSource", () => {
    const root = resolve("/workspace/package");

    it.each([
      resolve(root, "src/example.component.ts"),
      resolve(root, "example.component.ts"),
    ])("accepts a source owned by the package at %s", sourceFile => {
      expect(CustomElementsManifestUtils.isPackageOwnedSource(root, sourceFile)).toBe(true);
    });

    it.each([
      resolve("/workspace/shared/example.component.ts"),
      resolve("/workspace/package-other/src/example.component.ts"),
    ])("rejects a source outside the package at %s", sourceFile => {
      expect(CustomElementsManifestUtils.isPackageOwnedSource(root, sourceFile)).toBe(false);
    });
  });

  describe("defaultModulePath", () => {
    it("maps a nested TypeScript source to a package-relative JavaScript module", () => {
      const root = resolve("/workspace/package");
      const sourceFile = resolve(root, "src/components/example.component.ts");

      expect(CustomElementsManifestUtils.defaultModulePath(sourceFile, root)).toBe(
        "src/components/example.component.js",
      );
    });

    it("does not rewrite a non-TypeScript extension", () => {
      const root = resolve("/workspace/package");
      const sourceFile = resolve(root, "src/components/example.component.tsx");

      expect(CustomElementsManifestUtils.defaultModulePath(sourceFile, root)).toBe(
        "src/components/example.component.tsx",
      );
    });
  });

  describe("normalizeModulePath", () => {
    it.each([
      ["./dist/example.js", "dist/example.js"],
      ["dist\\nested\\example.js", "dist/nested/example.js"],
      ["example.js", "example.js"],
    ])("normalizes the valid module path %j", (modulePath, expected) => {
      expect(CustomElementsManifestUtils.normalizeModulePath(modulePath, "/source/example.ts")).toBe(expected);
    });

    it.each([
      "",
      "./",
      "/absolute/example.js",
      "C:/absolute/example.js",
      "../outside/example.js",
      "dist/../outside/example.js",
      "dist\\..\\outside\\example.js",
    ])("rejects the invalid module path %j", modulePath => {
      expect(() => CustomElementsManifestUtils.normalizeModulePath(
        modulePath,
        "/source/example.ts",
      )).toThrow(
        `Invalid Custom Elements Manifest module path for /source/example.ts: ${modulePath}`,
      );
    });
  });
});
