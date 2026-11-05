import {renderDocument} from './document';
import {matchPath, type PathMatch} from './route-match';
import type {PageRoute, RenderContext, RequestHandler, RequestHandlerOptions} from './types';

/**
 * Creates the web-standard handler that orchestrates one page render per request.
 * It matches a route, builds a fresh {@link RenderContext}, asks the adapter for
 * HTML, and writes it into the document shell. Non-page requests resolve to
 * `undefined` so static files, APIs, or a dev server can answer them instead.
 * The response carries the status components set through `context.setStatus`, 200 otherwise.
 * With `trailingSlash` set, the other slash form of a page redirects (308) to the canonical
 * one before rendering; `cacheControl` is sent only with 200 pages.
 * Render errors propagate so the hosting server owns error pages and logging.
 * @param options Adapter, routes, document shell, fetch, slash policy, and cache header.
 */
export function createRequestHandler(options: RequestHandlerOptions): RequestHandler {
  const baseFetch = options.fetch ?? globalThis.fetch;
  return async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;
    const url = new URL(request.url);
    const match = matchRoute(options.routes, url.pathname);
    if (!match) return undefined;
    const location = canonicalSlashLocation(url, options.trailingSlash);
    if (location) return new Response(null, {status: 308, headers: {location}});

    let status = 200;
    const context: RenderContext = {
      url,
      params: match.params,
      state: new Map(),
      fetch: (input, init) => baseFetch(typeof input === 'string' ? new URL(input, url) : input, init),
      setStatus(next) {
        // Checked here so the mistake names the page, not a later `new Response` failure.
        if (!Number.isInteger(next) || next < 200 || next > 599) {
          throw new RangeError(`Page status must be an integer from 200 to 599; got ${next} for ${url.pathname}`);
        }
        status = next;
      }
    };
    const [result, template] = await Promise.all([
      options.adapter.render(match.route.page, context),
      typeof options.template === 'string' ? options.template : options.template(url)
    ]);
    const headers: Record<string, string> = {'content-type': 'text/html; charset=utf-8'};
    // Only successful pages are cacheable; a cached 404 or 500 would outlive the fix.
    if (options.cacheControl && status === 200) headers['cache-control'] = options.cacheControl;
    return new Response(renderDocument(template, {...result, head: result.head ?? match.route.seo}), {status, headers});
  };
}

/**
 * Matches a path against routes in order, capturing `:name`, `[name]`, and a final
 * `[...name]` the way Dota Router does. Trailing slashes are ignored so `/users/` and
 * `/users` select the same page.
 * @param routes Page routes in priority order.
 * @param pathname Request path without query string.
 */
export function matchRoute(routes: readonly PageRoute[], pathname: string): PathMatch<PageRoute> | undefined {
  return matchPath(routes, pathname);
}

/**
 * The canonical URL when a request uses the other slash form of a page, as static hosts
 * redirect prerendered pages. The root and an unset policy never redirect.
 * @param url Request URL; its encoded path and query are reused.
 * @param trailingSlash Whether canonical page URLs end with a slash.
 */
function canonicalSlashLocation(url: URL, trailingSlash: boolean | undefined): string | undefined {
  if (trailingSlash === undefined || url.pathname === '/') return undefined;
  const hasSlash = url.pathname.endsWith('/');
  if (trailingSlash && !hasSlash) return `${url.pathname}/${url.search}`;
  if (!trailingSlash && hasSlash) return `${url.pathname.replace(/\/+$/, '')}${url.search}`;
  return undefined;
}

export {toNodeListener} from './node-listener';
