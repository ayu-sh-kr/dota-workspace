import {describe, expect, it} from "vitest";
import type {Expression} from "@swc/core";
import {ComponentMetadataUtils} from "@dota/utils/ComponentMetadataUtils.ts";
import type {PropertyInfo, WebComponentInfo} from "@dota/Types.ts";

function expression(value: Record<string, unknown>): Expression {
  return value as unknown as Expression;
}

function component(
  id: string,
  overrides: Partial<WebComponentInfo> = {},
): WebComponentInfo {
  return {
    className: "ExampleComponent",
    tagName: "example-component",
    description: id,
    properties: [],
    ...overrides,
  };
}

function property(
  id: string,
  overrides: Partial<PropertyInfo> = {},
): PropertyInfo {
  return {
    name: "mode",
    type: "string",
    description: id,
    ...overrides,
  };
}

describe("ComponentMetadataUtils", () => {
  describe("normalizePropertyType", () => {
    it.each([
      ["STRING", "string"],
      ["Number", "number"],
      ["boolean", "boolean"],
      ["ArRaY", "array"],
      ["OBJECT", "object"],
    ])("normalizes the known type %s", (input, expected) => {
      expect(ComponentMetadataUtils.normalizePropertyType(input)).toBe(expected);
    });

    it.each(["Date", "Example | null", "", " string "])(
      "preserves the custom type %j",
      input => {
        expect(ComponentMetadataUtils.normalizePropertyType(input)).toBe(input);
      },
    );
  });

  describe("defaultValueFromExpression", () => {
    it.each([
      [expression({type: "StringLiteral", value: "ready"}), "ready"],
      [expression({type: "BooleanLiteral", value: false}), "false"],
      [expression({type: "NumericLiteral", value: 0}), "0"],
      [expression({type: "BigIntLiteral", value: 42n}), "42"],
      [expression({type: "NullLiteral"}), "null"],
      [expression({type: "Identifier", value: "DEFAULT_MODE"}), "DEFAULT_MODE"],
    ])("serializes a supported %s initializer", (input, expected) => {
      expect(ComponentMetadataUtils.defaultValueFromExpression(input)).toBe(expected);
    });

    it("returns undefined when the initializer is absent", () => {
      expect(ComponentMetadataUtils.defaultValueFromExpression(null)).toBeUndefined();
    });

    it("returns undefined for a complex initializer", () => {
      const input = expression({
        type: "CallExpression",
        callee: expression({type: "Identifier", value: "createDefault"}),
        arguments: [],
      });

      expect(ComponentMetadataUtils.defaultValueFromExpression(input)).toBeUndefined();
    });
  });

  describe("sortWebComponentInfos", () => {
    it("sorts components and properties by their stable metadata keys", () => {
      const sortableProperties = [
        property("missing-source", {propertyName: "actual"}),
        property("type-z", {
          propertyName: "actual",
          type: "z-type",
          source: {file: "a.ts", offset: 1},
        }),
        property("type-a", {
          propertyName: "actual",
          type: "a-type",
          source: {file: "a.ts", offset: 1},
        }),
        property("later-file", {
          propertyName: "actual",
          source: {file: "z.ts", offset: 1},
        }),
        property("later-offset", {
          propertyName: "actual",
          source: {file: "a.ts", offset: 2},
        }),
        property("property-name", {propertyName: "z-field"}),
        property("attribute-name", {name: "z-mode"}),
      ];
      const input = [
        component("tag-z", {tagName: "z-component"}),
        component("missing-source", {tagName: "a-component", className: "AlphaComponent"}),
        component("offset-20", {
          tagName: "a-component",
          className: "AlphaComponent",
          source: {file: "a.ts", offset: 20},
        }),
        component("offset-10", {
          tagName: "a-component",
          className: "AlphaComponent",
          source: {file: "a.ts", offset: 10},
          properties: sortableProperties,
        }),
        component("file-z", {
          tagName: "a-component",
          className: "AlphaComponent",
          source: {file: "z.ts", offset: 1},
        }),
        component("class-z", {tagName: "a-component", className: "ZuluComponent"}),
      ];

      const result = ComponentMetadataUtils.sortWebComponentInfos(input);

      expect(result.map(item => item.description)).toEqual([
        "offset-10",
        "offset-20",
        "file-z",
        "missing-source",
        "class-z",
        "tag-z",
      ]);
      expect(result[0]?.properties.map(item => item.description)).toEqual([
        "type-a",
        "type-z",
        "later-file",
        "later-offset",
        "missing-source",
        "property-name",
        "attribute-name",
      ]);
    });

    it("returns copied arrays without mutating the scan result", () => {
      const originalProperties = [
        property("second", {name: "z-mode"}),
        property("first", {name: "a-mode"}),
      ];
      const originalComponent = component("component", {properties: originalProperties});
      const input = [originalComponent];

      const result = ComponentMetadataUtils.sortWebComponentInfos(input);

      expect(result).not.toBe(input);
      expect(result[0]).not.toBe(originalComponent);
      expect(result[0]?.properties).not.toBe(originalProperties);
      expect(result[0]?.properties.map(item => item.name)).toEqual(["a-mode", "z-mode"]);
      expect(originalProperties.map(item => item.name)).toEqual(["z-mode", "a-mode"]);
    });

    it("returns an empty array for an empty scan result", () => {
      expect(ComponentMetadataUtils.sortWebComponentInfos([])).toEqual([]);
    });
  });
});
