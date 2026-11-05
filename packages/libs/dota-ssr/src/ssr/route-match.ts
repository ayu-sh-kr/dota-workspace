// Kept free of imports: the Vite deployment writers use it without loading Dota Core.

/** A route paired with the values its dynamic segments captured. */
export type PathMatch<R> = {
  /** Route selected for the path. */
  readonly route: R;
  /** Decoded values keyed by parameter name. */
  readonly params: Record<string, string>;
};

/** Anything with a router-style `path`, such as a page route or a route configuration. */
export type RoutePath = {
  /** Path such as `/tasks/:id`. */
  readonly path: string;
};

/**
 * Matches a pathname against routes in order, using Dota Router's segment syntax: `:name`
 * and `[name]` capture one segment, and a final `[...name]` captures the remaining segments
 * (at least one). Trailing slashes are ignored so `/users/` and `/users` select the same route.
 * @param routes Routes in priority order; only their `path` is read.
 * @param pathname Request path without query string.
 * @returns The first matching route and its parameters, or `undefined`.
 */
export function matchPath<R extends RoutePath>(routes: readonly R[], pathname: string): PathMatch<R> | undefined {
  const segments = pathname.split('/').filter(Boolean);
  for (const route of routes) {
    const params = matchSegments(route.path.split('/').filter(Boolean), segments);
    if (params) return {route, params};
  }
  return undefined;
}

/**
 * Converts a route path to a host wildcard pattern, where `*` stands for any dynamic segment.
 * @param path Router-style path such as `/tasks/:id` or `/docs/[...slug]`.
 */
export function toWildcardPattern(path: string): string {
  return path.split('/').map((segment) => dynamicName(segment) === undefined ? segment : '*').join('/');
}

/** Captured parameters when every path segment is consumed by the pattern, else `undefined`. */
function matchSegments(pattern: readonly string[], segments: readonly string[]): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  for (const [index, part] of pattern.entries()) {
    const name = dynamicName(part);
    if (part.startsWith('[...') && name !== undefined) {
      if (index !== pattern.length - 1 || index >= segments.length) return undefined;
      params[name] = segments.slice(index).map(decode).join('/');
      return params;
    }
    if (index >= segments.length) return undefined;
    if (name !== undefined) params[name] = decode(segments[index]);
    else if (part !== segments[index]) return undefined;
  }
  return pattern.length === segments.length ? params : undefined;
}

/** Parameter name of a dynamic segment (`:id`, `[id]`, `[...rest]`), else `undefined`. */
function dynamicName(segment: string): string | undefined {
  if (segment.startsWith(':')) return segment.slice(1);
  if (segment.startsWith('[...') && segment.endsWith(']')) return segment.slice(4, -1);
  if (segment.startsWith('[') && segment.endsWith(']')) return segment.slice(1, -1);
  return undefined;
}

/** Decodes a segment, keeping it as written when it is not valid percent-encoding. */
function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
