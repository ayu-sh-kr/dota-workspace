import {Header} from "./index";

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
   * Make a fetch call based on the {@link HttpRequestBody} and return the response object as a promise.
   *
   * A `RequestInit` and `AbortController` is set up to make the fetch call with ability to abort once the specified
   * time is passed. Specified time can be user provided or default.
   *
   * @param requestBody - {@link HttpRequestBody} object containing required field to construct a `RequestInit` for `fetch` call.
   * @return Promise<Response> - Promise resolving to the `Response` object
   */
  static performFetch = async (requestBody: HttpRequestBody) => {
    const abortController = new AbortController();
    const {uri, method, headers, body} = requestBody;
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
  timeout?: number
}