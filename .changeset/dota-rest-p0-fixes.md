---
"@ayu-sh-kr/dota-rest": patch
---

Fix request bodies, URL building, headers, and empty responses.

- Falsy bodies (`0`, `false`, `""`, `null`) are now sent instead of being dropped.
- `FormData`, `Blob`, `URLSearchParams`, strings, buffers, and streams are sent unchanged, so file uploads and form posts work. Only other values are JSON-encoded, and `Content-Type: application/json` is added only for those bodies.
- Header names are merged case-insensitively and sent lower-cased, so a request `Content-Type` replaces the default instead of being combined with it. `post`, `put`, and `patch` no longer add a JSON `Content-Type` when there is no JSON body.
- URLs join the base and path with exactly one slash, an absolute request URI ignores the base URL, a missing `uri()` resolves to the base URL instead of ending in `undefined`, and query parameters merge into an existing query string ahead of any fragment.
- `toEntity()` resolves empty responses, such as `204 No Content` with a JSON content type, with `data` set to `undefined` instead of throwing.
