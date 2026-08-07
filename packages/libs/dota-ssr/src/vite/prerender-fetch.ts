import {readFile} from 'node:fs/promises';
import {extname, isAbsolute, relative, resolve, sep} from 'node:path';
import type {Window} from 'happy-dom';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

/**
 * Waits until all requests started by a prerender window have settled.
 * The SSG coordinator uses this barrier after DOM settling so async content loaders
 * cannot be omitted from the serialized document.
 */
export type PrerenderFetchWaiter = () => Promise<void>;

/** Carries the route-specific dependencies shared by the fetch adapter and its waiter. */
type PrerenderFetchContext = {
  /** Happy DOM realm whose URL and Response constructors represent the route. */
  window: Window;
  /** Built directory used for same-origin public-file requests. */
  staticRoot: string;
  /** Optional network destination for same-origin paths absent from the static output. */
  apiBaseUrl?: URL;
  /** Original Happy DOM fetch used for cross-origin and API-forwarded requests. */
  networkFetch: Window['fetch'];
  /** Requests that must settle before the generated document can be serialized. */
  pendingRequests: Set<ReturnType<Window['fetch']>>;
};

/** Input accepted by the active Happy DOM fetch implementation. */
type PrerenderFetchInput = Parameters<Window['fetch']>[0];
/** Optional request settings forwarded to static or network fetch handling. */
type PrerenderFetchInit = Parameters<Window['fetch']>[1];

/**
 * Gives Happy DOM browser-style fetch access to Vite's built public files.
 * Same-origin static paths are read from the output directory; missing paths can
 * fall through to an API base URL, while cross-origin URLs keep normal network behavior.
 * Every request is tracked because filesystem reads are invisible to Happy DOM's task queue.
 * @param window Route-isolated Happy DOM window whose fetch function is replaced.
 * @param staticRoot Built output directory containing Vite's copied public files.
 * @param fetchBaseUrl Optional API origin used for missing relative paths.
 * @returns A waiter that resolves after all fetch promises started by this adapter settle.
 * @throws When the optional API base URL is not a valid URL.
 */
export function installPrerenderFetch(window: Window, staticRoot: string, fetchBaseUrl?: string): PrerenderFetchWaiter {
  const networkFetch = window.fetch.bind(window);
  const apiBaseUrl = fetchBaseUrl ? new window.URL(fetchBaseUrl) : undefined;
  const context: PrerenderFetchContext = {
    window,
    staticRoot,
    apiBaseUrl,
    networkFetch,
    pendingRequests: new Set()
  };
  window.fetch = createPrerenderFetch(context);

  return async () => {
    while (context.pendingRequests.size > 0) {
      await Promise.allSettled([...context.pendingRequests]);
      await Promise.resolve();
    }
  };
}

/**
 * Creates the fetch function installed on one route-isolated window.
 * The returned function tracks both fulfilled and rejected requests so the waiter
 * cannot retain a settled request or hide the request's original rejection.
 * @param context Route-specific static root, network delegate, and pending-request set.
 * @returns A Happy DOM-compatible fetch function for the route.
 */
function createPrerenderFetch(context: PrerenderFetchContext): Window['fetch'] {
  return (input, init) => {
    const request = performPrerenderFetch(context, input, init);
    context.pendingRequests.add(request);
    void request.then(
      () => context.pendingRequests.delete(request),
      () => context.pendingRequests.delete(request)
    );
    return request;
  };
}

/**
 * Applies the route fetch policy while leaving absolute network requests untouched.
 * Same-origin GET and HEAD requests read the built public output; missing files use
 * the configured API fallback, and unsupported local methods return a normal 405 response.
 * @param context Route-specific fetch dependencies and response constructors.
 * @param input URL, Request, or URL string supplied by application code.
 * @param init Optional request method and transport options supplied by application code.
 * @returns The response produced by the static file, API, or original network fetch.
 */
async function performPrerenderFetch(
  context: PrerenderFetchContext,
  input: PrerenderFetchInput,
  init: PrerenderFetchInit
): ReturnType<Window['fetch']> {
  const {window, staticRoot, apiBaseUrl, networkFetch} = context;
  const requestTarget = typeof input === 'string'
    ? input
    : 'url' in input
      ? input.url
      : input.href;
  const requestUrl = new window.URL(requestTarget, window.location.href);
  if (requestUrl.origin !== window.location.origin) {
    return networkFetch(input, init);
  }

  const forwardToApi = apiBaseUrl
    ? () => networkFetch(new window.URL(`${requestUrl.pathname}${requestUrl.search}`, apiBaseUrl.href).href, init)
    : undefined;
  const method = (init?.method ?? (typeof input !== 'string' && 'method' in input ? input.method : 'GET'))
    .toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    if (forwardToApi) return forwardToApi();
    return new window.Response(null, {
      status: 405,
      statusText: 'Method Not Allowed',
      headers: {allow: 'GET, HEAD'}
    });
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    return new window.Response(null, {status: 400, statusText: 'Bad Request'});
  }

  const file = resolve(staticRoot, `.${pathname}`);
  const relativeFile = relative(staticRoot, file);
  if (relativeFile === '..' || relativeFile.startsWith(`..${sep}`) || isAbsolute(relativeFile)) {
    return new window.Response(null, {status: 404, statusText: 'Not Found'});
  }

  try {
    const content = await readFile(file);
    const contentType = CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
    return new window.Response(method === 'HEAD' ? null : new Uint8Array(content), {
      status: 200,
      headers: {
        'content-length': content.byteLength.toString(),
        'content-type': contentType
      }
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR') {
      if (forwardToApi) return forwardToApi();
      return new window.Response(null, {status: 404, statusText: 'Not Found'});
    }
    throw error;
  }
}
