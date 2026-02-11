import {RestRequestRetriever} from "@dota/RequestRetriever.ts";
import {Header, HttpMethod, RequestSetup, ResponseHandler} from "@dota/Types.ts";
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
   * @param params - An instance of `URLSearchParams` containing the query parameters.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  params(params: URLSearchParams): RequestBuilder<T>;

  /**
   * Sets a single query parameter for the HTTP request.
   *
   * @param key - The name of the query parameter.
   * @param value - The value of the query parameter.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  param(key: string, value: string): RequestBuilder<T>;

  /**
   * Sets the body of the HTTP request.
   *
   * @param item - The body content to be sent with the request.
   * @returns The current instance of `RequestBuilder` for method chaining.
   */
  body(item: any): RequestBuilder<T>;

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
  private readonly _handler: ResponseHandler | undefined;

  constructor(requestSetup: RequestSetup) {
    this._baseUri = requestSetup.baseUri || '';
    this.method = requestSetup.method;
    this._defaultHeaders = requestSetup.headers || {};
    this._timeout = requestSetup.timeout;
    this._headers = {}
    this._params = new URLSearchParams();
    this._handler = requestSetup.handler;
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
    this._headers[key] = value;
    return this;
  }

  headers(header: Header): RequestBuilder<T> {
    this._headers = {...this._headers, ...header};
    return this;
  }

  param(key: string, value: string): RequestBuilder<T> {
    this._params.append(key, value);
    return this;
  }

  params(params: URLSearchParams): RequestBuilder<T> {
    this._params = new URLSearchParams(params.toString());
    return this;
  }

  timeout(timeout: number): RequestBuilder<T> {
    this._timeout = timeout;
    return this;
  }

  body(item: any): RequestBuilder<T> {
    this._body = item;
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

  getHeaders(): Header {
    return this._headers;
  }

  getParams(): URLSearchParams {
    return this._params;
  }

  getBody(): any {
    return this._body;
  }

}