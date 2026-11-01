import {RequestBuilder, RestRequestBuilder} from "@dota/RequestBuilder.ts";
import type {RequestInterceptor} from "@dota/RequestInterceptor.ts";
import {Header, ResponseHandler, StatusValidator} from "@dota/Types.ts";


export interface ClientBuilder {

  /**
   * Sets the base URL for the `RestClient`.
   *
   * @param url - The base URL to be used by the `RestClient`.
   * @returns The current instance of the `RestClientBuilder` for method chaining.
   */
  baseUrl(url: string): ClientBuilder;

  /**
   * Sets the default headers for the `RestClient`.
   *
   * Calling it again merges the new headers into the earlier ones; a repeated name replaces
   * the earlier value.
   *
   * @param headers - The headers to be used by the `RestClient`.
   * @returns The current instance of the `RestClientBuilder` for method chaining.
   */
  defaultHeaders(headers: Header): ClientBuilder;


  /**
   * Use this to set a response handler which will be used to process response before
   * resolving to `toEntity`, `toVoid` or `toResponse`
   * @param handler - Function to resolve response.
   */
  handler(handler: ResponseHandler): ClientBuilder;

  /**
   * Adds a request interceptor that runs before every request made by this client.
   * Repeated calls register an ordered pipeline, which supports synchronous and
   * asynchronous changes such as adding authorization headers.
   * @param interceptor Function that inspects or changes the final request.
   * @returns The current builder for method chaining.
   */
  requestInterceptor(interceptor: RequestInterceptor): ClientBuilder;

  /**
   * Use this to set a timeout period after which the `fetch` call will be aborted.
   *
   * @param timeout - Time in milliseconds after which the fetch will be aborted
   * @returns The current instance of the `RestClientBuilder` for method chaining.
   */
  timeout(timeout: number): ClientBuilder;

  /**
   * Makes `toEntity`, `toVoid`, and `toResponse` reject with `HttpError` for failing statuses.
   * Off by default, so 4xx and 5xx responses resolve normally unless this is called. The
   * response handler still runs before the status is checked.
   *
   * @param validateStatus - `true` (default) treats 2xx as success, `false` turns the check off,
   * and a function decides per status code.
   * @returns The current builder for method chaining.
   */
  throwHttpErrors(validateStatus?: boolean | StatusValidator): ClientBuilder;


  /**
   * Builds and returns a new instance of the `RestClient` with the specified base URL and headers.
   *
   * @returns A new instance of the `RestClient` configured with the specified base URL and headers.
   */
  build(): RestClient;
}

/**
 * Configuration options for the `RestClient`.
 */
export type RestClientConfig = {
  /**
   * The base URL of the API to be used for each request.
   * This can be set to make your code cleaner for multiple requests to the same API.
   *
   * Example:
   * ```typescript
   * const client = RestClient.create()
   *      .baseUrl('https://api.example.com')
   *      .defaultHeaders({ 'Authorization': 'Bearer token' })
   *      .timeout(5000)
   *      .build();
   * ```
   */
  baseUrl?: string;

  /**
   * Default headers to be included in each request.
   * This can include headers like `Authorization` or other API-specific headers required by the service provider.
   */
  headers?: Header;

  /**
   * The amount of time (in milliseconds) after which the request will be aborted if no response is received.
   * By default, the timeout is set to 10000ms (10 seconds).
   * This can be configured for the `RestClient` as a whole or for specific requests.
   */
  /** Request timeout in milliseconds. */
  timeout?: number;

  /** @deprecated Misspelled alias of `timeout`; read only when `timeout` is not set. */
  timout?: number;

  /** When set, statuses it rejects make terminal calls reject with `HttpError`. */
  validateStatus?: StatusValidator;

  /**
   * A handler function responsible for handling responses with undesirable status codes.
   * This function should throw an error or return void after execution.
   *
   * @param response - The response returned by the fetch API after the API call.
   */
  handler?: ResponseHandler

  /** Interceptors applied in registration order before each request is sent. */
  requestInterceptors?: readonly RequestInterceptor[];
}


/**
 * The `RestClient` class is responsible for creating and configuring HTTP clients to make RESTful API requests.
 *
 * This class provides methods to create instances of `RestRequestMaker` for various HTTP methods such as GET, POST, PUT, PATCH, and DELETE.
 * It also includes a builder pattern for setting the base URL and default headers for the `RestClient`.
 *
 * Example usage:
 * ```typescript
 * const client = RestClient.create()
 *     .baseUrl('https://api.example.com')
 *     .defaultHeaders({ 'Authorization': 'Bearer token' })
 *     .timeout(5000)
 *     .build();
 *
 * const response = await client.get<User>().uri('/users/1').retrieve().toEntity();
 * console.log(response.data);
 */
const DEFAULT_TIMEOUT = 10000;

/** Default status check used by `throwHttpErrors()`: 2xx is success, as with `Response.ok`. */
const isSuccessStatus: StatusValidator = status => status >= 200 && status < 300;

export class RestClient {

  private config!: RestClientConfig;

  private constructor(config: RestClientConfig) {
    this.config = config;
  }

  /**
   * Creates a new instance of the `RestClientBuilder`. This method there to
   * provide backward compatibility with the old code.
   */
  /** Effective timeout, honouring the deprecated `timout` field for older configurations. */
  private get timeout(): number {
    return this.config.timeout ?? this.config.timout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Normalises the `throwHttpErrors` argument into a status check.
   *
   * @param option - `true` for the default 2xx check, `false` to disable, or a custom check.
   * @returns The check to apply, or `undefined` when HTTP errors resolve normally.
   */
  private static toStatusValidator(option: boolean | StatusValidator): StatusValidator | undefined {
    if (typeof option === 'function') {
      return option;
    }
    return option ? isSuccessStatus : undefined;
  }

  static create(): ClientBuilder {
    return RestClient.builder();
  }

  /**
   * Creates a new instance of the `RestClientBuilder` class, which is used to configure and build a `RestClient` instance.
   *
   * The `RestClientBuilder` class provides methods to set the base URL and default headers for the `RestClient`.
   * Once configured, the `build` method of the `RestClientBuilder` can be called to create a new `RestClient` instance
   * with the specified base URL and headers.
   *
   * @returns A new instance of the `RestClientBuilder` class.
   */
  static builder(): ClientBuilder {
    class RestClientBuilder implements ClientBuilder {
      _baseurl = '';
      _headers: Header = {};
      _timeout: number = 10000;
      _handler?: ResponseHandler;
      _validateStatus?: StatusValidator;
      _requestInterceptors: RequestInterceptor[] = [];

      public baseUrl(url: string) {
        this._baseurl = url;
        return this;
      }

      public defaultHeaders(headers: Header) {
        this._headers = {...this._headers, ...headers};
        return this;
      }


      public timeout(timeout: number) {
        this._timeout = timeout;
        return this;
      }

      public handler(handler: ResponseHandler) {
        this._handler = handler;
        return this;
      }

      /** Adds an interceptor to the ordered pipeline shared by this client. */
      public throwHttpErrors(validateStatus: boolean | StatusValidator = true) {
        this._validateStatus = RestClient.toStatusValidator(validateStatus);
        return this;
      }

      public requestInterceptor(interceptor: RequestInterceptor) {
        this._requestInterceptors.push(interceptor);
        return this;
      }

      public build() {
        return new RestClient({
          baseUrl: this._baseurl,
          headers: this._headers,
          timeout: this._timeout,
          timout: this._timeout,
          handler: this._handler,
          validateStatus: this._validateStatus,
          requestInterceptors: [...this._requestInterceptors]
        });
      }
    }

    return new RestClientBuilder();
  }


  /**
   * Creates a new `RestRequestMaker` instance configured for a POST request.
   *
   * @typeParam T - The type of the response data.
   * @returns A new `RestRequestMaker` instance configured for a POST request.
   */
  post<T>(): RequestBuilder<T> {
    return new RestRequestBuilder<T>({
      method: 'POST',
      headers: {...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.timeout,
      validateStatus: this.config.validateStatus,
      handler: this.config.handler,
      requestInterceptors: this.config.requestInterceptors
    })
  }


  /**
   * Creates a new `RestRequestBuilder` instance configured for a GET request.
   *
   * @typeParam T - The type of the response data.
   * @returns A new `RestRequestBuilder` instance configured for a GET request.
   */
  get<T>(): RequestBuilder<T> {
    return new RestRequestBuilder<T>({
      method: 'GET',
      headers: {...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.timeout,
      validateStatus: this.config.validateStatus,
      handler: this.config.handler,
      requestInterceptors: this.config.requestInterceptors
    })
  }


  /**
   * Creates a new `RestRequestBuilder` instance configured for a PATCH request.
   *
   * @typeParam T - The type of the response data.
   * @returns A new `RestRequestBuilder` instance configured for a PATCH request.
   */
  patch<T>(): RequestBuilder<T> {
    return new RestRequestBuilder<T>({
      method: 'PATCH',
      headers: {...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.timeout,
      validateStatus: this.config.validateStatus,
      handler: this.config.handler,
      requestInterceptors: this.config.requestInterceptors
    })
  }


  /**
   * Creates a new `RestRequestBuilder` instance configured for a PUT request.
   *
   * @typeParam T - The type of the response data.
   * @returns A new `RestRequestBuilder` instance configured for a PUT request.
   */
  put<T>(): RequestBuilder<T> {
    return new RestRequestBuilder<T>({
      method: 'PUT',
      headers: {...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.timeout,
      validateStatus: this.config.validateStatus,
      handler: this.config.handler,
      requestInterceptors: this.config.requestInterceptors
    })
  }


  /**
   * Creates a new `RestRequestBuilder` instance configured for a DELETE request.
   *
   * @typeParam T - The type of the response data.
   * @returns A new `RestRequestBuilder` instance configured for a DELETE request.
   */
  delete<T>(): RequestBuilder<T> {
    return new RestRequestBuilder<T>({
      method: 'DELETE',
      headers: {...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.timeout,
      validateStatus: this.config.validateStatus,
      handler: this.config.handler,
      requestInterceptors: this.config.requestInterceptors
    })
  }
}
