import {Entity, ResponseConverter, ResponseEntity, ResponseHandler, ResponseVoid, VoidEntity} from "@dota/Types.ts";


/**
 * The `ResponseResolver` interface defines a contract for handling and processing HTTP responses.
 *
 * It provides methods to convert the response into various formats, such as an entity, a raw response,
 * or a void response. Additionally, it allows the use of a custom response converter to transform
 * the response data into a desired format.
 */
export interface ResponseResolver<T> {
  /**
   * Sets a custom converter to transform the response data.
   *
   * The converter is a function that takes the raw response data and transforms it into a specific type.
   *
   * @typeParam T - The type of the transformed response data.
   * @param converter - A function that converts the raw response data into the desired type.
   * @returns The current instance of `ResponseResolver` for method chaining.
   */
  converter(converter: ResponseConverter<T>): ResponseResolver<T>;

  /**
   * Sets a custom handler to process the HTTP response.
   *
   * The handler is a function that takes the raw response and performs custom processing.
   *
   * @param handler - A function that processes the HTTP response.
   * @returns The current instance of `ResponseResolver` for method chaining.
   */
  handler(handler: ResponseHandler): ResponseResolver<T>;


  /**
   * Converts the HTTP response into an `Entity` object containing the response data.
   *
   * This method processes the response and extracts the data, applying the custom converter if one is set.
   *
   * @typeParam T - The type of the response data.
   * @returns A `Promise` that resolves to an `Entity` object containing the response data.
   */
  toEntity(): Promise<Entity<T>>;

  /**
   * Processes the HTTP response without returning any data.
   *
   * This method is useful for requests where no response body is expected, such as DELETE requests.
   *
   * @returns A `Promise` that resolves to a `Void` object, indicating the response has been processed.
   */
  toVoid(): Promise<VoidEntity>;

  /**
   * Retrieves the raw HTTP response object.
   *
   * This method provides access to the full `Response` object, allowing for custom handling of the response.
   *
   * @returns A `Promise` that resolves to the raw `Response` object.
   */
  toResponse(): Promise<Response>;
}

/**
 * The `RestResponseResolver` class implements the `ResponseResolver` interface and is responsible for
 * handling and processing HTTP responses.
 *
 * This class provides methods to convert the response into various formats, such as an entity, a raw response,
 * or a void response. It also allows the use of a custom response converter to transform the response data.
 */
export class RestResponseResolver<T extends any> implements ResponseResolver<T> {

  private _converter: ResponseConverter<T> | undefined;

  constructor(
    private _response: Promise<Response>,
    private _handler: ResponseHandler | undefined
  ) {
  }

  converter(converter: ResponseConverter<T>): ResponseResolver<T> {
    this._converter = converter;
    return this;
  }

  handler(handler: ResponseHandler): ResponseResolver<T> {
    this._handler = handler;
    return this;
  }

  async toEntity(): Promise<ResponseEntity<T>> {
    const response = await this._response;
    if (this._handler) {
      this._handler(response)
    }
    const entity = ResponseEntity.create<T>(response);

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      if (this._converter) {
        entity.data = this._converter(json)
      } else {
        entity.data = json;
      }
    } else {
      entity.data = await response.text() as unknown as T;
    }
    return entity;
  }

  async toResponse(): Promise<Response> {
    const response = await this._response;
    if (this._handler) {
      this._handler(response)
    }
    return response;
  }

  async toVoid(): Promise<ResponseVoid> {
    const response = await this._response;
    if (this._handler) {
      this._handler(response)
    }
    return ResponseVoid.create(response);
  }

}