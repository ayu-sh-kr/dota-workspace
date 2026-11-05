import {matchPath, toWildcardPattern} from '../../ssr/route-match';
import type {ResolvedDotaSsgRoute} from '../../ssg/types';

/**
 * Converts router paths into host wildcard patterns, dropping duplicates and every pattern
 * another one already covers. In wildcard syntax `*` matches any characters, slashes included,
 * so the pattern for `/tasks/:id` also matches every `/tasks/:id/edit` request; Cloudflare
 * Pages rejects a rule list holding both.
 * @param paths Router-style paths such as `/tasks/:id` or `/docs/[...slug]`.
 * @param prefix Vite base pathname without its trailing slash, prepended to every pattern.
 * @returns The smallest pattern list matching the same requests, in first-seen order.
 */
export function wildcardRoutePatterns(paths: readonly string[], prefix: string): string[] {
  let kept: string[] = [];
  for (const pattern of paths.map((path) => `${prefix}${toWildcardPattern(path)}`)) {
    // An earlier pattern wins a tie, so two patterns covering each other keep exactly one.
    if (kept.some((existing) => coversPattern(existing, pattern))) continue;
    kept = [...kept.filter((existing) => !coversPattern(pattern, existing)), pattern];
  }
  return kept;
}

/**
 * Prerendered pages that a server route also matches, in both slash forms. Hosts that route a
 * whole pattern to the server function must exclude these, or the function renders the URL
 * instead of serving its static snapshot. Both forms are listed because either can arrive
 * before the host's canonical slash redirect.
 * @param serverPaths Router-style paths of `ssr` routes.
 * @param staticRoutes Pages static generation wrote in the same build.
 * @param prefix Vite base pathname without its trailing slash.
 */
export function staticPathsShadowedBy(
  serverPaths: readonly string[],
  staticRoutes: readonly ResolvedDotaSsgRoute[],
  prefix: string
): string[] {
  const serverRoutes = serverPaths.map((path) => ({path}));
  return staticRoutes
    .filter((route) => matchPath(serverRoutes, route.path) !== undefined)
    .flatMap((route) => route.path === '/' ? [`${prefix}/`] : [`${prefix}${route.path}`, `${prefix}${route.path}/`]);
}

/**
 * Whether every request a wildcard pattern matches is matched by another pattern. The covered
 * pattern's own `*` can only be absorbed by a `*` of the covering one, so testing its text
 * against the covering pattern as a regular expression decides coverage.
 * @param pattern Candidate covering pattern.
 * @param covered Pattern that may be redundant.
 */
function coversPattern(pattern: string, covered: string): boolean {
  const source = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${source}$`).test(covered);
}

/**
 * Browser-rendered paths a static host must answer with the application shell: every client
 * route except `/` (served by `index.html`) and pages static generation wrote, which are files.
 * @param clientRoutes Router-style paths from `resolveClientRoutes`.
 * @param staticRoutes Pages static generation wrote in the same build.
 */
export function shellRoutePaths(
  clientRoutes: readonly string[],
  staticRoutes: readonly ResolvedDotaSsgRoute[]
): string[] {
  const prerendered = new Set(staticRoutes.map((route) => route.path));
  return clientRoutes.filter((path) => path !== '/' && !prerendered.has(path));
}

/**
 * Each path followed by its trailing-slash form, for hosts that match the two forms separately.
 * The root and catch-all (`[...name]`) paths, which already match both forms, get none.
 * @param paths Router-style paths without a trailing slash.
 */
export function withSlashForms(paths: readonly string[]): string[] {
  const slashForms = paths.filter((path) => path !== '/' && !/\/\[\.\.\.[^/]*\]$/.test(path)).map((path) => `${path}/`);
  return [...paths, ...slashForms];
}

/**
 * Converts a route path to `_redirects` source syntax (Netlify, Cloudflare Pages): `:name` and
 * `[name]` become `:name`, and a final `[...name]` becomes the `*` splat.
 * @param path Router-style path.
 */
export function toRedirectsSource(path: string): string {
  return path.replace(/\[\.\.\.[^\]/]+\]/g, '*').replace(/\[([^\]/]+)\]/g, ':$1');
}

/**
 * Converts a route path to Vercel source syntax: `:name` and `[name]` become `:name`, and a
 * final `[...name]` becomes `:name+`, which matches one or more segments.
 * @param path Router-style path.
 */
export function toVercelSource(path: string): string {
  return path.replace(/\[\.\.\.([^\]/]+)\]/g, ':$1+').replace(/\[([^\]/]+)\]/g, ':$1');
}

/**
 * Whether an authored Vercel rewrite source matches every path, such as `/(.*)` or `/:path*`.
 * Such a SPA fallback answers unknown paths with 200 before Vercel's `404.html` can.
 * @param source Rewrite `source` as written in `vercel.json`.
 */
export function isVercelCatchAll(source: string): boolean {
  return /^\/(?:\(\.\*\)|:\w+(?:\*|\(\.\*\)))$/.test(source);
}

/**
 * Authored `_redirects` rules that send every path to a page with status 200, such as
 * `/* /index.html 200`. They answer unknown paths before the host's `404.html` can.
 * @param rules `_redirects` text outside the generated blocks.
 * @param prefix Vite base pathname without its trailing slash.
 */
export function redirectsCatchAlls(rules: string, prefix: string): string[] {
  return rules.split(/\r?\n/).map((line) => line.trim())
    .filter((line) => {
      const [source, , status] = line.split(/\s+/);
      return source === `${prefix}/*` && status?.startsWith('200');
    });
}
