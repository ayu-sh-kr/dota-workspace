---
"@ayu-sh-kr/dota-ssr": minor
---

Add a prototype request-time renderer at `@ayu-sh-kr/dota-ssr/server` that turns Dota pages into HTML strings in Node without Happy DOM.

- `createStringAdapter({components})` renders a page and its nested light-DOM and shadow components from their `html` templates, awaiting an optional `serverLoad(context)` on each component first.
- `createRequestHandler({adapter, routes, template})` matches `/path/:param` routes, gives components a request-scoped `fetch` and `state`, and writes page SEO and markup into a document shell. Page `seo.jsonLd` is written as a JSON-LD script the browser's `updateDocumentSEO` keeps in sync, and keywords are normalized as in the browser. `toNodeListener` serves it from `node:http` or connect middleware.
- Loaded `@Property` values are written to host attributes, so the browser upgrades the same markup without a serialized state script.
- Components declared `@Component({mode: 'csr'})` are emitted as empty `data-dota-csr` hosts, and Dota Core's server-render flag is set during a render.
- Output carries Dota Rendering's durable hydration markers and the page route marker by default, so `dotaHydration()` adopts the server DOM and later updates patch it in place. Pass `hydration: false` for plain HTML.
- Templates are compiled once per call site with an HTML tokenizer, which also finds nested component hosts. Tags inside comments, `<script>`, `<style>`, `<textarea>`, attribute values, and inert `<template>` content are never rendered as components.
- During a render, `window`, `document`, `location`, `history`, `localStorage`, `sessionStorage`, `matchMedia`, animation frames, and the observer classes exist as globals backed by the request, isolated between concurrent requests and removed afterwards. `runInBrowserScope` exposes this to custom engines. `customElements` is installed alongside `HTMLElement`.
- `ServerElement` reflects `id`, `className`, `classList`, `dataset`, `style`, and `toggleAttribute` into host attributes, dispatches events, keeps a small node tree, and supports `attachShadow`.
- Engines implement the `RenderAdapter` contract, so a DOM-backed or streaming engine can replace the string adapter.
