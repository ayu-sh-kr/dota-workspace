---
"@ayu-sh-kr/dota-rest": patch
---

Fix timeouts, response parsing, and response handlers.

- Timeouts now also cover the response body download, and reject with a `TimeoutError` instead of a generic `AbortError`, so they can be told apart from manual cancellation.
- A timeout no longer aborts the caller's `AbortController`; a controller shared between requests is only aborted by the caller. Aborting it still cancels the request.
- All JSON media types, such as `application/problem+json` and `application/vnd.api+json`, are parsed as JSON.
- `converter()` now also receives text bodies, so non-JSON responses can be converted to the requested type.
- `toEntity()` can be called more than once and returns the same entity.
- A failed request whose result is never read no longer causes an unhandled promise rejection; reading the result still rejects with the error.
- `ResponseHandler` may be async. The handler is awaited before the response resolves, and a rejected handler rejects the request.
