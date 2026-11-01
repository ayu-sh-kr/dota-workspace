import {RestRequestRetriever} from "@dota/RequestRetriever.ts";
import type {RequestInterceptor} from "@dota/RequestInterceptor.ts";
import {
  FetchFunction,
  FetchOptions,
  Header,
  HttpMethod,
  PathParams,
  QueryParams,
  QueryValue,
  RequestSetup,
  ResponseHandler,
  RetryOptions,
  StatusValidator
} from "@dota/Types.ts";
import {toRetryOptions} from "@dota/RequestRetry.ts";
import {RestUtils} from "@dota/RestUtils.ts";
import {ResponseResolver} from "@dota/ResponseResolver.ts";

/**
 * The `RequestBuilder` interface defines a fluent API for constructing and configuring HTTP requests.
 *
 * This interface provides methods to set various aspects of an HTTP request, such as the base URI,
 * specific URI, headers, query parameters, request body, and timeout. It also includes a method to
 * retrieve the configured request and execute it.
 *
 * @typeParam T - The type of the response data expected from the HTTP request.
 */
export interface RequestBuilder<T> {
  /**
   * Sets the base URI for the HTTP request.
   *
   * @param baseURI - The base URI to be used for the request.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  baseURI(baseURI: string): RequestBuilder<T>;

  /**
   * Sets the specific URI for the HTTP request.
   *
   * @param uri - The URI to be appended to the base URI for the request.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  uri(uri: string): RequestBuilder<T>;

  /**
   * Sets the timeout duration for the HTTP request.
   *
   * @param timeout - The timeout duration in milliseconds.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  timeout(timeout: number): RequestBuilder<T>;

  /**
   * Replaces the controller used to cancel this request.
   * The controller is exposed to interceptors and its signal is passed to `fetch`.
   * @param controller Controller owned by the caller for manual cancellation.
   * @returns The current request builder for method chaining.
   */
  abortController(controller: AbortController): RequestBuilder<T>;

  /**
   * Sets multiple headers for the HTTP request.
   *
   * @param header - An object containing key-value pairs of headers.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  headers(header: Header): RequestBuilder<T>;

  /**
   * Sets a single header for the HTTP request.
   *
   * @param key - The name of the header.
   * @param value - The value of the header.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  header(key: string, value: string): RequestBuilder<T>;

  /**
   * Sets multiple query parameters for the HTTP request.
   *
   * Parameters merge with those already set: a key given here replaces earlier values for that
   * key, and other keys are kept. Arrays add the key once per item; `null` and `undefined` are skipped.
   *
   * @param params - `URLSearchParams` or a plain object of query parameters.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  params(params: URLSearchParams | QueryParams): RequestBuilder<T>;

  /**
   * Sets a single query parameter for the HTTP request.
   *
   * The value is appended, so calling it twice with the same key sends both values.
   *
   * @param key - The name of the query parameter.
   * @param value - A value or list of values; numbers and booleans are stringified, and `null`
   * and `undefined` are skipped.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  param(key: string, value: QueryValue | readonly QueryValue[]): RequestBuilder<T>;

  /**
   * Sets the body of the HTTP request.
   *
   * Strings, `FormData`, `Blob`, `URLSearchParams`, buffers, and streams are sent unchanged.
   * Any other value, including `0`, `false`, and `null`, is sent as JSON with
   * `Content-Type: application/json` unless a content type is already set.
   *
   * @param item - The body content to be sent with the request.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  body(item: any): RequestBuilder<T>;

  /**
   * Removes a header for this request only, including a client default header. Names ignore case.
   *
   * @param key - The header name.
   * @returns The builder.
   */
  removeHeader(key: string): RequestBuilder<T>;

  /**
   * Sets one value for a `{name}` placeholder in the URI; the value is URL-encoded.
   *
   * @param key - The placeholder name without braces.
   * @param value - The value to substitute.
   * @returns The builder.
   */
  pathParam(key: string, value: string | number | boolean): RequestBuilder<T>;

  /**
   * Sets values for `{name}` placeholders in the URI, merged with earlier values.
   *
   * @example
   * ```typescript
   * client.get<User>().uri('/users/{id}').pathParams({id: 42}).retrieve();
   * ```
   * @param params - The values to substitute; each is URL-encoded.
   * @returns The builder.
   */
  pathParams(params: PathParams): RequestBuilder<T>;

  /**
   * Sets `RequestInit` options such as `credentials` or `cache`, merged over the client's options.
   *
   * @param options - The options to pass to `fetch`.
   * @returns The builder.
   */
  fetchOptions(options: FetchOptions): RequestBuilder<T>;

  /**
   * Overrides the client's retry policy for this request.
   *
   * @param retry - A retry limit, full options, or `false` to disable retries.
   * @returns The builder.
   */
  retry(retry: number | RetryOptions | false): RequestBuilder<T>;

  /**
   * Finalizes the request configuration and retrieves a `ResponseResolver` instance.
   *
   * The `ResponseResolver` is responsible for executing the HTTP request and handling the response.
   *
   * @returns An instance of `ResponseResolver` to execute the request and handle the response.
   */
  retrieve(): ResponseResolver<T>;
}


/**
 * The `RestRequestBuilder` class implements the `RequestBuilder` interface, providing a fluent API for constructing
 * and configuring HTTP requests. It allows setting various aspects of the request, such as the base URI, specific URI,
 * headers, query parameters, request body, and timeout.
 *
 * @typeParam T - The type of the response data expected from the HTTP request.
 */
export class RestRequestBuilder<T> implements RequestBuilder<T> {

  private _baseUri: string;
  private _uri!: string;
  private readonly _defaultHeaders: Header;
  private readonly method: HttpMethod;
  private _timeout: number;
  private _headers: Header;
  private _params: URLSearchParams;
  private _body: any;
  private readonly _removedHeaders = new Set<string>();
  private _pathParams: PathParams = {};
  private _fetchOptions: FetchOptions;
  private _retry: RetryOptions | undefined;
  private readonly _fetch: FetchFunction | undefined;
  private readonly _handler: ResponseHandler | undefined;
  private readonly _requestInterceptors: readonly RequestInterceptor[];
  private _abortController: AbortController;
  private readonly _validateStatus: StatusValidator | undefined;

  constructor(requestSetup: RequestSetup) {
    this._baseUri = requestSetup.baseUri || '';
    this.method = requestSetup.method;
    this._defaultHeaders = requestSetup.headers || {};
    this._timeout = requestSetup.timeout;
    this._headers = {}
    this._params = new URLSearchParams();
    this._handler = requestSetup.handler;
    this._requestInterceptors = requestSetup.requestInterceptors || [];
    this._abortController = requestSetup.abortController || new AbortController();
    this._validateStatus = requestSetup.validateStatus;
    this._fetchOptions = {...requestSetup.fetchOptions};
    this._retry = requestSetup.retry;
    this._fetch = requestSetup.fetch;
  }


  baseURI(baseURI: string): RequestBuilder<T> {
    this._baseUri = baseURI;
    return this;
  }

  uri(uri: string): RequestBuilder<T> {
    this._uri = uri;
    return this;
  }

  header(key: string, value: string): RequestBuilder<T> {
    this._removedHeaders.delete(key.toLowerCase());
    this._headers[key] = value;
    return this;
  }

  headers(header: Header): RequestBuilder<T> {
    Object.keys(header).forEach(key => this._removedHeaders.delete(key.toLowerCase()));
    this._headers = {...this._headers, ...header};
    return this;
  }

  param(key: string, value: QueryValue | readonly QueryValue[]): RequestBuilder<T> {
    RestUtils.appendQuery(this._params, key, value);
    return this;
  }

  params(params: URLSearchParams | QueryParams): RequestBuilder<T> {
    RestUtils.mergeQuery(this._params, params);
    return this;
  }

  timeout(timeout: number): RequestBuilder<T> {
    this._timeout = timeout;
    return this;
  }

  /** Replaces the request-scoped controller used by interceptors and `fetch`. */
  abortController(controller: AbortController): RequestBuilder<T> {
    this._abortController = controller;
    return this;
  }

  body(item: any): RequestBuilder<T> {
    this._body = item;
    return this;
  }

  removeHeader(key: string): RequestBuilder<T> {
    const name = key.toLowerCase();
    this._removedHeaders.add(name);
    Object.keys(this._headers)
      .filter(header => header.toLowerCase() === name)
      .forEach(header => delete this._headers[header]);
    return this;
  }

  pathParam(key: string, value: string | number | boolean): RequestBuilder<T> {
    this._pathParams[key] = value;
    return this;
  }

  pathParams(params: PathParams): RequestBuilder<T> {
    this._pathParams = {...this._pathParams, ...params};
    return this;
  }

  fetchOptions(options: FetchOptions): RequestBuilder<T> {
    this._fetchOptions = {...this._fetchOptions, ...options};
    return this;
  }

  retry(retry: number | RetryOptions | false): RequestBuilder<T> {
    this._retry = toRetryOptions(retry);
    return this;
  }

  retrieve(): ResponseResolver<T> {
    const retriever = new RestRequestRetriever(this._handler);
    return retriever.retrieve<T>(this)
  }

  getBaseUri(): string {
    return this._baseUri;
  }

  getUri(): string {
    return this._uri;
  }

  getDefaultHeaders(): Header {
    return this._defaultHeaders;
  }

  getMethod(): HttpMethod {
    return this.method;
  }

  getTimeout(): number {
    return this._timeout;
  }

  /** Returns the request-scoped controller selected by the caller or builder. */
  getAbortController(): AbortController {
    return this._abortController;
  }

  getHeaders(): Header {
    return this._headers;
  }

  getParams(): URLSearchParams {
    return this._params;
  }

  getBody(): any {
    return this._body;
  }

  /** Returns the client-wide interceptor pipeline for request execution. */
  /** Status check inherited from the client, or `undefined` when HTTP errors resolve normally. */
  getValidateStatus(): StatusValidator | undefined {
    return this._validateStatus;
  }

  getRemovedHeaders(): ReadonlySet<string> {
    return this._removedHeaders;
  }

  getPathParams(): PathParams {
    return this._pathParams;
  }

  getFetchOptions(): FetchOptions {
    return this._fetchOptions;
  }

  getRetry(): RetryOptions | undefined {
    return this._retry;
  }

  getFetch(): FetchFunction | undefined {
    return this._fetch;
  }

  getRequestInterceptors(): readonly RequestInterceptor[] {
    return this._requestInterceptors;
  }

}
