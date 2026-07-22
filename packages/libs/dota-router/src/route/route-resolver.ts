import {RouteConfig, RouteMatch} from "@dota/Types";

const RESOLVER_ORIGIN = "http://dota-router.local";

/**
 * Resolves a URL against the configured segment tree and preserves the information
 * needed by rendering and future transition hooks. Static segments take precedence
 * over slugs; a catch-all slug consumes the remaining pathname segments.
 * Unmatched URLs return an explicit error match instead of initiating another route.
 * @param url - Absolute URL or pathname with optional query and hash state.
 * @param routes - Segment-local route tree produced by `configure`.
 * @param errorRoute - Route used in the returned match when resolution fails.
 * @returns A successful or explicit error `RouteMatch`.
 */
export function resolveRoute<T extends HTMLElement>(
  url: string | URL,
  routes: RouteConfig<T>[],
  errorRoute: RouteConfig<T>
): RouteMatch<T> {
  const resolvedUrl = toUrl(url);
  const segments = resolvedUrl.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    const root = routes.find(route => route.path === "/");
    return root
      ? createMatch(root, [root], {}, resolvedUrl, true)
      : createMatch(errorRoute, [], {}, resolvedUrl, false);
  }

  let siblings = routes;
  const branch: RouteConfig<T>[] = [];
  const params: Record<string, string> = {};
  let matchedRoute: RouteConfig<T> | undefined;
  let index = 0;

  while (index < segments.length) {
    const rawSegment = segments[index];
    const literalPath = `/${rawSegment}`;
    const literal = siblings.find(route => !route.slug && route.path === literalPath);
    const slug = literal ? undefined : siblings.find(route => route.slug);
    matchedRoute = literal ?? slug;

    if (!matchedRoute) {
      return createMatch(errorRoute, [], {}, resolvedUrl, false);
    }

    branch.push(matchedRoute);
    const routeSegment = matchedRoute.path.slice(1);
    const parameterName = getParameterName(routeSegment);

    if (parameterName) {
      params[parameterName] = routeSegment.startsWith("[...")
        ? segments.slice(index).map(decodeSegment).join("/")
        : decodeSegment(rawSegment);
    }

    if (routeSegment.startsWith("[...")) {
      index = segments.length;
      break;
    }

    siblings = matchedRoute.children ?? [];
    index += 1;
  }

  if (!matchedRoute || index !== segments.length) {
    return createMatch(errorRoute, [], {}, resolvedUrl, false);
  }

  return createMatch(matchedRoute, branch, params, resolvedUrl, true);
}

function toUrl(url: string | URL): URL {
  return url instanceof URL ? new URL(url.href) : new URL(url, RESOLVER_ORIGIN);
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getParameterName(segment: string): string | undefined {
  if (segment.startsWith(":")) return segment.slice(1) || undefined;
  if (segment.startsWith("[...") && segment.endsWith("]")) return segment.slice(4, -1) || undefined;
  if (segment.startsWith("[") && segment.endsWith("]")) return segment.slice(1, -1) || undefined;
  return undefined;
}

function createMatch<T extends HTMLElement>(
  route: RouteConfig<T>,
  branch: readonly RouteConfig<T>[],
  params: Readonly<Record<string, string>>,
  url: URL,
  matched: boolean
): RouteMatch<T> {
  return {
    route,
    branch,
    matched,
    params,
    pathname: url.pathname,
    searchParams: new URLSearchParams(url.search),
    hash: url.hash
  };
}
