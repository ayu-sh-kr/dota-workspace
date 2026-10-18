# Source layout

The package separates Vite integration from static page generation:

```text
src/
  vite/              Build plugins (SSG, SSR), prerender Vite server, and deployment files
    ssr/             dotaSsr plugin: dev middleware and the server build
    deployment/      Static redirects per platform and server deployment (server.ts)
  ssg/               Generation, rendering, workers, routes, assets, and fetch handling
  ssr/               Prototype request-time rendering to HTML strings
    server-globals.ts  Installs HTMLElement/customElements before Dota Core evaluates
  index.ts           Browser hydration entry and the application capture hook
  route-marker.ts    Markers shared by generation and hydration
```

The Vite plugin validates options and passes the completed client build to
`ssg/generate.ts`. Generation coordinates route discovery, rendering, output
writes, and timing logs. Vite server setup stays in `vite/prerender-server.ts`
and is shared by sequential rendering and isolated workers.

Tests follow the same `vite`, `ssg`, and `ssr` ownership. The `ssr` directory holds
the [light-DOM string rendering prototype](light-dom-string-rendering.md), published
as `@ayu-sh-kr/dota-ssr/server`.

Two lower layers live in other packages, so `ssr/` keeps only orchestration:

- Template serialization, escaping, and the HTML tokenizer are
  `@ayu-sh-kr/dota-rendering/server` (`packages/libs/dota-rendering/src/server/`).
- The server element, document, custom-element registry, browser-object stand-ins,
  and request-scoped browser globals are `@ayu-sh-kr/dota-server-dom`
  (`packages/libs/dota-server-dom/`).

`ssr/server-globals.ts` is built as its own entry. Bundlers hoist external imports such
as Dota Core above inlined code but emit local chunk imports first, so a separate entry is
what makes `HTMLElement` exist before `BaseElement extends HTMLElement` evaluates.
`@ayu-sh-kr/dota-ssr/server` still re-exports the moved serializer and DOM APIs.

Public imports remain `@ayu-sh-kr/dota-ssr` for hydration and
`@ayu-sh-kr/dota-ssr/vite` for the build plugin. The worker export retains its
`@ayu-sh-kr/dota-ssr/worker` name and now resolves to `dist/ssg/render-worker.cjs`.
Applications do not need configuration changes for this restructure.

The [buffered SSR and edge-cache plan](../planning/buffered-ssr-and-edge-cache.md)
describes the proposed shared render lifecycle, Node function adapters, performance
measurement, and implementation order for adding request-time SSR alongside SSG.
