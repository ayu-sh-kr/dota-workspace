---
"@ayu-sh-kr/dota-router": minor
---

Add adapter-neutral `back()` and `forth()` navigation to `Router` and `RouterService`.

- History-based routers now index entries and reconcile the browser's post-traversal `popstate` event, restoring the last accepted route when guards cancel, redirect, or fail before rendering.
- Traversals preserve application history state, cancel stale asynchronous work, and avoid repeating callbacks while a rejected entry is restored.
- Navigation API and History API adapters continue to share the same coordinator guard, rendering, and lifecycle behavior.
