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
export function staticPathsShadowedBy(serverPaths: readonly string[], staticRoutes: readonly ResolvedDotaSsgRoute[], prefix: string): string[] {
  return staticRoutes
    .filter((route) => matchPath(serverPaths.map((path) => ({path})), route.path) !== undefined)
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
