---
"@ayu-sh-kr/dota-ssr": minor
---

Static generation waits for asynchronous rendering work the page reports before it serializes a route.

- `trackPendingWork(promise)` reports work such as loading a lazily defined component; it does nothing in the browser. Dota Wrap reports its lazy component loads automatically.
- Each route's settle phase now waits for reported work alongside timers and requests, within the existing `settleTimeout`.
