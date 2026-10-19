import {readFileSync} from "node:fs";
import {resolve, sep} from "node:path";

/** Files that define components or pages; each keeps its own lazily loaded chunk. */
const COMPONENT_FILE_PATTERN = /\.(component|page)\.[cm]?[jt]s$/;

/**
 * Finds the module entries `index.html` loads, so they stay the root of the entry chunk.
 * @param root Project root containing `index.html`.
 * @returns Absolute paths of the page's module scripts; empty when there is no `index.html`.
 */
export function readHtmlModuleEntries(root: string): string[] {
  let html: string;
  try {
    html = readFileSync(resolve(root, "index.html"), "utf8");
  } catch {
    return [];
  }
  return [...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*\bsrc=["']([^"']+)["']/g)]
    .map(match => resolve(root, `.${match[1].startsWith("/") ? "" : "/"}${match[1]}`));
}

/**
 * Builds the Rolldown code-splitting group that keeps an application's start-up support modules
 * (data, config, services, utilities) in one chunk.
 * With lazily loaded components, every such module the entry imports and a component chunk
 * shares otherwise becomes its own tiny chunk, and the entry preloads all of them at high
 * priority in competition with the stylesheets that gate first paint. Only modules on the
 * entry's static import chain (`$initial`) are grouped, so code used only by lazy routes stays
 * with them; component and page files and the entry itself are never grouped.
 * @param root Project root; only modules under its `src` directory are grouped.
 * @param entries Absolute paths of the application's entry modules.
 * @returns A `build.rolldownOptions.output.codeSplitting` group.
 */
export function prepareSharedChunkGroup(root: string, entries: readonly string[] = readHtmlModuleEntries(root)) {
  const sourceRoot = resolve(root, "src") + sep;
  const entrySet = new Set(entries);
  return {
    name: "app-shared",
    tags: ["$initial" as const],
    minShareCount: 2,
    test: (id: string) => {
      const path = id.split("?")[0];
      return path.startsWith(sourceRoot) && !entrySet.has(path) && !path.includes(`${sep}node_modules${sep}`)
        && !COMPONENT_FILE_PATTERN.test(path) && /\.[cm]?[jt]s$/.test(path);
    },
  };
}
