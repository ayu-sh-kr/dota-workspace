import type {Header, QueryParams, QueryValue} from "@dota/Types.ts";

const ABSOLUTE_URL = /^[a-z][a-z\d+\-.]*:\/\//i;

export class RestUtils {

  /**
   * Builds the request URL from an optional base, a path or absolute URL, and query parameters.
   * Parameters join any query string already in `uri`, and a `#fragment` stays at the end.
   *
   * @param options.baseURI - Client or request base URL; ignored when `uri` is absolute.
   * @param options.uri - Path or absolute URL; when omitted, the base URL alone is used.
   * @param options.params - Query parameters to append; empty parameters leave the URL unchanged.
   * @returns The resolved request URL.
   */
  static createURI = ({baseURI, uri, params}: CreateURIOptions): string => {
    const url = RestUtils.joinURI(baseURI, uri ?? '');
    if (!params || params.size === 0) {
      return url;
    }

    const hashIndex = url.indexOf('#');
    const path = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';

    return `${path}${RestUtils.querySeparator(path)}${params.toString()}${hash}`;
  }

  /**
   * Joins a base URL and a path with exactly one slash between them.
   * Absolute URLs are returned unchanged so a request can target another host.
   *
   * @param baseURI - Base URL, possibly with trailing slashes.
   * @param uri - Path, possibly with leading slashes, or an absolute URL.
   * @returns The joined URL, or whichever part is non-empty.
   */
  private static joinURI(baseURI: string | undefined, uri: string): string {
    if (!baseURI || ABSOLUTE_URL.test(uri)) {
      return uri;
    }
    if (!uri) {
      return baseURI;
    }
    return `${baseURI.replace(/\/+$/, '')}/${uri.replace(/^\/+/, '')}`;
  }

  /**
   * Chooses how new query parameters attach to a URL that may already have a query string.
   *
   * @param path - URL without its fragment.
   * @returns `?` for no query, `&` after existing parameters, or nothing after a trailing `?`/`&`.
   */
  private static querySeparator(path: string): string {
    if (!path.includes('?')) {
      return '?';
    }
    return path.endsWith('?') || path.endsWith('&') ? '' : '&';
  }

  /**
   * Writes query parameters into `target`, replacing earlier values for the same keys.
   * Numbers and booleans are stringified, `null` and `undefined` are skipped, and array values
   * add the key once per item, so `{tag: ['a', 'b']}` becomes `tag=a&tag=b`.
   *
   * @param target - The parameters collected so far; mutated in place.
   * @param source - Parameters to merge, as `URLSearchParams` or a plain object.
   */
  static mergeQuery = (target: URLSearchParams, source: URLSearchParams | QueryParams): void => {
    const entries = source instanceof URLSearchParams
      ? RestUtils.groupSearchParams(source)
      : Object.entries(source);

    entries.forEach(([key, value]) => {
      target.delete(key);
      RestUtils.appendQuery(target, key, value);
    });
  }

  /**
   * Appends one key's value or values, skipping `null` and `undefined`.
   *
   * @param target - The parameters to append to.
   * @param key - The query parameter name.
   * @param value - A single value or a list of values.
   */
  static appendQuery = (
    target: URLSearchParams,
    key: string,
    value: QueryValue | readonly QueryValue[]
  ): void => {
    const values: readonly QueryValue[] = Array.isArray(value) ? value : [value];
    values
      .filter(item => item !== null && item !== undefined)
      .forEach(item => target.append(key, String(item)));
  }

  /**
   * Groups repeated keys of `URLSearchParams` so a merge replaces each key once with all its values.
   *
   * @param params - Parameters that may repeat a key.
   * @returns One entry per key with every value for that key.
   */
  private static groupSearchParams(params: URLSearchParams): [string, string[]][] {
    return [...new Set(params.keys())].map(key => [key, params.getAll(key)]);
  }

  /**
   * Merges default and request headers case-insensitively; request headers win.
   * Names are lower-cased so `Content-type` and `Content-Type` cannot both reach `fetch`.
   *
   * @param defaults - Client-level default headers.
   * @param overrides - Request-level headers.
   * @returns A plain header record with lower-cased names.
   */
  static mergeHeaders = (defaults: Header = {}, overrides: Header = {}): Header => {
    const merged: Header = {};
    [defaults, overrides].forEach(headers => Object.entries(headers)
      .forEach(([key, value]) => merged[key.toLowerCase()] = value));
    return merged;
  }

  /**
   * Converts a request body into a `fetch` body and adjusts `Content-Type`.
   *
   * Native `fetch` bodies (string, `FormData`, `Blob`, `URLSearchParams`, buffers, streams) are sent
   * unchanged; for `FormData` and `URLSearchParams` a JSON `Content-Type` is removed so `fetch` can
   * set the right one. Every other value is serialized as JSON with `application/json` when no
   * `Content-Type` is set.
   *
   * @param body - The value passed to `RequestBuilder.body`.
   * @param headers - The merged request headers with lower-cased names.
   * @returns The body to send and the headers to send with it.
   */
  static serializeBody = (body: unknown, headers: Header): { body: BodyInit, headers: Header } => {
    const nextHeaders = {...headers};
    if (RestUtils.isNativeBody(body)) {
      const isJsonType = nextHeaders['content-type']?.includes('application/json');
      if (isJsonType && (body instanceof FormData || body instanceof URLSearchParams)) {
        delete nextHeaders['content-type'];
      }
      return {body, headers: nextHeaders};
    }
    nextHeaders['content-type'] ??= 'application/json';
    return {body: JSON.stringify(body), headers: nextHeaders};
  }

  /**
   * Detects values `fetch` already knows how to send, which must not be JSON-encoded.
   *
   * @param body - The value passed to `RequestBuilder.body`.
   * @returns `true` for strings, form data, blobs, buffers, typed arrays, and streams.
   */
  private static isNativeBody(body: unknown): body is BodyInit {
    return typeof body === 'string'
      || body instanceof FormData
      || body instanceof URLSearchParams
      || body instanceof Blob
      || body instanceof ArrayBuffer
      || ArrayBuffer.isView(body)
      || (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream);
  }

  /**
   * Sends the request with a signal that combines caller cancellation and the request timeout.
   *
   * The timeout aborts only this request's internal signal, so a controller shared between requests
   * is never aborted by one request's timeout. The timer keeps running after headers arrive, so a
   * stalled body download is also cut off; a timeout rejects with a `TimeoutError` `DOMException`.
   *
   * @param requestBody - The intercepted request; `timeout` of `0` or `undefined` disables it.
   * @returns The `fetch` response.
   */
  static performFetch = async (requestBody: HttpRequestBody): Promise<Response> => {
    const {uri, method, headers, body, abortController, timeout} = requestBody;
    const signal = RestUtils.createRequestSignal(abortController.signal, timeout);
    const requestInit: RequestInit = {method, signal};

    if (headers) {
      requestInit.headers = headers;
    }

    if (body !== undefined) {
      requestInit.body = body;
    }

    try {
      return await fetch(uri, requestInit);
    } catch (error) {
      throw signal.aborted && RestUtils.isTimeout(signal.reason) ? signal.reason : error;
    }
  }

  /**
   * Links the caller's signal to a request-scoped controller that also aborts on timeout.
   * The timer is unreferenced where supported so a pending timeout never keeps Node alive.
   *
   * @param callerSignal - Signal of the caller-owned or default controller.
   * @param timeout - Milliseconds before the request is aborted; falsy disables the timer.
   * @returns The signal to pass to `fetch`.
   */
  private static createRequestSignal(callerSignal: AbortSignal, timeout?: number): AbortSignal {
    const controller = new AbortController();
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason);
      return controller.signal;
    }

    const timer = timeout
      ? setTimeout(() => controller.abort(RestUtils.timeoutError(timeout)), timeout)
      : undefined;
    (timer as { unref?: () => void } | undefined)?.unref?.();

    callerSignal.addEventListener('abort', () => {
      clearTimeout(timer);
      controller.abort(callerSignal.reason);
    }, {once: true});

    return controller.signal;
  }

  /**
   * Creates the error used for timeouts, matching the name used by `AbortSignal.timeout`.
   *
   * @param timeout - The elapsed timeout in milliseconds, included in the message.
   * @returns A `DOMException` named `TimeoutError`.
   */
  private static timeoutError(timeout: number): DOMException {
    return new DOMException(`Request timed out after ${timeout}ms`, 'TimeoutError');
  }

  /**
   * Tells a timeout apart from a caller cancellation, which rejects with `AbortError`.
   *
   * @param reason - The abort reason of the request signal.
   * @returns `true` when the request was aborted by its timeout.
   */
  private static isTimeout(reason: unknown): boolean {
    return reason instanceof DOMException && reason.name === 'TimeoutError';
  }
}

/** Inputs for {@link RestUtils.createURI}. */
export interface CreateURIOptions {
  baseURI?: string,
  uri?: string,
  params?: URLSearchParams
}

export interface HttpRequestBody {
  uri: string,
  method: string,
  headers?: Header,
  body?: BodyInit,
  timeout?: number,
  /** Caller-facing controller; aborting it cancels the request. Timeouts never abort it. */
  abortController: AbortController
}
