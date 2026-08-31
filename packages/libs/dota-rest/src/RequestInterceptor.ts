import type {HttpRequestBody} from "@dota/RestUtils.ts";

/**
 * Changes a fully constructed request before it is passed to `fetch`.
 * Interceptors may mutate the request in place or return a replacement, and
 * may be asynchronous for work such as obtaining a fresh access token.
 * @param request The request produced from the client and per-call configuration.
 * @returns A replacement request, or `void` when the supplied request was mutated.
 */
export type RequestInterceptor = (
  request: HttpRequestBody
) => HttpRequestBody | void | Promise<HttpRequestBody | void>;

/** Applies a client interceptor pipeline to each fully constructed request. */
export class RequestInterceptorProcessor {
  constructor(private readonly interceptors: readonly RequestInterceptor[] = []) {
  }

  /**
   * Runs interceptors sequentially so each one observes prior request changes.
   * In-place mutation remains active when an interceptor returns `void`, while a
   * returned request replaces the value passed to the remaining pipeline.
   * @param request Request prepared by the fluent builder.
   * @returns The final request after every interceptor succeeds.
   * @throws The first synchronous or asynchronous interceptor error.
   */
  async process(request: HttpRequestBody): Promise<HttpRequestBody> {
    let interceptedRequest = request;

    for (const interceptor of this.interceptors) {
      interceptedRequest = await interceptor(interceptedRequest) ?? interceptedRequest;
    }

    return interceptedRequest;
  }
}
