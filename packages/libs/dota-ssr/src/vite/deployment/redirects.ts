import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {ResolvedDotaSsgRoute} from '../../ssg/types';

// These markers separate generated rules from authored rules that must survive subsequent builds.
const start = '# BEGIN dota-ssg';
const end = '# END dota-ssg';

/**
 * Replaces owned `_redirects` rules with status-200 rewrites, retaining all text outside the block.
 * Prepends the block ahead of authored fallbacks, removes stale rules, and skips unchanged writes.
 * @param outputDirectory Absolute build directory; it and `_redirects` are created when missing.
 * @param routes Validated mappings in emission order; identical source/destination URLs are skipped.
 * @param base Vite public base; only its pathname is used, keeping rewrite destinations local.
 * @throws For unmatched markers, whitespace in URLs, wildcard/parameter sources, or file access failures.
 */
export async function writeRedirects(outputDirectory: string, routes: readonly ResolvedDotaSsgRoute[], base: string): Promise<void> {
  // Read the published copy first so rules copied from public/_redirects can be carried into the new file.
  const file = resolve(outputDirectory, '_redirects');
  let previous = '';
  try {
    previous = await readFile(file, 'utf8');
  } catch (error) {
    // A missing file starts with no authored rules; other read failures must stop us from replacing unread content.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  // Remove complete generated blocks, including their closing newline, while retaining all surrounding text.
  // Rebuilding the block from the current routes also removes rules for routes no longer selected.
  const block = /^# BEGIN dota-ssg\r?\n[\s\S]*?^# END dota-ssg(?:\r?\n|$)/gm;
  const preserved = previous.replace(block, '');
  // Any marker left behind means ownership is ambiguous; fail before writing rather than guessing what to keep.
  if (preserved.includes(start) || preserved.includes(end)) {
    throw new Error(`Malformed dota-ssg block in ${file}`);
  }

  // With authored content safely separated, derive the deployment pathname shared by sources and destinations.
  // The placeholder origin resolves relative bases without a network request; trimming the final slash avoids doubling it.
  const prefix = new URL(base, 'https://ssg.invalid').pathname.replace(/\/$/, '');
  const lines = routes.map(route => {
    // Pair the public route URL with the HTML file already written for that route under the same deployment base.
    const source = `${prefix}${route.path}`;
    const destination = `${prefix}/${route.output}`;
    // Whitespace splits rule fields, while '*' and ':' make sources into patterns instead of concrete route paths.
    if (/\s/.test(source + destination) || /[*:]/.test(source)) {
      throw new Error(`Route cannot be represented as a static redirect: ${route.path}`);
    }
    // Status 200 serves the HTML without changing the browser URL; omit mappings that would rewrite to themselves.
    return source === destination ? '' : `${source} ${destination} 200`;
  }).filter(Boolean);

  // Put current generated rules before authored catch-all fallbacks so those fallbacks do not hide prerendered pages.
  // Keep an empty marked block when no rules remain, preserving the same ownership boundary for the next build.
  const next = `${start}\n${lines.length ? `${lines.join('\n')}\n` : ''}${end}\n${preserved}`;
  // Compare the complete result before touching disk, avoiding unnecessary writes on identical builds.
  if (next === previous) return;

  // Validation and assembly are complete; ensure the build directory exists and publish the replacement file.
  await mkdir(outputDirectory, {recursive: true});
  await writeFile(file, next, 'utf8');
}
