import {afterEach, describe, expect, it, vi} from "vitest";
import {access, cp, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {dirname, join, resolve} from "node:path";
import {tmpdir} from "node:os";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import fg from "fast-glob";
import Ajv from "ajv";
import type {ResolvedConfig} from "vite";
import dotaWebTypeJson, {
  createCustomElementsManifest,
  createWebTypesSchema,
  resetWebTypeJsonState,
  scanWebComponents,
} from "@dota/main.ts";
import type {CustomElementsManifestConfig, CustomElementsManifestSchema, WebComponentInfo} from "@dota/Types.ts";


const mockState = vi.hoisted(() => ({
  files: [] as string[],
}));


vi.mock("fast-glob", () => ({
  default: vi.fn(async () => mockState.files),
}));


const mockedFg = vi.mocked(fg);
const customElementsManifestJsonSchema = createRequire(import.meta.url)("custom-elements-manifest") as object;
const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");
const defaultOutFile = "web-types.json";
const fixtureFiles: Record<FixtureName, string[]> = {
  none: [],
  single: ["src/components/single.component.ts"],
  many: [
    "src/components/alpha.component.ts",
    "src/components/beta.component.ts",
    "src/pages/many.page.ts",
  ],
  "named-export": ["src/components/named-export.component.ts"],
};

type FixtureName = "none" | "single" | "many" | "named-export";


const tempRoots: string[] = [];


function createResolvedConfig(outDir = "dist") {
  return {
    build: {
      outDir,
    },
  } as ResolvedConfig;
}


async function prepareFixtureRoot(fixture: FixtureName) {
  const root = await mkdtemp(join(tmpdir(), "dota-web-type-json-"));
  tempRoots.push(root);

  await cp(resolve(fixturesDir, fixture), root, {recursive: true});
  await writeFile(
    resolve(root, "package.json"),
    `${JSON.stringify({
      name: `fixture-${fixture}`,
      version: "0.0.0",
    }, null, 2)}\n`,
    "utf-8",
  );

  return root;
}


function prepareFastGlobFiles(root: string, fixture: FixtureName) {
  mockState.files = fixtureFiles[fixture].map(file => resolve(root, file));
}


async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}


async function invokePluginHook<TArgs extends unknown[]>(
  hook: unknown,
  thisArg: unknown,
  ...args: TArgs
) {
  if (hook == null) {
    return;
  }

  if (typeof hook === "function") {
    return await hook.apply(thisArg, args);
  }

  if (typeof hook === "object" && "handler" in hook && typeof (hook as { handler?: unknown }).handler === "function") {
    return await (hook as { handler: (...hookArgs: TArgs) => unknown }).handler.apply(thisArg, args);
  }
}


function createPlugin(
  root: string,
  outFile = defaultOutFile,
  outDir = "dist",
  customElementsManifest?: boolean | CustomElementsManifestConfig,
) {
  const plugin = dotaWebTypeJson({
    root,
    outFile,
    logType: "info",
    customElementsManifest,
  });

  void invokePluginHook(plugin.configResolved, plugin, createResolvedConfig(outDir));

  return plugin;
}


function createWatcherHarness() {
  const handlers = new Map<string, (file: string) => Promise<void> | void>();
  let watcher: {
    on: (event: string, callback: (file: string) => Promise<void> | void) => unknown;
  };

  watcher = {
    on: vi.fn((event: string, callback: (file: string) => Promise<void> | void) => {
      handlers.set(event, callback);
      return watcher;
    }),
  };

  return {handlers, watcher};
}


afterEach(async () => {
  resetWebTypeJsonState();
  mockState.files = [];
  vi.clearAllMocks();

  await Promise.all(tempRoots.map(root => rm(root, {recursive: true, force: true})));
  tempRoots.length = 0;
});


describe("createWebTypesSchema", () => {
  it("returns an empty html contribution when there are no scanned components", () => {
    // Arrange
    const scannedWebComponentInfos: WebComponentInfo[] = [];

    // Act
    const schema = createWebTypesSchema(scannedWebComponentInfos);

    // Assert
    expect(schema).toEqual({
      $schema: "https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json",
      name: "",
      version: "",
      contributions: {
        html: {
          elements: [],
        },
      },
    });
  });

  it("maps multiple components and attributes into the schema", () => {
    // Arrange
    const scannedWebComponentInfos: WebComponentInfo[] = [
      {
        className: "SingleComponent",
        tagName: "single-component",
        source: {
          file: "/tmp/single.component.ts",
          offset: 12,
        },
        properties: [
          {
            name: "label",
            type: "String",
            default: "hello",
            required: false,
            source: {
              file: "/tmp/single.component.ts",
              offset: 42,
            },
          },
        ],
      },
      {
        className: "ManyPage",
        tagName: "many-page",
        source: {
          file: "/tmp/many.page.ts",
          offset: 8,
        },
        properties: [
          {
            name: "heading",
            type: "String",
            required: true,
          },
        ],
      },
    ];

    // Act
    const schema = createWebTypesSchema(scannedWebComponentInfos);

    // Assert
    expect(schema).toEqual({
      $schema: "https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json",
      name: "",
      version: "",
      contributions: {
        html: {
          elements: [
            {
              name: "single-component",
              source: {
                file: "/tmp/single.component.ts",
                offset: 12,
              },
              attributes: [
                {
                  name: "label",
                  description: undefined,
                  default: "hello",
                  required: false,
                  value: {
                    type: "string",
                  },
                  source: {
                    file: "/tmp/single.component.ts",
                    offset: 42,
                  },
                },
              ],
              js: {
                properties: [
                  {
                    name: "label",
                    type: "string",
                    description: undefined,
                    default: "hello",
                    source: {
                      file: "/tmp/single.component.ts",
                      offset: 42,
                    },
                  },
                ],
              },
            },
            {
              name: "many-page",
              source: {
                file: "/tmp/many.page.ts",
                offset: 8,
              },
              attributes: [
                {
                  name: "heading",
                  description: undefined,
                  default: undefined,
                  required: true,
                  value: {
                    type: "string",
                  },
                  source: undefined,
                },
              ],
              js: {
                properties: [
                  {
                    name: "heading",
                    type: "string",
                    description: undefined,
                    default: undefined,
                    source: undefined,
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });

  it("emits typed HTML values and JavaScript properties", () => {
    const schema = createWebTypesSchema([
      {
        className: "TypedComponent",
        tagName: "typed-component",
        properties: [
          {name: "enabled", type: "Boolean"},
          {name: "count", type: "Number"},
        ],
      },
    ]);

    const element = schema.contributions.html.elements[0];

    expect(element?.attributes).toEqual([
      {
        name: "enabled",
        description: undefined,
        default: undefined,
        required: undefined,
        value: {type: "boolean"},
        source: undefined,
      },
      {
        name: "count",
        description: undefined,
        default: undefined,
        required: undefined,
        value: {type: "number"},
        source: undefined,
      },
    ]);
    expect(element?.js).toEqual({
      properties: [
        {name: "enabled", type: "boolean", description: undefined, default: undefined, source: undefined},
        {name: "count", type: "number", description: undefined, default: undefined, source: undefined},
      ],
    });
  });

  it("keeps the HTML attribute name separate from the JavaScript property name", () => {
    const schema = createWebTypesSchema([{
      className: "LoaderSectionComponent",
      tagName: "loader-section",
      properties: [{
        name: "is-loader",
        propertyName: "isLoading",
        type: "Boolean",
      }],
    }]);

    const element = schema.contributions.html.elements[0];

    expect(element?.attributes[0]?.name).toBe("is-loader");
    expect(element?.js?.properties[0]?.name).toBe("isLoading");
  });
});


describe("createCustomElementsManifest", () => {
  it("maps component fields, attributes, exports, defaults, and module paths", () => {
    const root = "/workspace/package";
    const manifest = createCustomElementsManifest([{
      className: "LoaderSectionComponent",
      tagName: "loader-section",
      description: "Displays a full-screen loading state.",
      exported: true,
      sourceFile: `${root}/src/components/loader-section.component.ts`,
      superclass: "BaseElement",
      properties: [{
        name: "is-loader",
        propertyName: "isLoading",
        type: "Boolean",
        default: "false",
        required: false,
      }],
    }], {root});

    expect(manifest).toEqual({
      schemaVersion: "2.1.0",
      modules: [{
        kind: "javascript-module",
        path: "src/components/loader-section.component.js",
        declarations: [{
          kind: "class",
          name: "LoaderSectionComponent",
          customElement: true,
          tagName: "loader-section",
          description: "Displays a full-screen loading state.",
          superclass: {name: "BaseElement"},
          members: [{
            kind: "field",
            name: "isLoading",
            attribute: "is-loader",
            description: undefined,
            type: {text: "boolean"},
            default: "false",
          }],
          attributes: [{
            name: "is-loader",
            fieldName: "isLoading",
            description: undefined,
            type: {text: "boolean"},
            default: "false",
          }],
        }],
        exports: [{
          kind: "js",
          name: "LoaderSectionComponent",
          declaration: {name: "LoaderSectionComponent"},
        }, {
          kind: "custom-element-definition",
          name: "loader-section",
          declaration: {name: "LoaderSectionComponent"},
        }],
      }],
    });
  });

  it("excludes components owned by external scan roots", () => {
    const manifest = createCustomElementsManifest([{
      className: "ExternalComponent",
      tagName: "external-component",
      sourceFile: "/workspace/external/src/external.component.ts",
      exported: true,
      properties: [],
    }], {root: "/workspace/package"});

    expect(manifest.modules).toEqual([]);
  });

  it("uses a package-provided published module path mapper", () => {
    const root = "/workspace/package";
    const manifest = createCustomElementsManifest([{
      className: "MappedComponent",
      tagName: "mapped-component",
      sourceFile: `${root}/src/mapped.component.ts`,
      properties: [],
    }], {
      root,
      modulePath: sourceFile => `dist/${sourceFile.split("/").at(-1)?.replace(/\.ts$/, ".mjs")}`,
    });

    expect(manifest.modules[0]?.path).toBe("dist/mapped.component.mjs");
  });

  it("rejects a module path that escapes the owning package", () => {
    const root = "/workspace/package";

    expect(() => createCustomElementsManifest([{
      className: "EscapingComponent",
      tagName: "escaping-component",
      sourceFile: `${root}/src/escaping.component.ts`,
      properties: [],
    }], {
      root,
      modulePath: () => "../external/escaping.component.js",
    })).toThrow("Invalid Custom Elements Manifest module path");
  });
});


describe("scanWebComponents", () => {
  it("returns an empty list when the fixture contains no components", async () => {
    // Arrange
    const root = await prepareFixtureRoot("none");
    prepareFastGlobFiles(root, "none");
    createPlugin(root);

    // Act
    const scannedWebComponents = await scanWebComponents(root);

    // Assert
    expect(scannedWebComponents).toEqual([]);
    expect(mockedFg).toHaveBeenCalledWith(
      [
        "./src/**/*.component.ts",
        "./src/components/**/*.component.ts",
        "./src/pages/**/*.page.ts",
      ],
      {
        cwd: root,
        absolute: true,
      },
    );
  });

  it("discovers a component declared as class + export {} (named-export pattern)", async () => {
    // Arrange
    const root = await prepareFixtureRoot("named-export");
    prepareFastGlobFiles(root, "named-export");
    createPlugin(root);

    // Act
    const scannedWebComponents = await scanWebComponents(root);

    // Assert
    expect(scannedWebComponents).toHaveLength(1);
    expect(scannedWebComponents[0]).toMatchObject({
      className: "NamedExportComponent",
      tagName: "named-export-component",
      exported: true,
      exportName: "NamedExportComponent",
      sourceFile: resolve(root, "src/components/named-export.component.ts"),
      source: {
        file: "./src/components/named-export.component.ts",
        offset: expect.any(Number),
      },
      properties: [
        {
          name: "label",
          propertyName: "label",
          type: "String",
          default: "",
          required: false,
        },
      ],
    });
  });

  it("discovers every component-like class in the many fixture", async () => {
    // Arrange
    const root = await prepareFixtureRoot("many");
    prepareFastGlobFiles(root, "many");
    createPlugin(root);

    // Act
    const scannedWebComponents = await scanWebComponents(root);

    // Assert
    expect(scannedWebComponents).toHaveLength(3);
    expect(scannedWebComponents.map(component => component.tagName)).toEqual([
      "alpha-component",
      "beta-component",
      "many-page",
    ]);
    expect(scannedWebComponents.map(component => component.className)).toEqual([
      "AlphaComponent",
      "BetaComponent",
      "ManyPage",
    ]);
    expect(scannedWebComponents[0]).toMatchObject({
      source: {
        file: "./src/components/alpha.component.ts",
        offset: expect.any(Number),
      },
      properties: [
        {
          name: "title",
          propertyName: "title",
          type: "String",
          default: "alpha",
          required: false,
          source: {
            file: "./src/components/alpha.component.ts",
            offset: expect.any(Number),
          },
        },
      ],
    });
    expect(scannedWebComponents[1]).toMatchObject({
      source: {
        file: "./src/components/beta.component.ts",
        offset: expect.any(Number),
      },
      properties: [
        {
          name: "enabled",
          propertyName: "enabled",
          type: "Boolean",
          default: "true",
          required: false,
          source: {
            file: "./src/components/beta.component.ts",
            offset: expect.any(Number),
          },
        },
      ],
    });
    expect(scannedWebComponents[2]).toMatchObject({
      source: {
        file: "./src/pages/many.page.ts",
        offset: expect.any(Number),
      },
      properties: [
        {
          name: "heading",
          propertyName: "heading",
          type: "String",
          default: "many",
          required: false,
          source: {
            file: "./src/pages/many.page.ts",
            offset: expect.any(Number),
          },
        },
      ],
    });
  });

  it("returns components in deterministic order even when fast-glob returns unsorted files", async () => {
    // Arrange
    const root = await prepareFixtureRoot("many");
    mockState.files = [
      resolve(root, "src/pages/many.page.ts"),
      resolve(root, "src/components/beta.component.ts"),
      resolve(root, "src/components/alpha.component.ts"),
    ];
    createPlugin(root);

    // Act
    const scannedWebComponents = await scanWebComponents(root);

    // Assert
    expect(scannedWebComponents.map(component => component.tagName)).toEqual([
      "alpha-component",
      "beta-component",
      "many-page",
    ]);
  });
});


describe("web-types artifact generation", () => {
  it("writes an empty web-types.json when no components are found", async () => {
    // Arrange
    const root = await prepareFixtureRoot("none");
    prepareFastGlobFiles(root, "none");
    const plugin = createPlugin(root);

    // Act
    await invokePluginHook(plugin.buildStart, plugin);

    // Assert
    const webTypesJson = await readJsonFile<{
      contributions: { html: { elements: Array<Record<string, unknown>> } };
    }>(resolve(root, defaultOutFile));
    const packageJson = await readJsonFile<{ "web-types"?: string }>(resolve(root, "package.json"));

    expect(webTypesJson.contributions.html.elements).toEqual([]);
    expect(packageJson["web-types"]).toBe(`./${defaultOutFile}`);
  });

  it("writes web-types.json to root on buildStart and sets package.json web-types entry", async () => {
    // Arrange
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root, defaultOutFile, "dist");

    // Act
    await invokePluginHook(plugin.buildStart, plugin);

    // Assert
    const rootJson = await readJsonFile<Record<string, unknown>>(resolve(root, defaultOutFile));
    const packageJson = await readJsonFile<{ "web-types"?: string }>(resolve(root, "package.json"));

    expect(packageJson["web-types"]).toBe(`./${defaultOutFile}`);
    expect(rootJson).toMatchObject({
      contributions: {
        html: {
          elements: [
            {
              name: "single-component",
              source: {
                file: "./src/components/single.component.ts",
                offset: expect.any(Number),
              },
              attributes: [
                {
                  name: "label",
                  required: false,
                  value: {
                    type: "string",
                  },
                  source: {
                    file: "./src/components/single.component.ts",
                    offset: expect.any(Number),
                  },
                },
              ],
              js: {
                properties: [
                  {
                    name: "label",
                    type: "string",
                    source: {
                      file: "./src/components/single.component.ts",
                      offset: expect.any(Number),
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });

  it("does not create or register a Custom Elements Manifest by default", async () => {
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root);

    await invokePluginHook(plugin.buildStart, plugin);

    await expect(access(resolve(root, "custom-elements.json"))).rejects.toThrow();
    const packageJson = await readJsonFile<{customElements?: string}>(resolve(root, "package.json"));
    expect(packageJson.customElements).toBeUndefined();
  });

  it("generates schema-valid Web Types and CEM artifacts from one scan", async () => {
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root, defaultOutFile, "dist", true);
    mockedFg.mockClear();

    await invokePluginHook(plugin.buildStart, plugin);

    const customElementsManifest = await readJsonFile<CustomElementsManifestSchema>(
      resolve(root, "custom-elements.json"),
    );
    const packageJson = await readJsonFile<{
      "web-types"?: string;
      customElements?: string;
    }>(resolve(root, "package.json"));
    const validate = new Ajv({strict: false}).compile(customElementsManifestJsonSchema);

    expect(mockedFg).toHaveBeenCalledTimes(1);
    expect(validate(customElementsManifest), validate.errors?.map(error => error.message).join("\n")).toBe(true);
    expect(packageJson).toMatchObject({
      "web-types": "./web-types.json",
      customElements: "custom-elements.json",
    });
    expect(customElementsManifest).toMatchObject({
      schemaVersion: "2.1.0",
      modules: [{
        kind: "javascript-module",
        path: "src/components/single.component.js",
        declarations: [{
          kind: "class",
          name: "SingleComponent",
          customElement: true,
          tagName: "single-component",
          members: [{
            kind: "field",
            name: "label",
            attribute: "label",
            type: {text: "string"},
            default: "hello",
          }],
          attributes: [{
            name: "label",
            fieldName: "label",
            type: {text: "string"},
            default: "hello",
          }],
        }],
        exports: [{
          kind: "js",
          name: "SingleComponent",
        }, {
          kind: "custom-element-definition",
          name: "single-component",
        }],
      }],
    });
  });

  it("supports detailed CEM output config without registering package.json", async () => {
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root, defaultOutFile, "dist", {
      enabled: true,
      outFile: "component-manifest.json",
      updatePackageJson: false,
      modulePath: sourceFile => `dist/${sourceFile.split("/").at(-1)?.replace(/\.ts$/, ".js")}`,
    });

    await invokePluginHook(plugin.buildStart, plugin);

    const manifest = await readJsonFile<CustomElementsManifestSchema>(resolve(root, "component-manifest.json"));
    const packageJson = await readJsonFile<{customElements?: string}>(resolve(root, "package.json"));
    expect(manifest.modules[0]?.path).toBe("dist/single.component.js");
    expect(packageJson.customElements).toBeUndefined();
  });

  it("produces byte-for-byte stable artifacts across unchanged builds", async () => {
    const root = await prepareFixtureRoot("many");
    prepareFastGlobFiles(root, "many");
    const plugin = createPlugin(root, defaultOutFile, "dist", true);

    await invokePluginHook(plugin.buildStart, plugin);
    const firstWebTypes = await readFile(resolve(root, defaultOutFile), "utf-8");
    const firstManifest = await readFile(resolve(root, "custom-elements.json"), "utf-8");

    await invokePluginHook(plugin.buildStart, plugin);
    const secondWebTypes = await readFile(resolve(root, defaultOutFile), "utf-8");
    const secondManifest = await readFile(resolve(root, "custom-elements.json"), "utf-8");

    expect(secondWebTypes).toBe(firstWebTypes);
    expect(secondManifest).toBe(firstManifest);
  });
});


describe("watch regeneration", () => {
  it("rebuilds every enabled artifact when a source file changes", async () => {
    // Arrange
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root, defaultOutFile, "dist", true);
    const {handlers, watcher} = createWatcherHarness();

    void invokePluginHook(plugin.configureServer, plugin, {
      watcher,
    } as never);

    await invokePluginHook(plugin.buildStart, plugin);
    const beforeChange = await readJsonFile<{
      contributions: { html: { elements: Array<{ name: string }> } };
    }>(resolve(root, defaultOutFile));
    expect(beforeChange.contributions.html.elements[0]?.name).toBe("single-component");

    const updatedCode = (await readFile(resolve(root, "src/components/single.component.ts"), "utf-8"))
      .replace("single-component", "single-component-renamed");
    await writeFile(resolve(root, "src/components/single.component.ts"), updatedCode, "utf-8");

    // Act
    await handlers.get("change")?.(resolve(root, "src/components/single.component.ts"));

    // Assert
    const afterChange = await readJsonFile<{
      contributions: { html: { elements: Array<{ name: string }> } };
    }>(resolve(root, defaultOutFile));
    const customElementsManifest = await readJsonFile<CustomElementsManifestSchema>(
      resolve(root, "custom-elements.json"),
    );

    expect(afterChange.contributions.html.elements[0]?.name).toBe("single-component-renamed");
    expect(customElementsManifest.modules[0]?.declarations[0]?.tagName).toBe("single-component-renamed");
    expect(watcher.on).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("ignores watcher changes for non-component files", async () => {
    // Arrange
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root, defaultOutFile, "dist");
    const {handlers} = createWatcherHarness();

    void invokePluginHook(plugin.configureServer, plugin, {
      watcher: {
        on: vi.fn((event: string, callback: (file: string) => Promise<void> | void) => {
          handlers.set(event, callback);
        }),
      },
    } as never);

    await invokePluginHook(plugin.buildStart, plugin);
    mockedFg.mockClear();

    // Act
    await handlers.get("change")?.(resolve(root, "package.json"));

    // Assert
    expect(mockedFg).not.toHaveBeenCalled();
  });
});
