import {RestRequestBuilder} from "@dota/RequestBuilder.ts";
import {RequestInterceptorProcessor} from "@dota/RequestInterceptor.ts";
import {HttpRequestBody, RestUtils} from "@dota/RestUtils.ts";
import {ResponseResolver, RestResponseResolver} from "@dota/ResponseResolver.ts";
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
   * Builds the final request and applies client interceptors in registration order.
   * Each interceptor observes the previous interceptor's result, and `fetch` only
   * starts after the complete synchronous or asynchronous pipeline succeeds.
   * @param builder Request configuration collected by the fluent API.
   * @returns A resolver backed by the intercepted request's response promise.
   */
  retrieve<T extends any>(builder: RestRequestBuilder<T>): ResponseResolver<T> {
    const uri = RestUtils.createURI({
      baseURI: builder.getBaseUri(),
      uri: builder.getUri(),
      params: builder.getParams()
    });

    const requestBody: HttpRequestBody = {
      uri: uri,
      method: builder.getMethod(),
      headers: {...builder.getDefaultHeaders(), ...builder.getHeaders()},
      timeout: builder.getTimeout(),
      abortController: builder.getAbortController()
    };

    if (builder.getBody()) {
      requestBody.body = JSON.stringify(builder.getBody());
    }

    const interceptorProcessor = new RequestInterceptorProcessor(builder.getRequestInterceptors());
    const response = interceptorProcessor
      .process(requestBody)
      .then(RestUtils.performFetch);

    return new RestResponseResolver<T>(response, this._handler);
  }

}
