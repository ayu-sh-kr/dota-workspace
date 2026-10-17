---
"@ayu-sh-kr/dota-ssr": minor
---

Add a prototype request-time renderer at `@ayu-sh-kr/dota-ssr/server` that turns Dota pages into HTML strings in Node without Happy DOM.

- `createStringAdapter({components})` renders a page and its nested light-DOM and shadow components from their `html` templates, awaiting an optional `serverLoad(context)` on each component first.
- `createRequestHandler({adapter, routes, template})` matches `/path/:param` routes, gives components a request-scoped `fetch` and `state`, and writes page SEO and markup into a document shell. `toNodeListener` serves it from `node:http` or connect middleware.
- Loaded `@Property` values are written to host attributes, so the browser upgrades the same markup without a serialized state script.
- Components declared `@Component({mode: 'csr'})` are emitted as empty `data-dota-csr` hosts, and Dota Core's server-render flag is set during a render.
- Engines implement the `RenderAdapter` contract, so a DOM-backed, streaming, or hydrating engine can replace the string adapter.
