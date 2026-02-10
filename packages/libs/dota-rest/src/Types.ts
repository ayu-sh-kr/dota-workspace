

/**
 * The `Header` type represents a collection of HTTP headers as key-value pairs.
 *
 * HTTP headers are used to pass additional information with an HTTP request or response.
 * Each header is represented as a key (header name) and a value (header value).
 *
 * This type is commonly used to define the headers for an HTTP request or to process
 * the headers received in an HTTP response.
 *
 * Example usage:
 * ```typescript
 * const headers: Header = {
 *   'Content-Type': 'application/json',
 *   'Authorization': 'Bearer token',
 * };
 * ```
 *
 * Key Characteristics:
 * - The keys are strings representing the header names (case-insensitive).
 * - The values are strings representing the corresponding header values.
 *
 * Use Cases:
 * - Setting custom headers for HTTP requests.
 * - Reading and processing headers from HTTP responses.
 */
export type Header = { [key: string]: string };


/**
 * The `HttpMethod` type represents the standard HTTP methods used in web requests.
 *
 * These methods define the desired action to be performed on the specified resource.
 * Each method has a specific purpose and is commonly used in RESTful APIs.
 *
 * - **GET**: Used to retrieve data from a server. It does not modify the resource.
 * - **POST**: Used to send data to a server to create a new resource.
 * - **PUT**: Used to update or replace an existing resource on the server.
 * - **PATCH**: Used to partially update an existing resource on the server.
 * - **DELETE**: Used to delete a resource from the server.
 *
 * This type ensures that only valid HTTP methods are used in the application.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';




/**
 * The `RequestSetup` interface defines the configuration required to initialize an HTTP request.
 *
 * This interface allows developers to specify the HTTP method, optional base URI, headers,
 * timeout duration, and an optional response handler. It serves as the foundation for building
 * HTTP requests in a structured and reusable manner.
 *
 * Properties:
 * - **method**: Specifies the HTTP method (e.g., GET, POST, PUT, DELETE) to be used for the request.
 * - **baseUri**: (Optional) The base URI for the request. This can be combined with a specific URI
 *   to form the full request URL.
 * - **headers**: (Optional) A collection of HTTP headers as key-value pairs to include in the request.
 * - **timeout**: The timeout duration (in milliseconds) for the request. If the request exceeds this
 *   duration, it will be aborted.
 * - **handler**: (Optional) A callback function to handle the response after the request is completed.
 *
 * Example usage:
 * ```typescript
 * const setup: RequestSetup = {
 *   method: 'GET',
 *   baseUri: 'https://api.example.com',
 *   headers: {
 *     'Authorization': 'Bearer token',
 *   },
 *   timeout: 3000,
 *   handler: (response) => {
 *     console.log('Response:', response);
 *   },
 * };
 * ```
 *
 * Use Cases:
 * - Defining the basic configuration for HTTP requests.
 * - Providing default values for constructing requests in a fluent API.
 */
export interface RequestSetup {
  method: HttpMethod
  baseUri?: string,
  headers?: Header,
  timeout: number,
  handler?: ResponseHandler
}

/**
 * The `Response` interface represents the structure of an HTTP response.
 *
 * This interface includes properties such as status, headers, type, statusText,
 * and isRedirected, which provide information about the response received from the server.
 *
 * @typeParam T - The type of the response data.
 */
export interface ResponseBase {
  status: number;
  headers: Headers;
  type: ResponseType;
  statusText: string;
  isRedirected: boolean
}


/**
 * The `Entity` interface represents an HTTP response that contains a body.
 *
 * This interface extends the `Response` interface and includes a `data` property
 * that holds the response body data.
 *
 * @typeParam T - The type of the response body data.
 */
export interface Entity<T> extends ResponseBase {
  data: T;
}


/**
 * The `Void` interface represents an HTTP response that does not contain a body.
 *
 * This interface extends the `Response` interface and is used for responses
 * where no body content is expected, such as DELETE requests.
 */
export interface VoidEntity extends ResponseBase {

}



/**
 * The `ResponseHandler` type defines a callback function for processing an HTTP response.
 *
 * This function is invoked after an HTTP request is completed and provides access to the
 * raw `Response` object. It allows developers to handle the response in a custom manner,
 * such as logging, error handling, or additional processing of the response data.
 *
 * Example usage:
 * ```typescript
 * const handler: ResponseHandler = (response) => {
 *   if (response.status === 200) {
 *     console.log('Request succeeded:', response);
 *   } else {
 *     console.error('Request failed with status:', response.status);
 *   }
 * };
 * ```
 *
 * Key Characteristics:
 * - The function takes a single parameter, `response`, which is an instance of the `Response` object.
 * - The function does not return any value (`void`), as it is intended for side effects.
 *
 * Use Cases:
 * - Logging HTTP response details for debugging or monitoring.
 * - Implementing custom error handling logic based on the response status.
 * - Triggering additional actions after receiving an HTTP response.
 *
 * @param response - The raw `Response` object received from the HTTP request.
 */
export type ResponseHandler = (response: Response) => void;


/**
 * The `ResponseConverter` type defines a function responsible for transforming raw response data
 * into a specific type. This is particularly useful when processing HTTP responses to convert
 * the raw data into a structured format that aligns with the application's requirements.
 *
 * This type is generic, allowing developers to specify the desired output type of the conversion.
 *
 * Example usage:
 * ```typescript
 * const jsonConverter: ResponseConverter<MyDataType> = (data) => JSON.parse(data);
 * const xmlConverter: ResponseConverter<Document> = (data) => new DOMParser().parseFromString(data, "application/xml");
 * ```
 *
 * Key Characteristics:
 * - The function takes a single parameter, `data`, which represents the raw response data.
 * - The function returns the transformed data of the specified type `T`.
 *
 * Use Cases:
 * - Parsing JSON responses into strongly-typed objects.
 * - Converting XML responses into `Document` objects.
 * - Applying custom transformations to raw response data.
 *
 * @typeParam T - The type of the transformed response data.
 * @param data - The raw response data to be converted.
 * @returns The transformed response data of type `T`.
 */
export type ResponseConverter<T> = (data: any) => T

/**
 * The `ResponseEntity` class represents the response from an HTTP request.
 *
 * This class encapsulates the response data, status, headers, and type.
 * It provides a structured way to handle and access the response information.
 *
 * @typeParam T - The type of the response data.
 */
export class ResponseEntity<T> implements Entity<T> {

  public data!: T;

  private constructor(
    public readonly status: number,
    public readonly headers: Headers,
    public readonly type: ResponseType,
    public readonly statusText: string,
    public readonly isRedirected: boolean,
  ) {
  }

  static create<T>(response: Response) {
    return new ResponseEntity<T>(
      response.status, response.headers, response.type, response.statusText, response.redirected,
    );
  }
}


/**
 * The `ResponseVoid` class represents an HTTP response with no body content.
 *
 * This class encapsulates the response status, headers, and type.
 * It provides a structured way to handle and access the response information when no body content is expected.
 */
export class ResponseVoid implements VoidEntity {


  private constructor(
    public readonly status: number,
    public readonly headers: Headers,
    public readonly type: ResponseType,
    public readonly statusText: string,
    public readonly isRedirected: boolean,
  ) {
  }

  static create(response: Response) {
    return new ResponseVoid(
      response.status, response.headers, response.type, response.statusText, response.redirected,
    );
  }
}