import type {Header} from "@dota/Types.ts";

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
  static createURI = ({baseURI, uri, params}: { baseURI?: string, uri: string, params?: URLSearchParams }) => {
    if (baseURI) {
      let url = `${baseURI}${uri}`;
      if (params && params.size > 0) {
        return `${url}?${params.toString()}`
      }

      return url;
    }

    if (params && params.size > 0) {
      return `${uri}?${params.toString()}`
    }

    return uri;
  }


  /**
   * Executes a prepared request with its request-scoped abort controller.
   * Sharing the controller with the interceptor chain ensures manual cancellation
   * and timeout cancellation act on the same signal passed to `fetch`.
   * @param requestBody Final request produced by the client and its interceptors.
   * @returns The response returned by `fetch`.
   */
  static performFetch = async (requestBody: HttpRequestBody) => {
    const {uri, method, headers, body, abortController} = requestBody;
    const requestInit: RequestInit = {
      method: method,
      signal: abortController.signal
    }

    if (headers) {
      requestInit.headers = headers;
    }

    if (body) {
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
  body?: string,
  timeout?: number,
  /** Controller shared by interceptors, timeout handling, and the fetch signal. */
  abortController: AbortController
}
