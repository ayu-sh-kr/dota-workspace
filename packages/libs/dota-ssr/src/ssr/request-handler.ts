import type {IncomingMessage, ServerResponse} from 'node:http';
import {renderDocument} from './document';
import type {PageRoute, RenderContext, RequestHandler, RequestHandlerOptions} from './types';

/** A matched page route and the values its `:name` segments captured. */
type RouteMatch = {
  /** Route selected for the request path. */
  readonly route: PageRoute;
  /** Decoded path parameters. */
  readonly params: Record<string, string>;
};

/** Connect-style continuation used by Vite and Express middleware stacks. */
type NextFunction = (error?: unknown) => void;

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
    const result = await options.adapter.render(match.route.page, context);
    return new Response(renderDocument(options.template, result), {
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

/**
 * Adapts a {@link RequestHandler} to Node's `http` server and connect middleware.
 * Requests the handler declines go to `next`, or receive a 404 when there is no
 * middleware chain; thrown render errors go to `next(error)` or become a 500.
 * @param handler Web-standard page handler.
 */
export function toNodeListener(handler: RequestHandler) {
  return async (incoming: IncomingMessage, outgoing: ServerResponse, next?: NextFunction): Promise<void> => {
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        for (const entry of [value ?? []].flat()) headers.append(name, entry);
      }
      const url = new URL(incoming.url ?? '/', `http://${incoming.headers.host ?? 'localhost'}`);
      const response = await handler(new Request(url, {method: incoming.method, headers}));
      if (!response) {
        if (next) next();
        else outgoing.writeHead(404).end();
        return;
      }
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(incoming.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      if (next) next(error);
      else outgoing.writeHead(500).end();
    }
  };
}
