import type {Window} from 'happy-dom';

/** Window-independent copy of one network response, replayed as a fresh `Response` per route. */
type CachedResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: ArrayBuffer;
};

/** Input accepted by the active Happy DOM fetch implementation. */
type NetworkFetchInput = Parameters<Window['fetch']>[0];
/** Optional request settings supplied by application code. */
type NetworkFetchInit = Parameters<Window['fetch']>[1];

/**
 * Performs one network request for a route window, answering repeated GET requests from the build cache.
 * @param window Route window whose `Response` constructor builds the returned response.
 * @param networkFetch The window's original fetch, used on a cache miss and for uncacheable requests.
 * @param input URL, Request, or URL string supplied by application code.
 * @param init Optional request settings supplied by application code.
 */
export type PrerenderNetworkCache = (
  window: Window,
  networkFetch: Window['fetch'],
  input: NetworkFetchInput,
  init?: NetworkFetchInit
) => ReturnType<Window['fetch']>;

/**
 * Shares network responses between the routes of one SSG build.
 * Every route evaluates the application afresh, so module-level caches such as icon or API
 * caches start empty on each page and the same remote assets would otherwise be downloaded
 * once per route. Plain GET requests are fetched once and replayed, including error statuses,
 * so pages of one build see the same answer; requests that fail without a response, carry a
 * body or headers, or use a `Request` object are not retained.
 * @param maxBytes Retained body limit, defaulting to 16 MiB; zero disables caching.
 * @returns Fetch wrapper capped at 512 entries, sharing in-flight requests by URL.
 */
export function createPrerenderNetworkCache(maxBytes = 16 * 1024 * 1024): PrerenderNetworkCache {
  const responses = new Map<string, Promise<CachedResponse>>();
  let retainedBytes = 0;

  return async (window, networkFetch, input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const isRequest = typeof input !== 'string' && 'method' in input;
    if (maxBytes <= 0 || isRequest || method !== 'GET' || init?.body != null || init?.headers) {
      return networkFetch(input, init);
    }
    const url = new window.URL(typeof input === 'string' ? input : input.href, window.location.href).href;
    let cached = responses.get(url);
    if (!cached) {
      cached = networkFetch(input, init).then(async response => ({
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body: await response.arrayBuffer()
      }));
      if (responses.size < 512) {
        responses.set(url, cached);
        cached.then(({body}) => {
          if (retainedBytes + body.byteLength > maxBytes) responses.delete(url);
          else retainedBytes += body.byteLength;
        }, () => responses.delete(url));
      }
    }
    const {status, statusText, headers, body} = await cached;
    return new window.Response(status === 204 || status === 304 ? null : body.slice(0), {status, statusText, headers});
  };
}
