import {resolve} from "node:path";
import {SourceFileIndex} from "@ayu-sh-kr/dota-ast-utils";
import type {ComponentScanLogger, DotaComponentCandidate} from "./component-candidate.domain.ts";

/**
 * Custom-element tags a component file renders, keyed by the selector that owns them.
 * Dota templates reference children by tag name only, so this map is the dependency
 * graph the bundler cannot see through imports.
 */
export type ComponentDependencyGraph = Record<string, string[]>;

/**
 * Matches an opening custom-element tag (`<app-header`) or a quoted tag name used with
 * `document.createElement('app-header')`. Custom-element names must contain a hyphen.
 */
const TEMPLATE_TAG_PATTERN = /<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)[\s/>]|["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)["'`]/g;

/**
 * Collects the custom-element tags referenced by one source file.
 * The scan is textual on purpose: templates are strings, and a false positive only
 * makes a route load one component early, while a missed tag is still caught by the
 * runtime's undefined-element fallback.
 * @param sourceText Source of a component or page file.
 * @returns Distinct tag names in first-seen order.
 */
export function extractTemplateTags(sourceText: string): string[] {
  const tags = new Set<string>();
  for (const match of sourceText.matchAll(TEMPLATE_TAG_PATTERN)) {
    tags.add(match[1] ?? match[2]);
  }
  return [...tags];
}

/**
 * Builds the direct tag dependencies of every discovered component.
 * Quoted strings are kept only when they name a known component, so ordinary hyphenated
 * strings such as CSS classes do not enter the graph; opening tags are always kept so
 * library elements (`md-view`) resolve against the loaders the application supplies.
 * @param candidates Components from {@link scanDotaComponents}.
 * @param root Project root the candidate paths are relative to.
 * @param logger Receives read failures; the affected file contributes no dependencies.
 * @returns Direct dependencies per selector, excluding the selector itself.
 */
export async function buildComponentDependencyGraph(
  candidates: DotaComponentCandidate[],
  root: string,
  logger: ComponentScanLogger = console
): Promise<ComponentDependencyGraph> {
  const knownTags = new Set(candidates.map(candidate => candidate.tagName));
  const files = [...new Set(candidates.map(candidate => candidate.filePath))];
  const sourceIndex = SourceFileIndex.shared();
  const fileTags = new Map<string, string[]>();

  await Promise.all(files.map(async file => {
    try {
      const {sourceText} = await sourceIndex.load(resolve(root, file));
      const openingTags = new Set([...sourceText.matchAll(TEMPLATE_TAG_PATTERN)].filter(match => match[1]).map(match => match[1]));
      fileTags.set(file, extractTemplateTags(sourceText).filter(tag => openingTags.has(tag) || knownTags.has(tag)));
    } catch (e: unknown) {
      logger.error?.(`Failed to read ${file} for template dependencies: ${e}`);
    }
  }));

  const graph: ComponentDependencyGraph = {};
  for (const candidate of candidates) {
    graph[candidate.tagName] = (fileTags.get(candidate.filePath) ?? []).filter(tag => tag !== candidate.tagName);
  }
  return graph;
}

/**
 * Generates the `virtual:dota-component-registry` module.
 * Each selector maps to a dynamic import of its own file, so Vite emits one chunk per
 * component (shared code is hoisted automatically) and a route downloads only what it renders.
 * @param candidates Components from {@link scanDotaComponents}.
 * @param dependencies Direct tag dependencies from {@link buildComponentDependencyGraph}.
 * @returns Module source exporting `componentRegistry` in the `ComponentRegistry` shape.
 */
export function prepareComponentRegistryExport(
  candidates: DotaComponentCandidate[],
  dependencies: ComponentDependencyGraph
): string {
  const loaders = candidates.map(candidate => {
    const importPath = candidate.filePath.startsWith("./") ? candidate.filePath : `./${candidate.filePath}`;
    return `  ${JSON.stringify(candidate.tagName)}: () => import(${JSON.stringify(importPath)}).then(m => m.${candidate.name})`;
  });

  return [
    "export const componentRegistry = {",
    `  loaders: {\n${loaders.join(",\n")}\n  },`,
    `  dependencies: ${JSON.stringify(dependencies)}`,
    "};",
  ].join("\n");
}
