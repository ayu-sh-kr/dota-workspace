/**
 * Base class for errors created by dota-rest, so callers can tell them apart from errors thrown
 * by their own handlers, converters, or interceptors.
 */
export class RestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RestError';
  }
}

/**
 * Rejection used when HTTP status validation is enabled and a response fails it.
 *
 * Carries the response metadata and the parsed body, so error payloads such as
 * `application/problem+json` can be inspected without reading the response again.
 *
 * @typeParam E - The expected shape of the error body.
 */
export class HttpError<E = unknown> extends RestError {
  /** HTTP status code of the failed response. */
  readonly status: number;
  /** HTTP status text of the failed response. */
  readonly statusText: string;
  /** HTTP method of the request. */
  readonly method: string;
  /** Final request URL as reported by the response, or the requested URL when unavailable. */
  readonly url: string;
  /** Parsed JSON or text body; `undefined` when the body is empty or cannot be read. */
  readonly data: E | undefined;
  /** The original response; its body has already been read into `data`. */
  readonly response: Response;

  constructor(response: Response, request: { method: string, url: string }, data: E | undefined) {
    const url = response.url || request.url;
    super(`${request.method} ${url} failed with ${response.status} ${response.statusText}`.trim());
    this.name = 'HttpError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.method = request.method;
    this.url = url;
    this.data = data;
    this.response = response;
  }
}

/**
 * Narrows an unknown rejection to any error created by dota-rest.
 *
 * @param error - The caught value.
 * @returns `true` for `RestError` and its subclasses such as `HttpError`.
 */
export function isRestError(error: unknown): error is RestError {
  return error instanceof RestError;
}

/**
 * Narrows an unknown rejection to an HTTP status failure.
 *
 * @param error - The caught value.
 * @returns `true` when the response failed status validation.
 */
export function isHttpError<E = unknown>(error: unknown): error is HttpError<E> {
  return error instanceof HttpError;
}

/**
 * Detects a request that was cut off by its timeout. Timeouts reject with a `DOMException`
 * named `TimeoutError`, the same shape `AbortSignal.timeout` produces.
 *
 * @param error - The caught value.
 * @returns `true` when the request timed out.
 */
export function isTimeoutError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'TimeoutError';
}

/**
 * Detects a request cancelled through its `AbortController`, as opposed to a timeout.
 *
 * @param error - The caught value.
 * @returns `true` when the caller aborted the request.
 */
export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}
