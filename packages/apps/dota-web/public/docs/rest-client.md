# Project Documentation - dota-rest

## Overview

This project provides a `RestClient` class for creating and configuring HTTP clients to make RESTful API requests. It includes methods for various HTTP methods such as GET, POST, PUT, PATCH, and DELETE.

## Installation

To install the project dependencies, run:

```bash
npm install @ayu-sh-kr/dota-rest
```

## Usage

### Initializing the RestClient

To create and configure an instance of `RestClient`, use the `RestClientBuilder`:

```typescript
import {RestClient} from "@ayu-sh-kr/dota-rest";

const client = RestClient.builder()
    .baseUrl('https://api.example.com')
    .defaultHeaders({'Authorization': 'Bearer token'})
    .build();
```

> After version >= 1.1.0 use the `RestClient.builder()` to create the instance of `RestClient` instead of using the create method.

### Performing Requests

#### GET Request

To perform a GET request:

```typescript
const response = await client.get<User>()
    .uri('/users/1')
    .retrieve()
    .toEntity();

console.log(response.data);
```

#### POST Request

To perform a POST request:

```typescript
const response = await client.post<User>()
    .uri('/users')
    .body({ name: 'John Doe', email: 'john.doe@example.com' })
    .retrieve()
    .toEntity();

console.log(response.data);
```

#### PUT Request

To perform a PUT request:

```typescript
const response = await client.put<User>()
    .uri('/users/1')
    .body({ name: 'John Doe', email: 'john.doe@example.com' })
    .retrieve()
    .toEntity();

console.log(response.data);
```

#### PATCH Request

To perform a PATCH request:

```typescript
const response = await client.patch<User>()
    .uri('/users/1')
    .body({ email: 'john.newemail@example.com' })
    .retrieve()
    .toEntity();

console.log(response.data);
```

#### DELETE Request

To perform a DELETE request:

```typescript
const response = await client.delete<void>()
    .uri('/users/1')
    .retrieve()
    .toVoid();

console.log('User deleted');
```

#### Resolving request to response
To get the `Response` object of the fetch request and taking action as per your requirement.

```typescript
const response = await client.get<User>()
    .uri('/users/1')
    .retrieve()
    .toResponse()

console.log(response.status)
const data = await response.json();
console.log(data)
```

#### Creating `RestClient` with timeout
By default the client has a timeout of 10s but it can be changed during the build of `RestClient` or
during making the request.

Adding timeout during client buildup.
```typescript
import {RestClient} from "@ayu-sh-kr/dota-rest";

const restClient = RestClient.builder()
    .baseUrl('http://localhost:8080')
    .defaultHeaders({'Authorization': 'Bearer kh.....'})
    .timeout(5000)
    .build();
```

Adding timeout for a single request.
```typescript
const response = await client.get<User>()
    .uri('/users/1')
    .timeout(5000)
    .retrieve()
    .toResponse()
```

When the timeout elapses, the request rejects with a `DOMException` named `TimeoutError`; use `isTimeoutError()` to
tell it apart from a manual cancellation.

#### Request Interceptors

Register request interceptors while building a client to inspect or modify every request before it is sent. Interceptors
run in registration order and may mutate the supplied request, return a replacement request, or resolve either behavior
asynchronously.

```typescript
const client = RestClient.builder()
    .baseUrl('https://api.example.com')
    .requestInterceptor(async (request) => {
        const token = await getAccessToken();

        return {
            ...request,
            headers: {
                ...request.headers,
                Authorization: `Bearer ${token}`
            }
        };
    })
    .requestInterceptor((request) => {
        request.headers = {
            ...request.headers,
            'X-Trace-Id': crypto.randomUUID()
        };
    })
    .build();
```

If an interceptor throws or returns a rejected promise, the request rejects through the response resolver and `fetch`
is not called.

Each request builder creates its own `AbortController` by default. Supply a caller-owned controller with
`abortController()` when the application needs to cancel the request. Interceptors receive that same controller, and
aborting it cancels the request. A timeout cancels only its own request and never aborts your controller, so one
controller can be shared between requests.

```typescript
const client = RestClient.builder()
    .requestInterceptor((request) => {
        console.debug('Request uses signal', request.abortController.signal);
    })
    .build();

const abortController = new AbortController();
const response = client.get()
    .uri('/reports')
    .abortController(abortController)
    .retrieve()
    .toResponse();

abortController.abort();
await response;
```

#### Response Handler
`RestClient` provide ability to set response handler which can be used to process response before resolving to
`toEntity`, `toVoid` or `toResponse`. Response handler is function with one parameter `response` object should be
used to check the response for required `status` and prepare the error if the result is not favourable.

A handler may be `async`; it is awaited before the response resolves, and if it throws or rejects, the request
rejects with that error. To reject non-2xx responses without writing a handler, use `throwHttpErrors()` (see
[Handling HTTP errors](#handling-http-errors)).

##### Request processing without response handling
Here is an example of how to perform request without using a response handler:
```typescript
import { RestClient } from "@ayu-sh-kr/dota-rest";

// Create a RestClient instance without a response handler
const client = RestClient.builder()
    .baseUrl('https://api.example.com')
    .defaultHeaders({ 'Authorization': 'Bearer token' })
    .build();

// Perform a GET request without the response handler
const response = await client.get<User>()
    .uri('/users/1')
    .retrieve()
    .toEntity();

if (response.status !== 200) {
    throw new Error(`Request failed with status code ${response.status}`);
}

console.log(response.data);
```

##### Request processing with a response handler
Here is an example of how to use a response handler to process the response:
```typescript
import { RestClient } from "@ayu-sh-kr/dota-rest";

// Define the response handler
const responseHandler = (response: Response) => {
    if (response.status !== 200) {
        throw new Error(`Request failed with status code ${response.status}`);
    }
};

// Create a RestClient instance with the response handler
const client = RestClient.builder()
    .baseUrl('https://api.example.com')
    .defaultHeaders({ 'Authorization': 'Bearer token' })
    .handler(responseHandler)
    .build();

// Perform a GET request with the response handler
const response = await client.get<User>()
    .uri('/users/1')
    .retrieve()
    .toEntity();

console.log(response.data);
```

Using a response handler simplifies the error handling logic by centralizing the response processing in a single function, reducing duplicate code and making the request handling more consistent.

#### ResponseConverter
Use a converter to map the response data to the required object. The converter is set on the resolver returned by
`retrieve()`. It receives the parsed JSON for JSON responses (including `+json` types) and the text for any other
content type, and returns the data in the required format.

Here is an example of using a converter with the `RestClient` for a GET request, along with a dummy type:

First, define the dummy type:

```typescript
interface User {
    id: number;
    name: string;
    email: string;
}
```

Next, create a converter function that processes the JSON data and maps it to the `User` type:

```typescript
const userConverter = (data: any): User => {
    return {
        id: data.id,
        name: data.name,
        email: data.email
    };
};
```

Now, use the `RestClient` to perform a GET request with the converter:

```typescript
import { RestClient } from "@ayu-sh-kr/dota-rest";

// Create a RestClient instance
const client = RestClient.builder()
    .baseUrl('https://api.example.com')
    .defaultHeaders({ 'Authorization': 'Bearer token' })
    .build();

// Perform a GET request with the converter
const response = await client.get<User>()
    .uri('/users/1')
    .retrieve()
    .converter(userConverter)
    .toEntity();

console.log(response.data);
```

In this example, the `userConverter` function is used to transform the response data into the `User` type. The `RestClient` instance is configured to use this converter when performing the GET request.

The example taken is in its simplest form, we can do more than just mapping the field to it's type. Instead we may
required to return an object with additional fields or perform some operation on the data before returning it.

Here is an example of a converter function that maps the response data to a `User` class and checks for data types, converting them as necessary:

First, define the `User` class:

```typescript
class User {
    id: number;
    name: string;
    email: string;

    constructor(id: number, name: string, email: string) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
}
```

Next, create the converter function:

```typescript
const userConverter = (data: any): User => {
    const id = typeof data.id === 'number' ? data.id : parseInt(data.id, 10);
    const name = typeof data.name === 'string' ? data.name : String(data.name);
    const email = typeof data.email === 'string' ? data.email : String(data.email);

    return new User(id, name, email);
};
```

This converter function ensures that the `id` is a number, and `name` and `email` are strings before creating a new `User` instance.

## Query parameters

`param()` appends a value; `params()` merges an object or `URLSearchParams`, replacing only the keys
it names. Numbers and booleans are stringified, arrays repeat the key, and `null`/`undefined` are skipped.

```typescript
await client.get<User[]>()
    .uri('/users')
    .param('tag', ['admin', 'staff'])
    .params({page: 2, active: true, search: undefined})
    .retrieve()
    .toEntity(); // GET /users?tag=admin&tag=staff&page=2&active=true
```

## Handling HTTP errors

By default every response resolves, including 4xx and 5xx, so check `status` yourself. Call
`throwHttpErrors()` to reject failing statuses with an `HttpError` that carries the parsed body.

```typescript
import {HttpError, isHttpError, isTimeoutError, RestClient} from "@ayu-sh-kr/dota-rest";

const client = RestClient.builder()
    .baseUrl('http://localhost:8080')
    .throwHttpErrors()                 // 2xx is success
    // .throwHttpErrors(s => s < 500)  // or decide per status
    .build();

try {
    await client.get<User>().uri('/users/1').retrieve().toEntity();
} catch (error) {
    if (isHttpError<{ title: string }>(error)) {
        console.log(error.status, error.data?.title);
    } else if (isTimeoutError(error)) {
        console.log('timed out');
    }
}
```

`isAbortError()` identifies requests cancelled through their `AbortController`, and `isRestError()`
matches any error created by the client.

## Conclusion

This documentation covers the basic usage of the `RestClient` class for making HTTP requests.
For more advanced usage and customization, refer to the class and method documentation in the source code.
