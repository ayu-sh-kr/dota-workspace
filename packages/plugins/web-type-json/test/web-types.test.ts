import {afterEach, describe, expect, it, vi} from "vitest";
import {cp, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {dirname, join, resolve} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import fg from "fast-glob";
import type {ResolvedConfig} from "vite";
import dotaWebTypeJson, {
  createWebTypesSchema,
  resetWebTypeJsonState,
  scanWebComponents,
} from "@dota/main.ts";
import type {WebComponentInfo} from "@dota/Types.ts";


const mockState = vi.hoisted(() => ({
  files: [] as string[],
}));


vi.mock("fast-glob", () => ({
  default: vi.fn(async () => mockState.files),
}));


const mockedFg = vi.mocked(fg);
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
};

type FixtureName = "none" | "single" | "many";


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


function createPlugin(root: string, outFile = defaultOutFile, outDir = "dist") {
  const plugin = dotaWebTypeJson({
    root,
    outFile,
    logType: "info",
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
                  type: "String",
                  description: undefined,
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
              name: "many-page",
              source: {
                file: "/tmp/many.page.ts",
                offset: 8,
              },
              attributes: [
                {
                  name: "heading",
                  type: "String",
                  description: undefined,
                  default: undefined,
                  required: true,
                  source: undefined,
                },
              ],
            },
          ],
        },
      },
    });
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
        absolute: false,
      },
    );
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
        file: resolve(root, "src/components/alpha.component.ts"),
        offset: expect.any(Number),
      },
      properties: [
        {
          name: "title",
          type: "String",
          required: false,
          source: {
            file: resolve(root, "src/components/alpha.component.ts"),
            offset: expect.any(Number),
          },
        },
      ],
    });
    expect(scannedWebComponents[1]).toMatchObject({
      source: {
        file: resolve(root, "src/components/beta.component.ts"),
        offset: expect.any(Number),
      },
      properties: [
        {
          name: "enabled",
          type: "Boolean",
          required: false,
          source: {
            file: resolve(root, "src/components/beta.component.ts"),
            offset: expect.any(Number),
          },
        },
      ],
    });
    expect(scannedWebComponents[2]).toMatchObject({
      source: {
        file: resolve(root, "src/pages/many.page.ts"),
        offset: expect.any(Number),
      },
      properties: [
        {
          name: "heading",
          type: "String",
          required: false,
          source: {
            file: resolve(root, "src/pages/many.page.ts"),
            offset: expect.any(Number),
          },
        },
      ],
    });
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

  it("writes the root artifact during build and the dist copy during closeBundle", async () => {
    // Arrange
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root, defaultOutFile, "dist");

    // Act
    await invokePluginHook(plugin.buildStart, plugin);
    await invokePluginHook(plugin.closeBundle, plugin);

    // Assert
    const rootJson = await readJsonFile<Record<string, unknown>>(resolve(root, defaultOutFile));
    const distJson = await readJsonFile<Record<string, unknown>>(resolve(root, "dist", defaultOutFile));

    expect(rootJson).toEqual(distJson);
    expect(rootJson).toMatchObject({
      contributions: {
        html: {
          elements: [
            {
              name: "single-component",
              source: {
                file: resolve(root, "src/components/single.component.ts"),
                offset: expect.any(Number),
              },
              attributes: [
                {
                  name: "label",
                  type: "String",
                  required: false,
                  source: {
                    file: resolve(root, "src/components/single.component.ts"),
                    offset: expect.any(Number),
                  },
                },
              ],
            },
          ],
        },
      },
    });
  });
});


describe("watch regeneration", () => {
  it("rebuilds web-types.json when a source file changes", async () => {
    // Arrange
    const root = await prepareFixtureRoot("single");
    prepareFastGlobFiles(root, "single");
    const plugin = createPlugin(root, defaultOutFile, "dist");
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

    expect(afterChange.contributions.html.elements[0]?.name).toBe("single-component-renamed");
    expect(watcher.on).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
