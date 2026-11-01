import {Entity, ResponseConverter, ResponseEntity, ResponseHandler, ResponseVoid, VoidEntity} from "@dota/Types.ts";

const JSON_MEDIA_TYPE = /^[^;]*[/+]json\s*(;|$)/i;

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
   * JSON media types (`application/json` and `+json` types) are parsed; other bodies are read as
   * text. The converter, when set, receives either value. An empty body, such as a `204 No Content`,
   * resolves with `data` set to `undefined`. Repeated calls return the same entity.
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
   * The body is unread unless `toEntity` was called first, which consumes it.
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
  private _entity: Promise<ResponseEntity<T>> | undefined;

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

  /**
   * Reads and converts the body once; later calls return the same entity instead of failing
   * because the body stream was already consumed.
   *
   * @returns The cached entity promise.
   */
  toEntity(): Promise<ResponseEntity<T>> {
    this._entity ??= this.readEntity();
    return this._entity;
  }

  async toResponse(): Promise<Response> {
    return this.handledResponse();
  }

  async toVoid(): Promise<ResponseVoid> {
    return ResponseVoid.create(await this.handledResponse());
  }

  /**
   * Waits for the response and runs the handler, awaiting it so async checks finish first.
   *
   * @returns The response after the handler has completed.
   */
  private async handledResponse(): Promise<Response> {
    const response = await this._response;
    await this._handler?.(response);
    return response;
  }

  /**
   * Parses the body by content type: any JSON media type (`application/json`, `+json`) is parsed,
   * other bodies stay text. The converter receives whichever value was read; empty bodies skip
   * it and resolve with `undefined`.
   *
   * @returns The entity holding the response metadata and data.
   */
  private async readEntity(): Promise<ResponseEntity<T>> {
    const response = await this.handledResponse();
    const entity = ResponseEntity.create<T>(response);
    const text = await response.text();

    if (!text) {
      entity.data = undefined as T;
      return entity;
    }

    const data = RestResponseResolver.isJson(response) ? JSON.parse(text) : text;
    entity.data = this._converter ? this._converter(data) : data as T;
    return entity;
  }

  /**
   * Recognises `application/json` and structured-syntax JSON types such as
   * `application/problem+json` or `application/vnd.api+json`.
   *
   * @param response - The response whose `Content-Type` is checked.
   * @returns `true` when the body should be parsed as JSON.
   */
  private static isJson(response: Response): boolean {
    return JSON_MEDIA_TYPE.test(response.headers.get('Content-Type') ?? '');
  }

}