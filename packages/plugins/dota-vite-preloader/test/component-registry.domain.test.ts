import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {
  buildComponentDependencyGraph,
  extractTemplateTags,
  isRegistryOnlyIneffectiveImport,
  prepareComponentRegistryExport,
  scanDotaComponents
} from "@dota/domain";

const directories: string[] = [];

/**
 * Creates a project whose page renders a header, which renders a library icon.
 * @returns Absolute project root.
 */
async function createProjectRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dota-registry-"));
  directories.push(root);
  await mkdir(join(root, "src/components"), {recursive: true});
  await mkdir(join(root, "src/pages"), {recursive: true});
  await writeFile(join(root, "src/components/header.component.ts"),
    "@Component({selector: 'app-header'}) export class HeaderComponent { render() { return `<nav class=\"top-bar\"><dota-icon name=\"x\"></dota-icon></nav>`; } }");
  await writeFile(join(root, "src/components/toast.component.ts"),
    "@Component({selector: 'app-toast'}) export class ToastComponent {}");
  await writeFile(join(root, "src/pages/home.page.ts"),
    "@Route({path: '/'}) @Component({selector: 'home-page'}) export class HomePage { render() { document.createElement('app-toast'); return `<app-header></app-header><home-page-unused-class>`; } }");
  return root;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, {recursive: true, force: true})));
});

describe("component-registry.domain", () => {
  it("extracts opening tags and quoted tag names", () => {
    expect(extractTemplateTags("<app-header a='1'></app-header><x-y/> 'app-toast' <div>")).toEqual(["app-header", "x-y", "app-toast"]);
  });

  it("maps each selector to the tags its file renders", async () => {
    const root = await createProjectRoot();
    const candidates = await scanDotaComponents(root, {});

    const graph = await buildComponentDependencyGraph(candidates, root, {});

    expect(graph["home-page"]).toEqual(expect.arrayContaining(["app-toast", "app-header"]));
    expect(graph["app-header"]).toEqual(["dota-icon"]);
    expect(graph["app-toast"]).toEqual([]);
  });

  it("emits one lazy loader per selector with its dependencies", () => {
    const graph = {"app-header": ["dota-icon"]};
    const source = prepareComponentRegistryExport([{name: "HeaderComponent", filePath: "src/components/header.component.ts", tagName: "app-header"}], graph);

    expect(source).toContain(`"app-header": () => import("./src/components/header.component.ts").then(m => m.HeaderComponent)`);
    expect(source).toContain(`dependencies: {"app-header":["dota-icon"]}`);
  });

  it("drops ineffective dynamic imports caused only by the registry", () => {
    const message = (importers: string) =>
      `src/pages/home.page.ts is dynamically imported by ${importers} but also statically imported by \0virtual:dota-routes, src/pages/index.ts, dynamic import will not move module into another chunk.`;

    expect(isRegistryOnlyIneffectiveImport({code: "INEFFECTIVE_DYNAMIC_IMPORT", message: message("\0virtual:dota-component-registry")})).toBe(true);
    expect(isRegistryOnlyIneffectiveImport({code: "INEFFECTIVE_DYNAMIC_IMPORT", message: message("\\0virtual:dota-component-registry")})).toBe(true);
  });

  it("keeps ineffective dynamic imports that other modules also cause", () => {
    const message = "src/pages/home.page.ts is dynamically imported by \0virtual:dota-component-registry, src/main.ts but also statically imported by src/pages/index.ts, dynamic import will not move module into another chunk.";

    expect(isRegistryOnlyIneffectiveImport({code: "INEFFECTIVE_DYNAMIC_IMPORT", message})).toBe(false);
    expect(isRegistryOnlyIneffectiveImport({code: "PLUGIN_WARNING", message: "virtual:dota-component-registry"})).toBe(false);
    expect(isRegistryOnlyIneffectiveImport({code: "INEFFECTIVE_DYNAMIC_IMPORT"})).toBe(false);
  });
});
