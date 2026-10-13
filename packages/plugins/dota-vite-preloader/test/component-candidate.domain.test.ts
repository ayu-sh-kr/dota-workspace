import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";
import {extractRouteCandidatesFromComponents, scanDotaComponents} from "@dota/domain";

const directories: string[] = [];

/**
 * Creates a throwaway project root containing one component and one page.
 * @returns Absolute root that differs from the test process's working directory.
 */
async function createProjectRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dota-preloader-"));
  directories.push(root);
  await mkdir(join(root, "src/components"), {recursive: true});
  await mkdir(join(root, "src/pages"), {recursive: true});
  await writeFile(join(root, "src/components/badge.component.ts"),
    "@Component({selector: 'app-badge'}) export class BadgeComponent {}");
  await writeFile(join(root, "src/pages/home.page.ts"),
    "@Route({path: '/'}) @Component({selector: 'home-page'}) export class HomePage {}");
  return root;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, {recursive: true, force: true})));
});

describe("component-candidate.domain", () => {
  it("reads sources from the configured root rather than the process directory", async () => {
    const root = await createProjectRoot();
    expect(process.cwd()).not.toBe(root);

    const components = await scanDotaComponents(root, {});
    const routes = await extractRouteCandidatesFromComponents(components, root, {});

    expect(components.map(({name, tagName}) => ({name, tagName})).sort((left, right) => left.name.localeCompare(right.name))).toEqual([
      {name: "BadgeComponent", tagName: "app-badge"},
      {name: "HomePage", tagName: "home-page"},
    ]);
    expect(components.every(component => !component.filePath.startsWith("/"))).toBe(true);
    expect(routes.map(({name, path}) => ({name, path}))).toEqual([{name: "HomePage", path: "/"}]);
  });

  it("logs and skips a file that cannot be parsed", async () => {
    const root = await createProjectRoot();
    await writeFile(join(root, "src/components/broken.component.ts"), "export class {");
    const error = vi.fn();

    const components = await scanDotaComponents(root, {error});

    expect(components.map(component => component.name).sort()).toEqual(["BadgeComponent", "HomePage"]);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("broken.component.ts"));
  });
});
