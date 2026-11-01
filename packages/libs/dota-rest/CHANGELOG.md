# @ayu-sh-kr/dota-rest

## 1.3.0

### Minor Changes

- a69adb0: Add opt-in HTTP errors and more flexible query parameters. Existing code keeps working: failing statuses still resolve unless you opt in.

  - `ClientBuilder.throwHttpErrors()` makes `toEntity()`, `toVoid()`, and `toResponse()` reject with an `HttpError` for non-2xx responses. Pass a function to decide per status, or `false` to turn it off. `HttpError` exposes `status`, `statusText`, `method`, `url`, the parsed body as `data`, and the `response`.
  - New `RestError` base class and the `isRestError()`, `isHttpError()`, `isTimeoutError()`, and `isAbortError()` guards.
  - `params()` now merges with parameters already set instead of discarding them, replacing only the keys it names, and also accepts a plain object.
  - `param()` and `params()` accept numbers, booleans, and arrays (one entry per item) and skip `null` and `undefined`.
  - Repeated `defaultHeaders()` calls now merge instead of replacing earlier headers.
  - `RestClientConfig` gains a correctly spelled `timeout` field; `timout` is deprecated but still set and still honoured.

### Patch Changes

- a69adb0: Fix request bodies, URL building, headers, and empty responses.

  - Falsy bodies (`0`, `false`, `""`, `null`) are now sent instead of being dropped.
  - `FormData`, `Blob`, `URLSearchParams`, strings, buffers, and streams are sent unchanged, so file uploads and form posts work. Only other values are JSON-encoded, and `Content-Type: application/json` is added only for those bodies.
  - Header names are merged case-insensitively and sent lower-cased, so a request `Content-Type` replaces the default instead of being combined with it. `post`, `put`, and `patch` no longer add a JSON `Content-Type` when there is no JSON body.
  - URLs join the base and path with exactly one slash, an absolute request URI ignores the base URL, a missing `uri()` resolves to the base URL instead of ending in `undefined`, and query parameters merge into an existing query string ahead of any fragment.
  - `toEntity()` resolves empty responses, such as `204 No Content` with a JSON content type, with `data` set to `undefined` instead of throwing.

- a69adb0: Fix timeouts, response parsing, and response handlers.

  - Timeouts now also cover the response body download, and reject with a `TimeoutError` instead of a generic `AbortError`, so they can be told apart from manual cancellation.
  - A timeout no longer aborts the caller's `AbortController`; a controller shared between requests is only aborted by the caller. Aborting it still cancels the request.
  - All JSON media types, such as `application/problem+json` and `application/vnd.api+json`, are parsed as JSON.
  - `converter()` now also receives text bodies, so non-JSON responses can be converted to the requested type.
  - `toEntity()` can be called more than once and returns the same entity.
  - A failed request whose result is never read no longer causes an unhandled promise rejection; reading the result still rejects with the error.
  - `ResponseHandler` may be async. The handler is awaited before the response resolves, and a rejected handler rejects the request.

## 1.2.0

### Minor Changes

- 009270c: Add configurable request interception and cancellation to `@ayu-sh-kr/dota-rest`, and make static-site generation opt-in for Dota SSR consumers.

  - Register client-wide synchronous or asynchronous request interceptors that run in order before `fetch`, can mutate or replace requests, and stop execution when they fail.
  - Supply a request-scoped `AbortController` through the fluent request builder; the same controller is available to interceptors and drives both manual and timeout cancellation.
  - Apply Dota SSR static-site generation only for builds started with the `--ssg` flag, with updated setup guidance for Dota Wrap consumers.

### Patch Changes

- 009270c: fix esm support

## 1.1.6

### Patch Changes

- c5fa794: fix esm support

## 1.1.5

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project

## 1.1.4

### Patch Changes

- 2e89848: Reconfigured the project structure and bring all the projects under the common umbrella.

  ### Patch Changes

  - Updated dependencies to the latest versions.
  - Fixed minor bugs in the routing module.
  - Improved performance of the core library.
  - Enhanced REST API handling.
  - Refactored codebase for better maintainability.

  ### Changes Dota Router

  - Fix the routing algorithm to capture the routes correctly when auto-configured using the `@Route` decorator.
  - Route tree building improved to handle nested routes more efficiently.

  ### Changes Dota Core

  - No significant changes, just dependency updates and minor bug fixes.

  ### Changes Dota Rest

  - No significant changes, just dependency updates and minor bug fixes.

  ### Changes Dota Wrap

  - Added new project to encapsulate common utilities and helpers for Dota-related projects.
  - Allows for building advance web applications with Dota ecosystem.
  - Packed with useful utilities to build web component, define routes, handle rest api calls, and manage state effectively.
  - Improved overall project structure for better scalability and maintainability.

  ### Overall Improvements

  - Reorganized the project structure to have a monorepo setup.
  - Improved build and deployment processes.
  - Enhanced documentation for better developer experience.

## 1.1.3

### Patch Changes

- 3802ca9: Fix URLSearchParam not available in browser issue

## 1.1.2

### Patch Changes

- a376385: removed editorconfig from build

## 1.1.1

### Patch Changes

- d31eedf: added backward compatibility for RestClient changes

## 1.1.0

### Minor Changes

- 615e964: Refactored whole project to handle issue with fluent api, enhance the developer experience with RestClient and ensure error less requests

## 1.0.10

### Patch Changes

- b89c031: change for interop

## 1.0.9

### Patch Changes

- 8d49948: Modify the build to support project using commonjs and es modules

## 1.0.8

### Patch Changes

- 56e9362: Add converter to map json data as the user wants, giving more control over the api response

## 1.0.7

### Patch Changes

- bf71574: Added response handler to manage the response for various status code

## 1.0.6

### Patch Changes

- e38a5ab: added test coverage and introduced minor feature for to add timeout to the `RestClient`

## 1.0.5

### Patch Changes

- aea93b9: fix toEntity method to handle the data type conversion inorder avoid failure when response is not of the type of json

## 1.0.4

### Patch Changes

- 975a95c: implemented ResponseVoid and enhanced the docs

## 1.0.3

### Patch Changes

- 8aa0e1f: Fix build issue where, codes where hidden upon import to other project

## 1.0.2

### Patch Changes

- 9f93d32: Fix build issue and structure the build files

## 1.0.1

### Patch Changes

- a27a406: Added docs for the project

## 1.0.0

### Major Changes

- fc0f1c0: Build the RestClient to reduce the burden on repeatetice writing fetch requests.
