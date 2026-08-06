import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";
import {Module, parseSync} from "@swc/core";
import {
  extractRouteCandidatesFromAst,
  extractRouteCandidatesFromComponents,
  isRouteMetadataChanged,
  prepareRouteMetadataExport,
  prepareRouteConfigExport,
  type DotaRouteCandidate
} from "@dota/domain";
import type {DotaComponentCandidate} from "@dota/domain";

function loadRouteFixture(): { ast: Module; source: string } {
  const source = readFileSync(resolve(process.cwd(), "test/fixtures/route.page.ts"), "utf8");
  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: false,
    decorators: true
  }) as Module;

  return {ast, source};
}

describe("route-candidate.domain", () => {
  it("determines route candidates from a path-backed page fixture", async () => {
    const componentCandidates: DotaComponentCandidate[] = [
      {
        name: "HomePage",
        filePath: "test/fixtures/route.page.ts",
        tagName: "home-page"
      }
    ];

    const candidates = await extractRouteCandidatesFromComponents(componentCandidates, process.cwd());

    expect(candidates).toHaveLength(2);
    expect(candidates.map(candidate => candidate.name)).toEqual(["HomePage", "DocsPage"]);
    expect(candidates.map(candidate => candidate.path)).toEqual(["/", "/docs"]);
    expect(candidates[0]).toMatchObject({
      name: "HomePage",
      filePath: "test/fixtures/route.page.ts",
      path: "/",
      ssr: true,
      default: true
    });
  });

  it("extracts annotation data from the route decorator fixture", () => {
    const {ast, source} = loadRouteFixture();
    const candidates = extractRouteCandidatesFromAst(ast, source);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      name: "HomePage",
      path: "/",
      ssr: true,
      default: true
    });
    expect(candidates[1]).toMatchObject({
      name: "DocsPage",
      path: "/docs",
    });
    expect(candidates[1].render).toContain("return path");
    expect(candidates[1].render).toContain("path");
  });

  it("formats the exported route array correctly", async () => {
    const candidates: DotaRouteCandidate[] = [
      {
        name: "HomePage",
        filePath: "test/fixtures/route.page.ts",
        path: "/",
        ssr: true,
        default: true
      },
      {
        name: "DocsPage",
        filePath: "test/fixtures/route.page.ts",
        path: "/docs"
      }
    ];

    const source = await prepareRouteConfigExport(candidates);

    expect(source).toBe(
      [
        "import { HomePage } from './test/fixtures/route.page.ts';",
        "import { DocsPage } from './test/fixtures/route.page.ts';",
        "",
        "export const routeConfig = [{ path: '/', component: HomePage, ssr: true, default: true }, { path: '/docs', component: DocsPage }];"
      ].join("\n")
    );
  });

  it("emits serializable route metadata without page imports", () => {
    expect(prepareRouteMetadataExport([
      {name: "HomePage", filePath: "test/fixtures/route.page.ts", path: "/", ssr: true},
      {name: "DocsPage", filePath: "test/fixtures/route.page.ts", path: "/docs"}
    ])).toBe('export const routeMetadata = [{"path":"/","ssr":true},{"path":"/docs","ssr":false}];');
  });

  it("detects route metadata changes correctly", () => {
    const previousCandidates: DotaRouteCandidate[] = [
      {
        name: "HomePage",
        filePath: "test/fixtures/route.page.ts",
        path: "/",
        ssr: true,
        default: true
      }
    ];

    const sameCandidates: DotaRouteCandidate[] = [
      {
        name: "HomePage",
        filePath: "test/fixtures/route.page.ts",
        path: "/",
        ssr: true,
        default: true
      }
    ];

    const changedPathCandidates: DotaRouteCandidate[] = [
      {
        name: "HomePage",
        filePath: "test/fixtures/route.page.ts",
        path: "/home",
        ssr: true,
        default: true
      }
    ];

    const changedRenderCandidates: DotaRouteCandidate[] = [
      {
        name: "HomePage",
        filePath: "test/fixtures/route.page.ts",
        path: "/",
        default: true,
        render: "path => path"
      }
    ];

    expect(isRouteMetadataChanged(previousCandidates, sameCandidates)).toBe(false);
    expect(isRouteMetadataChanged(previousCandidates, changedPathCandidates)).toBe(true);
    expect(isRouteMetadataChanged(previousCandidates, changedRenderCandidates)).toBe(true);
  });
});
