import type {Header} from "@dota/Types.ts";

const ABSOLUTE_URL = /^[a-z][a-z\d+\-.]*:\/\//i;

export class RestUtils {

  /**
   * Creates a full URI by combining the base URI, path, and query parameters.
   *
   * @param options - The options for creating the URI.
   * @param options.baseURI - The base URI to prepend to the path.
   * @param options.uri - The path or endpoint to append to the base URI.
   * @param options.params - The query parameters to append to the URI.
   * @returns The full URI with the base URI, path, and query parameters.
   */
  /**
   * Builds the request URL from an optional base, a path or absolute URL, and query parameters.
   *
   * Exactly one slash separates the base and the path, an absolute `uri` ignores the base, and
   * parameters are appended to any query string already present while a fragment is kept last.
   *
   * @param options - The base URI, request URI, and query parameters.
   * When no `uri` was set, the base URI alone is used.
   *
   * @returns The resolved request URL.
   */
  static createURI = ({baseURI, uri, params}: { baseURI?: string, uri?: string, params?: URLSearchParams }): string => {
    const url = RestUtils.joinURI(baseURI, uri ?? '');
    if (!params || params.size === 0) {
      return url;
    }
    const hashIndex = url.indexOf('#');
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
    const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const separator = !withoutHash.includes('?') ? '?' : withoutHash.endsWith('?') || withoutHash.endsWith('&') ? '' : '&';
    return `${withoutHash}${separator}${params.toString()}${hash}`;
  }

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
   * Merges default and request headers case-insensitively; request headers win.
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

export interface HttpRequestBody {
  uri: string,
  method: string,
  headers?: Header,
  body?: BodyInit,
  timeout?: number,
  /** Controller shared by interceptors, timeout handling, and the fetch signal. */
  abortController: AbortController
}
