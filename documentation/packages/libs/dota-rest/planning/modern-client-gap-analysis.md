# dota-rest: bugs and gaps against modern API clients

Audit of `packages/libs/dota-rest` (v1.2.0) against the behaviour developers expect from current
clients such as `ky`, `ofetch`, `axios`, and `wretch`. Line references are to `src/` at the time of
writing. Items are grouped as **bugs** (current behaviour is wrong), **standards gaps** (expected
of any modern client), and **packaging/API hygiene**. Each has a priority: P0 breaks real requests,
P1 is a significant gap, P2 is polish.

## 1. Bugs

> **Status:** B1–B15 and the opt-in part of 2.1 (`throwHttpErrors()`, `HttpError`, error guards)
> are fixed on `fix/dota-rest`. B10 keeps the request starting in `retrieve()`,
> so callers that never read the result still send it; the fix suppresses the unhandled rejection
> and caches `toEntity()` instead of deferring the request.

| # | Pri | Area | Problem | Fix |
| --- | --- | --- | --- | --- |
| B1 | P0 | `RequestRetriever.retrieve` | `if (builder.getBody())` is a truthiness check, so the bodies `0`, `false`, and `""` are silently dropped. | Check `!== undefined`. |
| B2 | P0 | `RequestRetriever.retrieve` | Every body goes through `JSON.stringify`. `FormData`, `Blob`, `URLSearchParams`, `ArrayBuffer`, and `ReadableStream` are turned into `{}`, and a string becomes `"\"text\""`. File uploads and form posts are impossible. | Pass `BodyInit` values through unchanged; only serialise plain objects and arrays, and set `Content-Type` only in that case. |
| B3 | P0 | `RestClient.post/put/patch` | Default header is spelled `Content-type`; a caller's `Content-Type` is a different object key, so both reach `fetch` and `Headers` joins them (`application/json, multipart/form-data`). | Build headers with a `Headers` instance (case-insensitive) and let caller values replace defaults. |
| B4 | P0 | `RestUtils.createURI` | Plain string concatenation: `baseUrl("https://api.x")` + `uri("users")` → `https://api.xusers`; a trailing plus leading slash → `//`. An absolute `uri` is still prefixed with the base. If `uri()` is never called the URL ends in `undefined`. A `uri` that already has `?a=1` gets a second `?`. | Resolve with `new URL(uri, base)` semantics, normalise slashes, merge existing query strings, and fail fast when no URI was set. |
| B5 | P0 | `ResponseResolver.toEntity` | A `204`/`205`, `HEAD`, or empty body with a JSON `Content-Type` makes `response.json()` throw `SyntaxError`. | Treat empty bodies as `undefined`/`null` before parsing. |
| B6 | P1 | `ResponseResolver` | JSON is detected only by `includes('application/json')`; `application/problem+json`, `application/vnd.api+json`, and other `+json` types are returned as text strings typed as `T`. | Match `/[/+]json\b/`. |
| B7 | P1 | `ResponseResolver.toEntity` | Non-JSON responses are cast `as unknown as T`, so the type lies, and the `converter` is never called for them. | Expose explicit `.json()`, `.text()`, `.blob()`, `.arrayBuffer()` readers; run the converter on whatever is parsed. |
| B8 | P1 | `RestUtils.performFetch` | The timeout timer is cleared when `fetch` resolves (headers received), so slow body downloads are never timed out. | Keep the timeout active until the body is consumed, or use `AbortSignal.timeout` combined with the caller's signal. |
| B9 | P1 | `RestUtils.performFetch` | Timeout calls `abort()` on the request's controller. When the caller passed a shared controller via `abortController()`, one request's timeout cancels every request using it. The rejection is a generic `AbortError`, indistinguishable from a user cancel. | Combine signals with `AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])` and throw a dedicated `TimeoutError`. |
| B10 | P1 | `RestRequestRetriever.retrieve` | The request starts eagerly in `retrieve()`. If the caller never calls `toEntity/toVoid/toResponse`, a network failure becomes an unhandled promise rejection. Calling two terminal methods fails with "body already used". | Start lazily on the first terminal call and cache the parsed result. |
| B11 | P1 | `ResponseHandler` | Typed `(response) => void` and called synchronously; an async handler is not awaited, so its rejection is unhandled and it cannot block parsing. | Type as `void \| Promise<void>` and `await` it. |
| B12 | P2 | `RequestBuilder.params` | `params()` replaces all previously added params, whereas `headers()` merges. Values are restricted to `string` (no numbers, booleans, or arrays). | Merge, and accept `Record<string, string \| number \| boolean \| Array<…> \| undefined>`, skipping `undefined`. |
| B13 | P2 | `ClientBuilder.defaultHeaders` | Replaces rather than merges, so calling it twice loses headers. | Merge. |
| B14 | P2 | `RestClientConfig` | Public type field is misspelled `timout`. | Rename to `timeout` (keep a deprecated alias for one minor). |
| B15 | P2 | `RestClient.builder` | `_headers!` and `_handler!` use definite-assignment assertions on values that are genuinely undefined. | Make them optional. |

## 2. Missing modern-client standards

### 2.1 Errors (P0)
- **No HTTP error semantics.** `4xx`/`5xx` resolve successfully; the only hook is the void `handler`.
  Modern clients reject with a typed `HTTPError` carrying `status`, `request`, `response`, and the
  parsed body, with an opt-out (`throwHttpErrors: false`) or a `validateStatus` predicate.
- **No error taxonomy.** Network failures surface as raw `TypeError`, timeouts as `AbortError`.
  Expected: `HttpError`, `TimeoutError`, `NetworkError`, `ParseError`, all extending a base class
  with `isRestError()` guard.

### 2.2 Interceptors / hooks (P1)
- Only request interceptors exist. Missing: **response interceptors** (token refresh on `401`,
  unwrapping envelopes), **error interceptors**, and `beforeRetry` hooks.
- Interceptors cannot be added or removed after `build()`, and there is no per-request override.

### 2.3 Resilience (P1)
- **Retries** with exponential backoff and jitter, configurable methods (idempotent only by
  default), status codes (`408, 429, 5xx`), and `Retry-After` support.
- **Request de-duplication** for concurrent identical `GET`s.
- Optional **response caching** / ETag `If-None-Match` support.

### 2.4 Request API (P1)
- `HttpMethod` lacks `HEAD` and `OPTIONS`; no generic `request(method, url)` entry point.
- No **path parameters** (`/users/{id}` with encoding).
- No passthrough for standard `RequestInit` options: `credentials`, `mode`, `cache`, `redirect`,
  `keepalive`, `referrerPolicy`, `integrity`, `priority`. Cookie-based auth (`credentials: 'include'`)
  is therefore impossible.
- No shorthand body helpers (`.json(obj)`, `.form(formData)`, `.text(str)`).
- No `Accept` header defaulting.

### 2.5 Response API (P1)
- No body readers beyond JSON/text (`blob`, `arrayBuffer`, `formData`, stream).
- No **runtime validation** hook: `ResponseConverter` receives `any`. Standard Schema / Zod / Valibot
  integration would give validated, correctly typed data.
- No upload/download **progress** callbacks.
- No **streaming** helpers (NDJSON, Server-Sent Events) — increasingly expected for LLM-style APIs.

### 2.6 Environment and testing (P1)
- No injectable **`fetch` implementation**. SSR (`dota-ssr`), Node without global fetch, custom
  agents, and tests all need `fetch` passed into the client rather than mocked globally.
- Client config is immutable and private: no `client.extend({...})` to derive a client with extra
  headers/hooks (common for authenticated sub-clients).

### 2.7 Typing (P2)
- `body(item: any)` and untyped request bodies; no request/response generic pair.
- No typed endpoint definitions or OpenAPI-generated client integration.

## 3. Packaging and API hygiene (P2)
- `index.ts` exports internals (`RestUtils`, `RestRequestRetriever`, `RequestInterceptorProcessor`,
  builder getters), freezing implementation details into the public API.
- `package.json` `repository.url` points to a standalone `dota-rest` repo, not this monorepo;
  no `"sideEffects": false` for tree shaking.
- README examples should be re-checked once error semantics change, since callers currently
  inspect `status` manually.

## 4. Suggested order of work
1. **Correctness release (patch):** B1–B5, B6, B12–B15.
2. **Errors and lifecycle (minor, behaviour change behind an option):** 2.1, B8–B11.
3. **Extensibility (minor):** injectable `fetch`, `RequestInit` passthrough, response/error hooks,
   `extend()`, `HEAD`/`OPTIONS`, path params.
4. **Resilience and data (minor):** retries, schema validation, extra body readers, progress, streaming.
5. **Next major:** throw on HTTP errors by default, trim public exports, rename `timout`.

Each published change needs a changeset under `.changeset/` and tests in `test/`.
