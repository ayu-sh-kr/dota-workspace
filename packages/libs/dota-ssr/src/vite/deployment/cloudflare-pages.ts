import type {ResolvedDotaSsgRoute} from '../../ssg/types';
import {writeRedirects} from './redirects';

/**
 * Prepares Cloudflare Pages static rewrites using the shared managed `_redirects` format.
 * Generated rules precede authored fallbacks; these rules do not configure Pages Functions.
 * @param outputDirectory Absolute build directory that Cloudflare Pages will publish.
 * @param routes Validated route-to-file mappings; an empty list clears generated rules.
 * @param base Vite public base whose pathname prefixes both sides of each rewrite.
 * @throws If the managed block is malformed, a route cannot be represented, or file access fails.
 */
export async function prepareCloudflarePages(outputDirectory: string, routes: readonly ResolvedDotaSsgRoute[], base: string): Promise<void> {
  await writeRedirects(outputDirectory, routes, base);
}
