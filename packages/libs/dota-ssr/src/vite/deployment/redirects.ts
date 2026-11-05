import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {isCanonicalOutput} from '../../ssg/route-output';
import type {ResolvedDotaSsgRoute} from '../../ssg/types';

/** Owner of the block holding static generation's rewrites. */
const SSG_OWNER = 'dota-ssg';

/**
 * Replaces owned `_redirects` rules with status-200 rewrites for custom outputs, keeping all text outside the block.
 * Prepends the block ahead of authored fallbacks, removes stale rules, and skips unchanged writes.
 * Canonical outputs (`path/index.html`, `path.html`) get no rule: Netlify and Cloudflare Pages already
 * serve them at `/path/` or `/path` and redirect the other form, which a 200 rewrite would bypass.
 * @param outputDirectory Absolute build directory; it and `_redirects` are created when missing.
 * @param routes Validated mappings in emission order; identical source/destination URLs are skipped.
 * @param base Vite public base; only its pathname is used, keeping rewrite destinations local.
 * @throws For unmatched markers, whitespace in URLs, wildcard/parameter sources, or file access failures.
 */
export async function writeRedirects(outputDirectory: string, routes: readonly ResolvedDotaSsgRoute[], base: string): Promise<void> {
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
    // Canonical outputs keep the host's native slash handling; only custom files need a rewrite.
    if (isCanonicalOutput(route)) return '';
    // Status 200 serves the HTML without changing the browser URL; omit mappings that would rewrite to themselves.
    return source === destination ? '' : `${source} ${destination} 200`;
  }).filter(Boolean);
  await writeManagedRedirects(outputDirectory, SSG_OWNER, lines);
}

/**
 * Replaces one owner's marked block (`# BEGIN <owner>` to `# END <owner>`) in `_redirects`, keeping every
 * other line, and prepends it so authored catch-all fallbacks cannot hide its rules. An empty block is kept
 * as an ownership boundary for the next build; an unchanged file is not rewritten.
 * @param outputDirectory Absolute build directory; it and `_redirects` are created when missing.
 * @param owner Block name, such as `dota-ssg`.
 * @param lines Rules for the block, without line breaks.
 * @returns The text outside this owner's block, for checks on authored rules.
 * @throws For unmatched markers of this owner or file access failures.
 */
export async function writeManagedRedirects(
  outputDirectory: string,
  owner: string,
  lines: readonly string[]
): Promise<string> {
  // Read the published copy first so rules copied from public/_redirects can be carried into the new file.
  const file = resolve(outputDirectory, '_redirects');
  let previous = '';
  try {
    previous = await readFile(file, 'utf8');
  } catch (error) {
    // A missing file starts with no authored rules; other read failures must stop us from replacing unread content.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  // These markers separate generated rules from authored rules that must survive subsequent builds.
  const start = `# BEGIN ${owner}`;
  const end = `# END ${owner}`;
  // Remove complete generated blocks, including their closing newline, while retaining all surrounding text.
  // Rebuilding the block from the current routes also removes rules for routes no longer selected.
  const block = new RegExp(`^${start}\\r?\\n[\\s\\S]*?^${end}(?:\\r?\\n|$)`, 'gm');
  const preserved = previous.replace(block, '');
  // Any marker left behind means ownership is ambiguous; fail before writing rather than guessing what to keep.
  if (preserved.includes(start) || preserved.includes(end)) {
    throw new Error(`Malformed ${owner} block in ${file}`);
  }

  // Put current generated rules before authored catch-all fallbacks so those fallbacks do not hide them.
  // Keep an empty marked block when no rules remain, preserving the same ownership boundary for the next build.
  const next = `${start}\n${lines.length ? `${lines.join('\n')}\n` : ''}${end}\n${preserved}`;
  // Compare the complete result before touching disk, avoiding unnecessary writes on identical builds.
  if (next === previous) return preserved;

  // Validation and assembly are complete; ensure the build directory exists and publish the replacement file.
  await mkdir(outputDirectory, {recursive: true});
  await writeFile(file, next, 'utf8');
  return preserved;
}
