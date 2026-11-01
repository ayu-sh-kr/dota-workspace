import type {Header} from "@dota/Types.ts";

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

  static performFetch = async (requestBody: HttpRequestBody) => {
    const {uri, method, headers, body, abortController} = requestBody;
    const requestInit: RequestInit = {
      method: method,
      signal: abortController.signal
    }

    if (headers) {
      requestInit.headers = headers;
    }

    if (body !== undefined) {
      requestInit.body = body;
    }

    const timeOutId = requestBody.timeout ?
      setTimeout(() => abortController.abort(), requestBody.timeout) :
      undefined;

    return await fetch(uri, requestInit)
      .finally(() => clearTimeout(timeOutId));
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
  /** Controller shared by interceptors, timeout handling, and the fetch signal. */
  abortController: AbortController
}
