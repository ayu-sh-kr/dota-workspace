# Light-DOM string rendering

Prototype request-time renderer that turns a Dota page into an HTML string in Node, without Happy DOM
or any other DOM implementation. It is published as `@ayu-sh-kr/dota-ssr/server` and lives in
`packages/libs/dota-ssr/src/ssr/`. It keeps a small API with complete output so later work can
replace or extend the engine without changing applications.

## Context and intent

SSG renders each route inside an isolated Happy DOM window ([source layout](source-layout.md)). That
is accurate but heavy for request-time rendering. Dota components already describe their output as
`html` template results from Dota Rendering, and Dota Core keeps component configuration in class
metadata. A server can therefore build each component, run Dota Core's property rules, and serialize
the template directly, without parsing or mutating a DOM.

The prototype has three goals:

- Render a page and its nested components to HTML strings with only Dota Core and Dota Rendering.
- Give components request services (`fetch`, per-request `state`) through a small orchestrating handler.
- Put the engine behind an adapter contract so a DOM-backed, streaming, or hydrating engine can replace it.

## Layers

```text
node:http / connect middleware
  └─ toNodeListener(handler)                    request-handler.ts
       └─ createRequestHandler(options)         route match → RenderContext → document shell
            └─ RenderAdapter.render(selector)   types.ts contract
                 └─ createStringAdapter(...)    string-adapter.ts (default engine)
                      ├─ ServerElement          server-element.ts (attribute-only HTMLElement)
                      └─ serializeOutput        template-serializer.ts
```

| Contract | Role |
| --- | --- |
| `RenderAdapter` | `render(selector, context)` resolves `{html, head}` for one page. The only thing an engine must implement. |
| `RenderContext` | Request URL, route `params`, a `fetch` bound to the request origin, and a `state` map shared by the request's components. |
| `ServerLoadable` | Optional `serverLoad(context)` a component implements to load data before it renders. |
| `RequestHandler` | Web-standard `(Request) => Promise<Response \| undefined>`; `undefined` lets the host server answer the request instead. |

## Behavior

1. `createRequestHandler` answers only `GET` and `HEAD` requests whose path matches a `PageRoute`
   (`/tasks/:id` style, first match wins). It creates a fresh `RenderContext` for each request.
2. The string adapter constructs the page component. `server-element.ts` installs a global
   `HTMLElement` that only stores attributes, so `class BaseElement extends HTMLElement` evaluates in
   Node. Construction never connects the element, so lifecycle binding code that needs the DOM never runs.
3. Host attributes are applied, then `PropertyUtils.seedInitialValues` resolves typed `@Property`
   values with Dota Core's attribute > field > default rules.
4. `serverLoad(context)` is awaited once. It is the only server-specific hook. `render()` stays pure.
5. Every `@Property` value is written back to its host attribute, using `type.serialize` when the
   property type defines it. Loaded data therefore travels to the browser inside the HTML, with no
   serialized state script.
6. `serializeOutput` walks the template result. A small scanner tracks whether each interpolation is
   in text, a quoted attribute, or a comment, and escapes it for that position. `when`, `keyed`,
   arrays, nested templates, `unsafeHTML`, and `trustedHTML` follow the client renderer's rules.
   Unquoted attribute interpolations and `trustedHTML` in an attribute throw, as they do in the browser.
7. The serialized markup is scanned for registered custom-element tags. Each one is rendered by the
   same steps, concurrently with its siblings, and replaces its tag's content. Light-DOM hosts drop
   authored children, matching the client mount. Shadow hosts emit
   `<template shadowrootmode="open">` and keep authored children for slots.
8. Components declared `@Component({mode: 'csr'})` are emitted as empty hosts marked
   `data-dota-csr`, without `serverLoad`, `render()`, or descendants, following the
   [render modes standard](../../../../standards/hydration-ssr/render-modes.md). The adapter keeps Dota
   Core's server-render flag set while any render is in flight, so `isServerRender()` is true in
   component code.
9. The handler writes the page `seo` (from `DotaPageElement`) into `<!--dota-head-->` and the page
   markup into `<!--dota-body-->` of the document shell.

In the browser, `bootstrap()` upgrades the server-rendered hosts. Each host reads the reflected
attributes and renders the same output with the normal client mount, then becomes interactive.

## Usage

See the package README for the handler example. `playground/light-dom` is a runnable example. Vite
middleware serves the client modules, an `/api/tasks` endpoint provides the data, and the handler
renders `tasks-page`. Run `pnpm run playground` from `packages/libs/dota-ssr` after building the
libraries.

When component modules are loaded through Vite's SSR module graph, list the Dota packages in
`ssr.external`. Linked workspace packages are otherwise inlined as a second Dota Core instance, and
components would write their decorators to a different metadata store from the one the engine reads.

## Constraints and edge cases

- Import `@ayu-sh-kr/dota-ssr/server` before any component module. An existing global `HTMLElement`
  is never replaced.
- No hydration markers are emitted. The client re-renders each host over the server markup, so
  first paint comes from the server but DOM nodes are recreated on upgrade.
- `@State` fields, `@Param`, `@BeforeInit`/`@AfterInit` hooks, listeners, and watchers do not run on
  the server. Only `@Property` values reach the browser.
- Host detection uses a tag scanner over serialized markup. Custom-element names inside `<script>`,
  `<style>`, or comments in a component's output would also be matched.
- Render errors propagate to the host server. `toNodeListener` passes them to `next(error)` or
  answers 500. Status codes, redirects, and streaming are not modelled.
- `maxDepth` (default 32) stops components that include themselves.

## Future work

- A hydrating adapter that emits Dota Rendering's durable markers so the client adopts nodes instead
  of recreating them.
- Route discovery from `@Route` metadata instead of an explicit `routes` list.
- Status and redirect control from `serverLoad`, plus a streaming adapter.

## Related documentation

- [Buffered SSR and edge cache plan](../planning/buffered-ssr-and-edge-cache.md)
- [Source layout](source-layout.md)
- [Scoped hydration marker ownership](../../dota-rendering/planning/scoped-hydration-marker-ownership.md)
