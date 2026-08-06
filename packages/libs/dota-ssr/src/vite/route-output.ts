import {posix} from 'node:path';
import type {DotaDecoratedRoute, DotaSsgRouteInput, ResolvedDotaSsgRoute} from './types';

/**
 * Normalizes and sorts configured routes before any filesystem writes occur.
 * Query/hash state and escaping output paths are rejected, so every route maps to
 * one deterministic HTML file contained by Vite's output directory.
 * @param routes Route shorthands or explicit output mappings supplied to the SSG plugin.
 * @returns Stable, pathname-sorted routes ready for pre rendering.
 * @throws Error for duplicate paths, non-absolute paths, or unsafe outputs.
 */
export function resolveSsgRoutes(routes: readonly DotaSsgRouteInput[]): ResolvedDotaSsgRoute[] {
  const resolved = routes.map((route) => {
    const routeConfig = typeof route === 'string' ? {path: route} : route;
    if (!routeConfig.path.startsWith('/') || routeConfig.path.includes('?') || routeConfig.path.includes('#')) {
      throw new Error(`SSG route must be an absolute pathname: ${routeConfig.path}`);
    }
    const path = routeConfig.path === '/' ? '/' : `/${routeConfig.path.split('/').filter(Boolean).join('/')}`;
    const output = routeConfig.output ?? (path === '/' ? 'index.html' : `${path.slice(1)}/index.html`);
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
 * Combines explicit routes with static `@Route({ssr: true})` metadata.
 * Explicit entries replace matching discovered paths before the final validation,
 * preserving caller-controlled output files without making build output nondeterministic.
 * @param decoratedRoutes Route metadata produced by the Dota Vite preloader.
 * @param routes Explicit SSG routes supplied to the plugin.
 * @returns Validated routes in deterministic pathname order.
 * @throws Error when an opted-in decorated route has a dynamic path segment.
 */
export function resolveDecoratedSsgRoutes(
  decoratedRoutes: readonly DotaDecoratedRoute[],
  routes: readonly DotaSsgRouteInput[] = []
): ResolvedDotaSsgRoute[] {
  const decoratedInputs = decoratedRoutes
    .filter(route => route.ssr === true)
    .map(route => route.path);
  const dynamicRoute = decoratedInputs.find(path => path.split('/').some(segment => segment.startsWith(':')));
  if (dynamicRoute) {
    throw new Error(`Decorated SSG route must be concrete: ${dynamicRoute}`);
  }

  const explicitRoutes = resolveSsgRoutes(routes);
  const explicitPaths = new Set(explicitRoutes.map(route => route.path));
  const detectedRoutes = resolveSsgRoutes(decoratedInputs).filter(route => !explicitPaths.has(route.path));
  return resolveSsgRoutes([...detectedRoutes, ...explicitRoutes]);
}
