import {extname, isAbsolute, relative, resolve, sep} from 'node:path';
import {performance as nodePerformance} from 'node:perf_hooks';
import type {Window} from 'happy-dom';
import {createPrerenderAssetReader, type PrerenderAssetReader} from './asset-reader';

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
 * cannot be omitted from the serialized document. Resolves `true` when it waited for at
 * least one request, so the coordinator knows response handlers may have queued more work.
 * An optional deadline, in `performance.now()` milliseconds, stops waiting for requests
 * that are still pending at that time.
 */
export type PrerenderFetchWaiter = {
  (deadline?: number): Promise<boolean>;
  /**
   * Stops the adapter after the route is serialized. Later requests never settle, so a
   * page that keeps fetching cannot run on after its window closes.
   */
  close(): void;
};

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
  /** Deliveries of requests that must reach the page before the document can be serialized. */
  pendingRequests: Set<Promise<void>>;
  /** Build-owned reader sharing bytes without sharing window-specific responses. */
  readAsset: PrerenderAssetReader;
  /** Set once the route is serialized; later requests are left pending. */
  closed: boolean;
};

/** Input accepted by the active Happy DOM fetch implementation. */
type PrerenderFetchInput = Parameters<Window['fetch']>[0];
/** Optional request settings forwarded to static or network fetch handling. */
type PrerenderFetchInit = Parameters<Window['fetch']>[1];

/**
 * Gives Happy DOM browser-style fetch access to Vite's built public files.
 * Tracks local reads and network requests so serialization waits for their completion.
 * @param window Route-isolated Happy DOM window whose fetch function is replaced.
 * @param staticRoot Built output directory containing Vite's copied public files.
 * @param fetchBaseUrl Optional API origin used for missing relative paths.
 * @param readAsset Build-owned asset reader; omission reads uncached local files.
 * @returns A waiter that resolves after all fetch promises started by this adapter settle,
 *   or at its optional deadline, with `true` when any request was still pending; its
 *   `close()` stops the adapter once the route is serialized.
 * @throws When the optional API base URL is not a valid URL.
 */
export function installPrerenderFetch(
  window: Window,
  staticRoot: string,
  fetchBaseUrl?: string,
  readAsset: PrerenderAssetReader = createPrerenderAssetReader(new Set(), 0)
): PrerenderFetchWaiter {
  const networkFetch = window.fetch.bind(window);
  const apiBaseUrl = fetchBaseUrl ? new window.URL(fetchBaseUrl) : undefined;
  const context: PrerenderFetchContext = {
    window,
    staticRoot,
    apiBaseUrl,
    networkFetch,
    readAsset,
    pendingRequests: new Set(),
    closed: false
  };
  window.fetch = createPrerenderFetch(context);

  const waitForFetches = async (deadline = Number.POSITIVE_INFINITY): Promise<boolean> => {
    let waited = false;
    while (context.pendingRequests.size > 0) {
      waited = true;
      // Checked on every round: requests answered from cached assets can chain through microtasks
      // alone, which keeps the event loop from ever running the deadline timer.
      if (nodePerformance.now() >= deadline) return waited;
      if (!await settlesBefore(Promise.allSettled([...context.pendingRequests]), deadline)) return waited;
      await Promise.resolve();
    }
    return waited;
  };
  return Object.assign(waitForFetches, {
    close: () => {
      context.closed = true;
    }
  });
}

/**
 * Waits for a promise, giving up at a deadline measured on the Node performance clock.
 * Uses Node's timer rather than the route window's, which may be paused or replaced.
 * @param promise Work to wait for; its result is ignored.
 * @param deadline `performance.now()` value after which waiting stops.
 * @returns Whether the promise settled before the deadline.
 */
export async function settlesBefore(promise: Promise<unknown>, deadline: number): Promise<boolean> {
  if (deadline === Number.POSITIVE_INFINITY) {
    await promise;
    return true;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<false>(resolve => {
    timer = setTimeout(() => resolve(false), Math.max(0, deadline - nodePerformance.now()));
  });
  try {
    return await Promise.race([promise.then(() => true), expired]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Creates the fetch function installed on one route-isolated window.
 * The returned function tracks both fulfilled and rejected requests so the waiter
 * cannot retain a settled request or hide the request's original rejection.
 * Responses reach the page in a later event-loop task, as network responses do, so a page
 * that fetches in a loop cannot starve the timers that bound settling.
 * Once the adapter is closed, new and in-flight requests never settle: the page's handlers
 * would otherwise run after its window closed, against the next route's globals, and a
 * rejection might go unhandled.
 * @param context Route-specific static root, network delegate, and pending-request set.
 * @returns A Happy DOM-compatible fetch function for the route.
 */
function createPrerenderFetch(context: PrerenderFetchContext): Window['fetch'] {
  return (input, init) => {
    if (context.closed) return new Promise(() => undefined);
    let markDelivered!: () => void;
    const delivery = new Promise<void>(resolve => {
      markDelivered = resolve;
    });
    context.pendingRequests.add(delivery);
    return new Promise((resolve, reject) => {
      /**
       * Hands the outcome to the page in a later task, then releases the waiter after the page's
       * handlers are queued, so any request they start is pending when the waiter looks again.
       * @param settle Resolves or rejects the page's promise unless the adapter has closed.
       */
      const deliver = (settle: () => void) => setImmediate(() => {
        context.pendingRequests.delete(delivery);
        if (!context.closed) settle();
        markDelivered();
      });
      performPrerenderFetch(context, input, init).then(
        response => deliver(() => resolve(response)),
        (error: unknown) => deliver(() => reject(error))
      );
    });
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
    const {content, size} = await context.readAsset(file, method === 'HEAD');
    const contentType = CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
    return new window.Response(content === null ? null : new Uint8Array(content), {
      status: 200,
      headers: {
        'content-length': size.toString(),
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
