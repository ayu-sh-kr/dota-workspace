import {RouteConfig} from "@dota/Types";
import {resolveRoute} from "@dota/route/route-resolver";

/**
 * Resolves a configured route tree to the route that should handle a URL path.
 * Literal segment matches always win over slug nodes at the same level, so a declared
 * page cannot be shadowed by a dynamic route. Every URL segment must be consumed;
 * a partial match falls back to the application's error component.
 * @param path - Requested URL pathname, with or without leading or trailing slashes.
 * @param routes - Segment-local route tree produced by `configure`.
 * @param errorRoute - Fallback route returned when the pathname cannot be resolved.
 * @returns The exact, slug-based, or error route selected for the pathname.
 */
export function matchRoute<T extends HTMLElement>(
  path: string,
  routes: RouteConfig<T>[],
  errorRoute: RouteConfig<T>
): RouteConfig<T> {
  return resolveRoute(path, routes, errorRoute).route;
}
