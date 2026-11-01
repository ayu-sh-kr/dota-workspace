---
"@ayu-sh-kr/dota-rest": minor
---

Add opt-in HTTP errors and more flexible query parameters. Existing code keeps working: failing statuses still resolve unless you opt in.

- `ClientBuilder.throwHttpErrors()` makes `toEntity()`, `toVoid()`, and `toResponse()` reject with an `HttpError` for non-2xx responses. Pass a function to decide per status, or `false` to turn it off. `HttpError` exposes `status`, `statusText`, `method`, `url`, the parsed body as `data`, and the `response`.
- New `RestError` base class and the `isRestError()`, `isHttpError()`, `isTimeoutError()`, and `isAbortError()` guards.
- `params()` now merges with parameters already set instead of discarding them, replacing only the keys it names, and also accepts a plain object.
- `param()` and `params()` accept numbers, booleans, and arrays (one entry per item) and skip `null` and `undefined`.
- Repeated `defaultHeaders()` calls now merge instead of replacing earlier headers.
- `RestClientConfig` gains a correctly spelled `timeout` field; `timout` is deprecated but still set and still honoured.
