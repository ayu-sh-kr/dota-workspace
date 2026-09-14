import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {resolveSsgRoutes} from '../../ssg/route-output';
import type {ResolvedDotaSsgRoute} from '../../ssg/types';

/**
 * Makes custom outputs reachable through directory indexes because GitHub Pages has no rewrite rules.
 * Checks all aliases before copying HTML unchanged, then writes `.nojekyll` to bypass Jekyll processing.
 * Existing aliases must match the source content; stale files are not removed and no SPA fallback is added.
 * @param outputDirectory Absolute published build directory; HTML must already use the intended Vite base.
 * @param routes Validated, rendered mappings; an empty list still creates `.nojekyll`.
 * @throws If alias paths are invalid, existing alias content conflicts, or reading/writing files fails.
 */
export async function prepareGithubPages(outputDirectory: string, routes: readonly ResolvedDotaSsgRoute[]): Promise<void> {
  const aliases = new Map(resolveSsgRoutes(routes.map(route => route.path)).map(route => [route.path, route.output]));
  const documents = await Promise.all(routes.map(async route => {
    const alias = aliases.get(route.path)!;
    if (alias === route.output) return undefined;
    const file = resolve(outputDirectory, alias);
    const html = await readFile(resolve(outputDirectory, route.output), 'utf8');
    try {
      const existing = await readFile(file, 'utf8');
      if (existing !== html) throw new Error(`GitHub Pages route output conflicts with an existing file: ${file}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return {file, html};
  }));
  for (const document of documents) {
    if (!document) continue;
    await mkdir(dirname(document.file), {recursive: true});
    await writeFile(document.file, document.html, 'utf8');
  }
  await mkdir(outputDirectory, {recursive: true});
  await writeFile(resolve(outputDirectory, '.nojekyll'), '', 'utf8');
}
