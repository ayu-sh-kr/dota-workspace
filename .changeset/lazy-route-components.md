---
"@ayu-sh-kr/dota-preloader-plugin": minor
"@ayu-sh-kr/dota-wrap": minor
---

Applications can load each route's components on demand instead of bundling every component into the entry chunk.

- The preloader serves `virtual:dota-component-registry`: one lazy loader per `@Component` plus the tags each component renders, so Vite emits a chunk per component.
- `initializeApp({lazyComponents})` accepts that registry and loaders declared with `defineComponentLoaders`. Before each navigation renders, the page's whole component tree is loaded in parallel and defined parents first, in batches that yield to the browser instead of one long task; tags that appear later, including inside open shadow roots, are defined when they enter the document. A navigation superseded while its components load never renders.
- With `lazyComponents`, the promise returned by `initializeApp` resolves after the first route has rendered, and the result includes `componentLoader` for prefetching. Explicit `routes` are required. Applications that do not pass `lazyComponents` behave as before.
