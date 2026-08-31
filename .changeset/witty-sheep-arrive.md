---
"@ayu-sh-kr/dota-rest": minor
"@ayu-sh-kr/dota-wrap": patch
"@ayu-sh-kr/dota-ssr": patch
---

Add configurable request interception and cancellation to `@ayu-sh-kr/dota-rest`, and make static-site generation opt-in for Dota SSR consumers.

- Register client-wide synchronous or asynchronous request interceptors that run in order before `fetch`, can mutate or replace requests, and stop execution when they fail.
- Supply a request-scoped `AbortController` through the fluent request builder; the same controller is available to interceptors and drives both manual and timeout cancellation.
- Apply Dota SSR static-site generation only for builds started with the `--ssg` flag, with updated setup guidance for Dota Wrap consumers.
