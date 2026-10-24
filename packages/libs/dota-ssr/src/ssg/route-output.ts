import {posix} from 'node:path';
import type {DotaDecoratedRoute, DotaSsgRouteInput, ResolvedDotaSsgRoute} from './types';

/**
 * Normalizes and sorts configured routes before any filesystem writes occur.
 * Query/hash state and escaping output paths are rejected, so every route maps to
 * one deterministic HTML file contained by Vite's output directory.
 * @param routes Route shorthands or explicit output mappings supplied to the SSG plugin.
 * @param trailingSlash Default output shape: `true` writes `path/index.html`, served at `/path/`;
 *   `false` writes `path.html`, served at `/path`. Explicit outputs are kept either way.
 * @returns Stable, pathname-sorted routes ready for pre rendering.
 * @throws Error for duplicate paths, non-absolute paths, or unsafe outputs.
 */
export function resolveSsgRoutes(routes: readonly DotaSsgRouteInput[], trailingSlash = true): ResolvedDotaSsgRoute[] {
  const resolved = routes.map((route) => {
    const routeConfig = typeof route === 'string' ? {path: route} : route;
    if (!routeConfig.path.startsWith('/') || routeConfig.path.includes('?') || routeConfig.path.includes('#')) {
      throw new Error(`SSG route must be an absolute pathname: ${routeConfig.path}`);
    }
    const path = routeConfig.path === '/' ? '/' : `/${routeConfig.path.split('/').filter(Boolean).join('/')}`;
    const output = routeConfig.output ?? canonicalOutput(path, trailingSlash);
    const normalizedOutput = posix.normalize(output.replaceAll('\\', '/')).replace(/^\.\//, '');
    if (posix.isAbsolute(normalizedOutput) || normalizedOutput === '..' || normalizedOutput.startsWith('../') || !normalizedOutput.endsWith('.html')) {
      throw new Error(`SSG output must be a relative HTML file: ${output}`);
    }
    return {path, output: normalizedOutput};
  }).sort((left, right) => left.path.localeCompare(right.path));

  const paths = new Set<string>();
  const outputs = new Set<string>();
  for (const route of resolved) {
    if (paths.has(route.path)) throw new Error(`Duplicate SSG route: ${route.path}`);
    if (outputs.has(route.output)) throw new Error(`Duplicate SSG output: ${route.output}`);
    paths.add(route.path);
    outputs.add(route.output);
  }
  return resolved;
}

/**
 * The output file a static host serves at a route's canonical URL without any rule:
 * `path/index.html` at `/path/`, or `path.html` at `/path` when trailing slashes are off.
 * @param path Normalized route pathname.
 * @param trailingSlash Whether the canonical URL ends with a slash.
 */
export function canonicalOutput(path: string, trailingSlash: boolean): string {
  if (path === '/') return 'index.html';
  return trailingSlash ? `${path.slice(1)}/index.html` : `${path.slice(1)}.html`;
}

/**
 * Reports whether a route's output is one a static host serves without a rule, in either slash form.
 * Deployment writers skip these so the host's native redirect keeps a single canonical URL.
 * @param route Validated route-to-output mapping.
 */
export function isCanonicalOutput(route: ResolvedDotaSsgRoute): boolean {
  return route.output === canonicalOutput(route.path, true) || route.output === canonicalOutput(route.path, false);
}

/**
 * Combines explicit routes with decorated routes whose render mode is `ssg`.
 * `mode` wins; without it the legacy `ssr: true` still selects the route. `ssr` and
 * `csr` routes are left to request-time rendering or the browser.
 * A dynamic `ssg` route, such as `/docs/:slug`, is prerendered through the explicit routes
 * that match it, so at least one concrete path must be listed for it.
 * Explicit entries replace matching discovered paths before the final validation,
 * preserving caller-controlled output files without making build output nondeterministic.
 * @param decoratedRoutes Route metadata produced by the Dota Vite preloader.
 * @param routes Explicit SSG routes supplied to the plugin.
 * @param trailingSlash Default output shape, as in {@link resolveSsgRoutes}.
 * @returns Validated routes in deterministic pathname order.
 * @throws Error when an opted-in dynamic decorated route matches no explicit route.
 */
export function resolveDecoratedSsgRoutes(
  decoratedRoutes: readonly DotaDecoratedRoute[],
  routes: readonly DotaSsgRouteInput[] = [],
  trailingSlash = true
): ResolvedDotaSsgRoute[] {
  // Mirrors Dota Core's resolveRouteRenderMode(); the build cannot load Dota Core without a DOM global.
  const decoratedInputs = decoratedRoutes
    .filter(route => (route.mode ?? (route.ssr === true ? 'ssg' : 'csr')) === 'ssg')
    .map(route => route.path);
  const explicitRoutes = resolveSsgRoutes(routes, trailingSlash);
  const isDynamic = (path: string) => path.split('/').some(segment => segment.startsWith(':'));
  const unlistedRoute = decoratedInputs.filter(isDynamic)
    .find(pattern => !explicitRoutes.some(route => matchesRoutePattern(pattern, route.path)));
  if (unlistedRoute) {
    throw new Error(`Dynamic SSG route needs concrete paths in the SSG routes option: ${unlistedRoute}`);
  }

  const explicitPaths = new Set(explicitRoutes.map(route => route.path));
  const detectedRoutes = resolveSsgRoutes(decoratedInputs.filter(path => !isDynamic(path)), trailingSlash)
    .filter(route => !explicitPaths.has(route.path));
  return resolveSsgRoutes([...detectedRoutes, ...explicitRoutes], trailingSlash);
}

/**
 * Reports whether a concrete pathname fills a route pattern segment for segment.
 * @param pattern Route path whose `:name` segments match any one non-empty segment.
 * @param path Normalized concrete pathname.
 */
function matchesRoutePattern(pattern: string, path: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);
  return patternSegments.length === pathSegments.length &&
    patternSegments.every((segment, index) => segment.startsWith(':') || segment === pathSegments[index]);
}
