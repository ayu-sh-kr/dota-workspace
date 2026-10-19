import {describe, expect, it} from "vitest";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {prepareSharedChunkGroup, readHtmlModuleEntries} from "@dota/domain";

describe("shared-chunk.domain", () => {
  const group = prepareSharedChunkGroup("/app", ["/app/src/main.ts"]);

  it("groups support modules shared under the project source", () => {
    expect(group).toMatchObject({name: "app-shared", tags: ["$initial"], minShareCount: 2});
    expect(group.test("/app/src/configs/blogs.config.ts")).toBe(true);
    expect(group.test("/app/src/service/state.service.ts?import")).toBe(true);
  });

  it("leaves components, pages, styles, dependencies, and files outside src alone", () => {
    expect(group.test("/app/src/components/header.component.ts")).toBe(false);
    expect(group.test("/app/src/pages/home.page.ts")).toBe(false);
    expect(group.test("/app/src/style.css")).toBe(false);
    expect(group.test("/app/src/node_modules/x/index.js")).toBe(false);
    expect(group.test("/app/node_modules/@ayu-sh-kr/dota-ui/dist/dota-ui.mjs")).toBe(false);
    expect(group.test("/app/vite.config.ts")).toBe(false);
    expect(group.test("/app/src/main.ts")).toBe(false);
  });
});

describe("readHtmlModuleEntries", () => {
  it("resolves the module scripts index.html loads", async () => {
    const root = await mkdtemp(join(tmpdir(), "dota-entries-"));
    await writeFile(join(root, "index.html"), '<script>x</script><script type="module" src="/src/main.ts"></script>');

    expect(readHtmlModuleEntries(root)).toEqual([join(root, "src/main.ts")]);
    await rm(root, {recursive: true, force: true});
  });

  it("returns no entries without an index.html", () => {
    expect(readHtmlModuleEntries("/no/such/project")).toEqual([]);
  });
});
