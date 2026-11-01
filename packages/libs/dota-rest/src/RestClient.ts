import {RequestBuilder, RestRequestBuilder} from "@dota/RequestBuilder.ts";
import type {RequestInterceptor} from "@dota/RequestInterceptor.ts";
import {toRetryOptions} from "@dota/RequestRetry.ts";
import {
  FetchFunction,
  FetchOptions,
  Header,
  HttpMethod,
  ResponseHandler,
  RetryOptions,
  StatusValidator
} from "@dota/Types.ts";


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
   * Sends every request through `fetchFn` instead of the global `fetch`, for example a server-side
   * implementation, a custom agent, or a test double.
   *
   * @param fetchFn - A `fetch`-compatible function.
   * @returns The builder.
   */
  fetch(fetchFn: FetchFunction): ClientBuilder;

  /**
   * Sets default `RequestInit` options such as `credentials: 'include'`, merged with earlier calls.
   *
   * @param options - The options to pass to `fetch`.
   * @returns The builder.
   */
  fetchOptions(options: FetchOptions): ClientBuilder;

  /**
   * Sets the default retry policy. Retries are off by default.
   *
   * @param retry - A retry limit, full options, or `false` to disable retries.
   * @returns The builder.
   */
  retry(retry: number | RetryOptions | false): ClientBuilder;

  /**
   * Builds and returns a new instance of the `RestClient` from the configured settings.
   *
   * @returns A new instance of the `RestClient` configured by this builder.
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

  /** The `fetch` implementation; the global `fetch` when unset. */
  fetch?: FetchFunction;

  /** Default `RequestInit` options such as `credentials` or `cache`. */
  fetchOptions?: FetchOptions;

  /** Default retry policy; requests are not retried when unset. */
  retry?: RetryOptions;
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

/**
 * Normalises the `throwHttpErrors` argument into a status check.
 *
 * @param option - `true` for the default 2xx check, `false` to disable, or a custom check.
 * @returns The check to apply, or `undefined` when HTTP errors resolve normally.
 */
function toStatusValidator(option: boolean | StatusValidator): StatusValidator | undefined {
  if (typeof option === 'function') {
    return option;
  }
  return option ? isSuccessStatus : undefined;
}

export class RestClient {

  private config!: RestClientConfig;

  private constructor(config: RestClientConfig) {
    this.config = config;
  }

  /**
   * Creates a client from a complete configuration; used by the client builder.
   *
   * @internal
   */
  static fromConfig(config: RestClientConfig): RestClient {
    return new RestClient(config);
  }

  /** Effective timeout, honouring the deprecated `timout` field for older configurations. */
  private get timeout(): number {
    return this.config.timeout ?? this.config.timout ?? DEFAULT_TIMEOUT;
  }

  /** Creates a client builder; an alias of {@link RestClient.builder} kept for older code. */
  static create(): ClientBuilder {
    return RestClient.builder();
  }

  /**
   * Creates a builder that configures and builds a `RestClient`.
   *
   * @returns A new, empty client builder.
   */
  static builder(): ClientBuilder {
    return new RestClientBuilder({});
  }

  /**
   * Creates a builder seeded with this client's configuration, for deriving a client that shares
   * it, such as an authenticated sub-client. Headers, fetch options, and interceptors added to the
   * builder are merged with or appended to this client's; other settings replace them. This client
   * is not changed.
   *
   * @example
   * ```typescript
   * const authed = api.extend()
   *   .defaultHeaders({Authorization: `Bearer ${token}`})
   *   .build();
   * ```
   * @returns A builder seeded with a copy of this client's configuration.
   */
  extend(): ClientBuilder {
    return new RestClientBuilder({...this.config, timeout: this.timeout});
  }

  /**
   * Starts a request with any supported HTTP method.
   *
   * @typeParam T - The type of the response data.
   * @param method - The HTTP method.
   * @returns A request builder preconfigured with the client's settings.
   */
  request<T>(method: HttpMethod): RequestBuilder<T> {
    return new RestRequestBuilder<T>({
      method,
      headers: {...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.timeout,
      validateStatus: this.config.validateStatus,
      handler: this.config.handler,
      requestInterceptors: this.config.requestInterceptors,
      fetch: this.config.fetch,
      fetchOptions: this.config.fetchOptions,
      retry: this.config.retry
    });
  }

  /** Starts a `POST` request; `T` is the response data type. */
  post<T>(): RequestBuilder<T> {
    return this.request<T>('POST');
  }

  /** Starts a `GET` request; `T` is the response data type. */
  get<T>(): RequestBuilder<T> {
    return this.request<T>('GET');
  }

  /** Starts a `PATCH` request; `T` is the response data type. */
  patch<T>(): RequestBuilder<T> {
    return this.request<T>('PATCH');
  }

  /** Starts a `PUT` request; `T` is the response data type. */
  put<T>(): RequestBuilder<T> {
    return this.request<T>('PUT');
  }

  /** Starts a `DELETE` request; `T` is the response data type. */
  delete<T>(): RequestBuilder<T> {
    return this.request<T>('DELETE');
  }

  /** Starts a `HEAD` request; the response has headers and no body. */
  head(): RequestBuilder<void> {
    return this.request<void>('HEAD');
  }

  /** Starts an `OPTIONS` request; `T` is the response data type. */
  options<T>(): RequestBuilder<T> {
    return this.request<T>('OPTIONS');
  }
}

/** Builds a {@link RestClient}, optionally starting from an existing client's configuration. */
class RestClientBuilder implements ClientBuilder {
  private _baseurl: string;
  private _headers: Header;
  private _timeout: number;
  private _handler?: ResponseHandler;
  private _validateStatus?: StatusValidator;
  private readonly _requestInterceptors: RequestInterceptor[];
  private _fetch?: FetchFunction;
  private _fetchOptions: FetchOptions;
  private _retry?: RetryOptions;

  constructor(config: RestClientConfig) {
    this._baseurl = config.baseUrl ?? '';
    this._headers = {...config.headers};
    this._timeout = config.timeout ?? config.timout ?? DEFAULT_TIMEOUT;
    this._handler = config.handler;
    this._validateStatus = config.validateStatus;
    this._requestInterceptors = [...config.requestInterceptors ?? []];
    this._fetch = config.fetch;
    this._fetchOptions = {...config.fetchOptions};
    this._retry = config.retry;
  }

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

  public throwHttpErrors(validateStatus: boolean | StatusValidator = true) {
    this._validateStatus = toStatusValidator(validateStatus);
    return this;
  }

  public requestInterceptor(interceptor: RequestInterceptor) {
    this._requestInterceptors.push(interceptor);
    return this;
  }

  public fetch(fetchFn: FetchFunction) {
    this._fetch = fetchFn;
    return this;
  }

  public fetchOptions(options: FetchOptions) {
    this._fetchOptions = {...this._fetchOptions, ...options};
    return this;
  }

  public retry(retry: number | RetryOptions | false) {
    this._retry = toRetryOptions(retry);
    return this;
  }

  public build() {
    return RestClient.fromConfig({
      baseUrl: this._baseurl,
      headers: {...this._headers},
      timeout: this._timeout,
      timout: this._timeout,
      handler: this._handler,
      validateStatus: this._validateStatus,
      requestInterceptors: [...this._requestInterceptors],
      fetch: this._fetch,
      fetchOptions: {...this._fetchOptions},
      retry: this._retry
    });
  }
}
