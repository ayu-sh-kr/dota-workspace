---
"@ayu-sh-kr/dota-rest": minor
---

Add retries, a custom `fetch`, `RequestInit` options, `extend()`, path parameters, and `HEAD`/`OPTIONS` requests. Existing behaviour is unchanged: retries are off unless configured.

- `retry()` on the client builder and on a request takes a limit, `RetryOptions`, or `false`. Network errors and `408`, `413`, `429`, `500`, `502`, `503`, `504` are retried for idempotent methods with exponential backoff, `Retry-After` support, a `maxDelay` cap, and a `beforeRetry` hook. Timeouts, aborts, and streamed bodies are never retried.
- `ClientBuilder.fetch()` injects a `fetch` implementation for SSR, custom agents, or tests.
- `fetchOptions()` on the client builder and on a request passes `credentials`, `mode`, `cache`, `redirect`, `keepalive`, `integrity`, `referrer`, and `referrerPolicy` to `fetch`.
- `client.extend()` returns a builder seeded with the client's configuration for derived clients.
- `removeHeader()` drops a header, including a client default, for one request.
- `pathParam()` and `pathParams()` fill URL-encoded `{name}` placeholders in the URI.
- `HttpMethod` gains `HEAD` and `OPTIONS`; the client gains `head()`, `options()`, and a generic `request(method)`.
