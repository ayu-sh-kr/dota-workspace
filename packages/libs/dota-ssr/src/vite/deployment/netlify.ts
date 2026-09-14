import type {ResolvedDotaSsgRoute} from '../../ssg/types';
import {writeRedirects} from './redirects';

/**
 * Prepares Netlify static rewrites ahead of authored rules so SPA fallbacks do not hide SSG pages.
 * Updates only the managed block in `_redirects`, preserving rules outside it.
 * @param outputDirectory Absolute build directory that Netlify will publish.
 * @param routes Validated route-to-file mappings; an empty list clears generated rules.
 * @param base Vite public base whose pathname prefixes both sides of each rewrite.
 * @throws If the managed block is malformed, a route cannot be represented, or file access fails.
 */
export async function prepareNetlify(outputDirectory: string, routes: readonly ResolvedDotaSsgRoute[], base: string): Promise<void> {
  await writeRedirects(outputDirectory, routes, base);
}
