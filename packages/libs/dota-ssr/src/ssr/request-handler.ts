import {renderDocument} from './document';
import type {PageRoute, RenderContext, RequestHandler, RequestHandlerOptions} from './types';

/** A matched page route and the values its `:name` segments captured. */
type RouteMatch = {
  /** Route selected for the request path. */
  readonly route: PageRoute;
  /** Decoded path parameters. */
  readonly params: Record<string, string>;
};

/**
 * Creates the web-standard handler that orchestrates one page render per request.
 * It matches a route, builds a fresh {@link RenderContext}, asks the adapter for
 * HTML, and writes it into the document shell. Non-page requests resolve to
 * `undefined` so static files, APIs, or a dev server can answer them instead.
 * Render errors propagate so the hosting server owns error pages and logging.
 * @param options Adapter, routes, document shell, and the fetch given to components.
 */
export function createRequestHandler(options: RequestHandlerOptions): RequestHandler {
  const baseFetch = options.fetch ?? globalThis.fetch;
  return async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;
    const url = new URL(request.url);
    const match = matchRoute(options.routes, url.pathname);
    if (!match) return undefined;

    const context: RenderContext = {
      url,
      params: match.params,
      state: new Map(),
      fetch: (input, init) => baseFetch(typeof input === 'string' ? new URL(input, url) : input, init)
    };
    const [result, template] = await Promise.all([
      options.adapter.render(match.route.page, context),
      typeof options.template === 'string' ? options.template : options.template(url)
    ]);
    return new Response(renderDocument(template, {...result, head: result.head ?? match.route.seo}), {
      headers: {'content-type': 'text/html; charset=utf-8'}
    });
  };
}

/**
 * Matches a path against routes in order, capturing `:name` segments.
 * Trailing slashes are ignored so `/users/` and `/users` select the same page.
 * @param routes Page routes in priority order.
 * @param pathname Request path without query string.
 */
export function matchRoute(routes: readonly PageRoute[], pathname: string): RouteMatch | undefined {
  const segments = pathname.split('/').filter(Boolean);
  for (const route of routes) {
    const pattern = route.path.split('/').filter(Boolean);
    if (pattern.length !== segments.length) continue;

    const params: Record<string, string> = {};
    const matches = pattern.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(segments[index]);
        return true;
      }
      return part === segments[index];
    });
    if (matches) return {route, params};
  }
  return undefined;
}

export {toNodeListener} from './node-listener';
