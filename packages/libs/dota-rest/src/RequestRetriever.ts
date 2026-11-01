import {RestRequestBuilder} from "@dota/RequestBuilder.ts";
import {RequestInterceptorProcessor} from "@dota/RequestInterceptor.ts";
import {HttpRequestBody, RestUtils} from "@dota/RestUtils.ts";
import {ResponseResolver, RestResponseResolver} from "@dota/ResponseResolver.ts";
import {RequestRetry} from "@dota/RequestRetry.ts";
import {ResponseHandler} from "@dota/Types.ts";

/**
 * The `RequestRetriever` interface defines the contract for retrieving and executing HTTP requests
 * based on the configuration provided by a `RestRequestBuilder` instance.
 *
 * Implementations of this interface are responsible for constructing the HTTP request, performing
 * the request, and returning a `ResponseResolver` to handle the response.
 */
export interface RequestRetriever {
  /**
   * Retrieves and executes an HTTP request based on the configuration provided by the `RestRequestBuilder`.
   *
   * This method constructs the request using the builder's configuration, performs the HTTP request,
   * and returns a `ResponseResolver` to handle the response.
   *
   * @typeParam T - The type of the response data expected from the HTTP request.
   * @param builder - An instance of `RestRequestBuilder` containing the configuration for the HTTP request.
   * @returns A `ResponseResolver` instance to handle the response of the HTTP request.
   */
  retrieve<T>(builder: RestRequestBuilder<T>): ResponseResolver<T>;
}

/**
 * The `RestRequestRetriever` class implements the `RequestRetriever` interface and is responsible for
 * retrieving and executing HTTP requests based on the configuration provided by a `RestRequestBuilder`.
 *
 * This class constructs the HTTP request, performs the request using the `RestUtils` utility class,
 * and returns a `ResponseResolver` to handle the response.
 */
export class RestRequestRetriever implements RequestRetriever {

  constructor(private _handler: ResponseHandler | undefined) {
  }

  /**
   * Builds the final request, applies client interceptors in registration order, and sends it with
   * the configured retry policy and `fetch` implementation. Errors while building the request
   * reject the returned resolver instead of throwing.
   * Each interceptor observes the previous interceptor's result, and `fetch` only
   * starts after the complete synchronous or asynchronous pipeline succeeds.
   * @param builder Request configuration collected by the fluent API.
   * @returns A resolver backed by the intercepted request's response promise.
   */
  retrieve<T extends any>(builder: RestRequestBuilder<T>): ResponseResolver<T> {
    const method = builder.getMethod();
    let uri = '';
    let response: Promise<Response>;

    try {
      uri = RestUtils.createURI({
        baseURI: builder.getBaseUri(),
        uri: builder.getUri(),
        params: builder.getParams()
      });
      const requestBody = RestRequestRetriever.createRequestBody(builder, uri);
      const interceptorProcessor = new RequestInterceptorProcessor(builder.getRequestInterceptors());
      const retry = new RequestRetry(builder.getRetry(), builder.getFetch());
      response = interceptorProcessor
        .process(requestBody)
        .then(request => retry.send(request));
    } catch (error) {
      response = Promise.reject(error);
    }

    // The request starts now; this branch only stops unread failures becoming unhandled rejections.
    response.catch(() => undefined);

    return new RestResponseResolver<T>(response, this._handler, {
      validateStatus: builder.getValidateStatus(),
      request: {method, url: uri}
    });
  }

  private static createRequestBody<T>(builder: RestRequestBuilder<T>, uri: string): HttpRequestBody {
    const headers = RestUtils.omitHeaders(
      RestUtils.mergeHeaders(builder.getDefaultHeaders(), builder.getHeaders()),
      builder.getRemovedHeaders()
    );
    const requestBody: HttpRequestBody = {
      uri,
      method: builder.getMethod(),
      headers,
      timeout: builder.getTimeout(),
      fetchOptions: builder.getFetchOptions(),
      abortController: builder.getAbortController()
    };

    const body = builder.getBody();
    if (body !== undefined) {
      Object.assign(requestBody, RestUtils.serializeBody(body, headers));
    }
    return requestBody;
  }

}
