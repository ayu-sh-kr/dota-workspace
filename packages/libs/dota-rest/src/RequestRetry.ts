import type {HttpRequestBody} from "@dota/RestUtils.ts";
import {RestUtils} from "@dota/RestUtils.ts";
import type {FetchFunction, HttpMethod, RetryContext, RetryOptions} from "@dota/Types.ts";

const DEFAULT_METHODS: readonly HttpMethod[] = ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS'];
const DEFAULT_STATUS_CODES: readonly number[] = [408, 413, 429, 500, 502, 503, 504];
const DEFAULT_MAX_DELAY = 30000;
const defaultDelay = (attempt: number): number => 300 * 2 ** (attempt - 1);

/**
 * Normalises a retry setting from a builder.
 *
 * @param option - A retry limit, full options, or `false` to disable retries.
 * @returns The retry options, or `undefined` when retries are disabled.
 */
export function toRetryOptions(option: number | RetryOptions | false): RetryOptions | undefined {
  if (option === false) {
    return undefined;
  }
  return typeof option === 'number' ? {limit: option} : option;
}

/**
 * Sends a request and retries it according to `options`.
 *
 * Interceptors have already run, so every attempt sends the same request. A body that is a
 * `ReadableStream` can be read only once and is never retried.
 */
export class RequestRetry {
  private readonly limit: number;
  private readonly methods: readonly HttpMethod[];
  private readonly statusCodes: readonly number[];
  private readonly delay: (attempt: number) => number;
  private readonly maxDelay: number;

  /**
   * @param options - The retry configuration; `undefined` sends a single attempt.
   * @param fetchFn - The `fetch` implementation for every attempt.
   */
  constructor(private readonly options: RetryOptions | undefined, private readonly fetchFn?: FetchFunction) {
    this.limit = options?.limit ?? 0;
    this.methods = options?.methods ?? DEFAULT_METHODS;
    this.statusCodes = options?.statusCodes ?? DEFAULT_STATUS_CODES;
    this.delay = options?.delay ?? defaultDelay;
    this.maxDelay = options?.maxDelay ?? DEFAULT_MAX_DELAY;
  }

  /**
   * Sends the request, retrying retryable failures until the limit is reached.
   *
   * @param request - The intercepted request.
   * @returns The first non-retryable response, or the last response once retries run out.
   */
  async send(request: HttpRequestBody): Promise<Response> {
    const retryable = this.isRetryable(request);

    for (let attempt = 1; ; attempt++) {
      const canRetry = retryable && attempt <= this.limit;
      let response: Response;

      try {
        response = await RestUtils.performFetch(request, this.fetchFn);
      } catch (error) {
        if (!canRetry || !RequestRetry.isNetworkError(error)) {
          throw error;
        }
        await this.wait(request, {attempt, delay: this.backoff(attempt), error});
        continue;
      }

      if (!canRetry || !this.statusCodes.includes(response.status)) {
        return response;
      }

      const retryAfter = RequestRetry.retryAfter(response);
      if (retryAfter !== undefined && retryAfter > this.maxDelay) {
        return response;
      }

      await response.body?.cancel().catch(() => undefined);
      await this.wait(request, {attempt, delay: retryAfter ?? this.backoff(attempt), response});
    }
  }

  private isRetryable(request: HttpRequestBody): boolean {
    const isStream = typeof ReadableStream !== 'undefined' && request.body instanceof ReadableStream;
    return this.limit > 0 && !isStream && this.methods.includes(request.method.toUpperCase() as HttpMethod);
  }

  private backoff(attempt: number): number {
    return Math.min(this.delay(attempt), this.maxDelay);
  }

  private async wait(request: HttpRequestBody, context: RetryContext): Promise<void> {
    await this.options?.beforeRetry?.(context);
    await RequestRetry.sleep(context.delay, request.abortController.signal);
  }

  /** `fetch` rejects with a `TypeError` for network failures; aborts and timeouts are `DOMException`s. */
  private static isNetworkError(error: unknown): boolean {
    return error instanceof TypeError;
  }

  /**
   * Reads `Retry-After` as seconds or an HTTP date.
   *
   * @returns The delay in milliseconds, or `undefined` when the header is absent or invalid.
   */
  private static retryAfter(response: Response): number | undefined {
    const value = response.headers.get('Retry-After');
    if (!value) {
      return undefined;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
      return Math.max(0, seconds * 1000);
    }
    const date = Date.parse(value);
    return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
  }

  private static sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal.addEventListener('abort', onAbort, {once: true});
    });
  }
}
