import {RequestBuilder, RestRequestBuilder} from "@dota/RequestBuilder.ts";
import {Header, ResponseHandler} from "@dota/Types.ts";


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
   * Use this to set a timeout period after which the `fetch` call will be aborted.
   *
   * @param timeout - Time in milliseconds after which the fetch will be aborted
   * @returns The current instance of the `RestClientBuilder` for method chaining.
   */
  timeout(timeout: number): ClientBuilder;


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
  timout: number;

  /**
   * A handler function responsible for handling responses with undesirable status codes.
   * This function should throw an error or return void after execution.
   *
   * @param response - The response returned by the fetch API after the API call.
   */
  handler?: ResponseHandler
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
export class RestClient {

  private config!: RestClientConfig;

  private constructor(config: RestClientConfig) {
    this.config = config;
  }

  /**
   * Creates a new instance of the `RestClientBuilder`. This method there to
   * provide backward compatibility with the old code.
   */
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
      _headers!: Header;
      _timout: number = 10000;
      _handler!: ResponseHandler;

      public baseUrl(url: string) {
        this._baseurl = url;
        return this;
      }

      public defaultHeaders(headers: Header) {
        this._headers = headers;
        return this;
      }


      public timeout(timeout: number) {
        this._timout = timeout;
        return this;
      }

      public handler(handler: ResponseHandler) {
        this._handler = handler;
        return this;
      }

      public build() {
        return new RestClient({
          baseUrl: this._baseurl,
          headers: this._headers,
          timout: this._timout,
          handler: this._handler
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
      headers: {'Content-type': 'application/json', ...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.config.timout,
      handler: this.config.handler
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
      timeout: this.config.timout,
      handler: this.config.handler
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
      headers: {'Content-type': 'application/json', ...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.config.timout,
      handler: this.config.handler
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
      headers: {'Content-type': 'application/json', ...this.config.headers},
      baseUri: this.config.baseUrl,
      timeout: this.config.timout,
      handler: this.config.handler
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
      timeout: this.config.timout,
      handler: this.config.handler
    })
  }
}