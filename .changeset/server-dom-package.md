---
"@ayu-sh-kr/dota-server-dom": minor
---

First release of `@ayu-sh-kr/dota-server-dom`: minimal, dependency-free browser stand-ins for rendering web components on a server.

- The root entry exports pure constructors (`ServerElement`, `ServerShadowRoot`, `ServerDocument`, `ServerCustomElementRegistry`, the node, token-list, style, location, history, storage, media-query, and observer stand-ins) and `installServerGlobals()`. Importing it defines no globals.
- `@ayu-sh-kr/dota-server-dom/install` is a side-effect import that defines `HTMLElement` and `customElements` when they are missing, for modules whose classes extend `HTMLElement` when they are evaluated.
- `@ayu-sh-kr/dota-server-dom/node` exports `runInBrowserScope(url, task)`, which provides request-scoped `document`, `location`, `history`, storage, and window events isolated between concurrent renders with `AsyncLocalStorage`. It requires a Node-compatible runtime.

Existing globals, from a browser, Happy DOM, or the runtime, are never replaced. Requires Node 22 or later.
