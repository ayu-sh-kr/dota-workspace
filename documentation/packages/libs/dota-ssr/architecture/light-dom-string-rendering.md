# Light-DOM string rendering

Prototype request-time renderer that turns a Dota page into an HTML string in Node, without Happy DOM
or any other DOM implementation. It is published as `@ayu-sh-kr/dota-ssr/server` and lives in
`packages/libs/dota-ssr/src/ssr/`. Its output carries Dota Rendering's durable hydration markers, so
the browser adopts the server DOM instead of re-rendering it. The API is small so later work can
replace or extend the engine without changing applications.

## Context and intent

SSG renders each route inside an isolated Happy DOM window ([source layout](source-layout.md)). That
is accurate but heavy for request-time rendering. Dota components already describe their output as
`html` template results from Dota Rendering, and Dota Core keeps component configuration in class
metadata. A server can therefore build each component, run Dota Core's property rules, and serialize
the template directly, without parsing or mutating a DOM.

The prototype has four goals:

- Render a page and its nested components to HTML strings with only Dota Core and Dota Rendering.
- Emit the same hydration markers the client renderer writes, so `dotaHydration()` adopts the output.
- Give components request services (`fetch`, per-request `state`, request-backed browser globals).
- Put the engine behind an adapter contract so a DOM-backed or streaming engine can replace it.

## Layers

```text
node:http / connect middleware
  └─ toNodeListener(handler)                    request-handler.ts
       └─ createRequestHandler(options)         route match → RenderContext → document shell
            └─ RenderAdapter.render(selector)   types.ts contract
                 └─ createStringAdapter(...)    string-adapter.ts (default engine)
                      ├─ dom/                   server element, document, registry, browser scope
                      └─ html/                  tokenizer → template plan → serializer
```

| Contract | Role |
| --- | --- |
| `RenderAdapter` | `render(selector, context)` resolves `{html, head}` for one page. The only thing an engine must implement. |
| `RenderContext` | Request URL, route `params`, a `fetch` bound to the request origin, and a `state` map shared by the request's components. |
| `ServerLoadable` | Optional `serverLoad(context)` a component implements to load data before it renders. |
| `RequestHandler` | Web-standard `(Request) => Promise<Response \| undefined>`; `undefined` lets the host server answer the request instead. |
| `StringAdapterOptions.hydration` | `true` by default; `false` produces plain HTML without markers. |

## Behavior

1. `createRequestHandler` answers only `GET` and `HEAD` requests whose path matches a `PageRoute`
   (`/tasks/:id` style, first match wins). It creates a fresh `RenderContext` for each request.
2. The render runs inside `runInBrowserScope` (see [Browser globals](#browser-globals)) and with
   Dota Core's server-render flag set, so `isServerRender()` is true in component code.
3. The string adapter constructs the page component. `ssr/server-globals.ts` calls Dota Server DOM's
   `installServerGlobals()`, which installs a global `HTMLElement` (`ServerElement`) and
   `customElements` before Dota Core loads, so `class BaseElement extends
   HTMLElement` evaluates in Node. Construction never connects the element, so lifecycle binding code
   that needs a document never runs.
4. Host attributes are applied, then `PropertyUtils.seedInitialValues` resolves typed `@Property`
   values with Dota Core's attribute > field > default rules.
5. `serverLoad(context)` is awaited once. It is the only server-specific hook. `render()` stays pure.
6. Every `@Property` value is written back to its host attribute, using `type.serialize` when the
   property type defines it. Loaded data therefore travels to the browser inside the HTML, with no
   serialized state script.
7. `render()` output is serialized from a cached template plan (see [Template plans](#template-plans)).
   `when`, `keyed`, `unsafeHTML`, and `trustedHTML` follow the client renderer's rules. Plain arrays
   become comma-joined text, as `valueText` makes them on the client. Unquoted attribute
   interpolations, interpolated attribute or tag names, duplicate keys, and `trustedHTML` in an
   attribute throw, as they do in the browser.
8. The serialized markup is tokenized to find registered custom-element hosts. Each one is rendered by
   the same steps, concurrently with its siblings, and replaces its tag's content. Light-DOM hosts drop
   authored children, matching the client mount. Shadow hosts emit `<template shadowrootmode="open">`
   and keep authored children for slots.
9. Components declared `@Component({mode: 'csr'})` are emitted as empty hosts marked `data-dota-csr`,
   without `serverLoad`, `render()`, or descendants, following the
   [render modes standard](../../../../standards/hydration-ssr/render-modes.md).
10. The handler writes the page `seo` (from `DotaPageElement`) into `<!--dota-head-->` and the page
    markup into `<!--dota-body-->` of the document shell. Head tags follow the same field table
    and order as Dota Core's `updateDocumentSEO`. `seo.jsonLd` becomes one
    `<script type="application/ld+json" data-dota-seo>`, with `<`, `>`, `&`, U+2028, and U+2029
    escaped so content cannot close the script, which the browser then keeps in sync on navigation.

## Hydration markers

With `hydration` on, the output is what the client renderer writes while it emits durable markers
(the SSG path), so `hydrate()` pairs every part with existing nodes:

| Where | Marker |
| --- | --- |
| Template-rendered host | `data-dh-c` (tag), `data-dh-t` (`templateId` of the template strings), `data-dh-v` (`MARKER_VERSION`), `data-dh-s` (scope) |
| Every template | `<!--dota-component-start-->` … `<!--dota-component-end-->` |
| Every element of a template | `data-dota-index` (document order within that template), `data-dota-component` on custom elements, `data-dota-dynamic` on part owners |
| Attribute part | `data-dh-a="<scope>:p<index> …"` on the element |
| Child part | `<!--dh:<scope>:p<index>-->` … `<!--/dh:<scope>:p<index>-->`; nested `when` and `keyed` templates reuse the scope |
| Keyed entry | `<!--dh:<scope>:k<part>:<position>-->` … `<!--/dh:<scope>:k<part>:<position>-->` |
| Page host | `path`, `data-dh-route="true"`, `data-dh-route-version`, so the router keeps the page on first load |

Scopes are numbered `h0`, `h1`, … in document order after the page is complete, so identical input
gives identical output even though siblings load concurrently. Hosts that render a legacy string or
`nothing`, and client-only hosts, get no template identity and are mounted by the client as before.

In the browser, `dotaHydration()` reads the identity on each host. A match adopts the existing nodes,
and later updates patch them in place. A mismatch is handled by the configured policy (`warn`
remounts that host). Both the DOM renderer and this serializer build markers from Dota Rendering's
`hydration-markers.ts`, so the format is defined once. Dota Rendering's `test/server/template-parity.test.ts` compares the
serializer with the real renderer, and `test/ssr/hydration-parity.test.ts` hydrates adapter output
with `hydrate()` in strict mode.

## Template plans

The template pipeline is Dota Rendering's `/server` entry (`dota-rendering/src/server/`).
`html-tokenizer.ts` is a small HTML tokenizer. It handles comments, doctypes, quoted and
unquoted attributes with character references, raw-text and RCDATA elements (`<script>`, `<style>`,
`<textarea>`, `<title>`, …), and SVG/MathML, where `/>` closes elements and raw-text rules stop. Tree
construction is left to callers.

`template-plan.ts` joins a template's static strings with private placeholders, tokenizes the
result once per call site, and caches a list of steps: static markup, hydration-only markup, child
parts, attribute parts, and marker-less text. Element indexes follow the client's
`querySelectorAll('*')` order: `<template>` content is not counted, and the `<tbody>` a browser
inserts for `<tr>` directly inside `<table>` is written and counted. Values in comments, raw-text,
RCDATA, and inert `<template>` positions are written as text without markers, because a comment
marker there would reparse as text. Values inside `<script>`/`<style>` are written raw with `</`
neutralized. `template-serializer.ts` fills a plan with values, so each render does no parsing.

Host discovery uses the same tokenizer. Tags inside comments, raw-text elements, attribute values,
and inert `<template>` content are never taken for hosts. Declarative shadow roots are searched. The
first of duplicate attributes wins, and an unclosed host extends to the end of the markup, as the
HTML parser would make it.

## Browser globals

The globals come from `@ayu-sh-kr/dota-server-dom`. `installServerGlobals()` permanently installs
only `HTMLElement` and `customElements`, which component modules
need when they are evaluated. `runInBrowserScope(url, task)`, from its `/node` entry, adds the rest while a render is in flight
and removes them when the last overlapping render ends:

| Global | Server behavior |
| --- | --- |
| `window` | `globalThis` |
| `document` | A per-request `ServerDocument`: `html`/`head`/`body` tree, `title`, `cookie`, `createElement` (registered components through their constructors), `createElementNS`, text, comments, fragments. Queries return nothing. |
| `location`, `history` | The request URL, read-only. Navigation methods and assignments are ignored. |
| `localStorage`, `sessionStorage` | Empty, in memory, per request. |
| `addEventListener`, `dispatchEvent` | A per-request event target. |
| `matchMedia` | Never matches. |
| `getComputedStyle` | The element's inline style. |
| `requestAnimationFrame` | Returns an id; callbacks never run. |
| `MutationObserver`, `ResizeObserver`, `IntersectionObserver` | Accept callbacks and never call them. |
| `Node`, `Element`, `ShadowRoot`, `DocumentFragment`, `Document` | The server node classes, for `instanceof` checks. |

Request-owned values come from `AsyncLocalStorage`, so concurrent renders each see their own URL,
document, and storage across `await`s. A global that already exists, for example from Happy DOM or
Node's own `navigator`, is never replaced or removed.

`ServerElement` stores attributes as the element's real state and reflects `id`, `className`,
`classList`, `dataset`, `style`, and `toggleAttribute` through them, so host changes made in a
constructor or `serverLoad` reach the HTML. It extends the platform `EventTarget`, keeps a small node
tree (`append`, `insertBefore`, `remove`, `textContent`, …), supports `attachShadow`, and reports its
tag from `customElements` or its `@Component` selector. It is never connected, and `querySelector`
and similar queries return nothing, because a component's content exists only as serialized output.

## Automatic pipeline

Projects opt in only by declaring `@Route({mode: 'ssr'})`; `dotaVitePlugins()` includes
`dotaSsr()` (`src/vite/ssr/`) by default.

1. **Capture.** `captureApplication(loadEntry)` installs a global capture hook
   (`src/application-capture.ts`) and imports the application entry inside a browser scope.
   Dota Wrap's `initializeApp` sees the hook, reports its components (external ones included),
   flat routes with their modes, root, and fallback routes, and returns a promise that never
   settles, so the application never starts on the server. `resolveServerRoutes` keeps the
   routes whose mode resolves to `ssr`, flattening nested routes.
2. **Handler.** `createApplicationHandler` captures lazily on the first request (Cloudflare
   Workers forbid work at module load), builds the string adapter from the captured
   components, and adds the head and body outlets to the shell (`prepareDocumentShell`):
   the body outlet replaces the content of the root element, where the router expects the page.
3. **Dev.** Middleware captures through Vite's own module graph, so components and the
   engine share one Dota Core, and renders `ssr` routes; other requests fall through to Vite.
   A file change recaptures on the next page request; once an application is known to have no
   `ssr` routes, only a changed file mentioning `mode: 'ssr'` does.
4. **Build.** If any client-build source declares `mode: 'ssr'`, the plugin runs a second Vite
   build of a virtual server entry from the application's own config (minus the metadata
   writers and the SSG/SSR plugins; `src/vite/application-config.ts`). The bundle is one ESM
   file with dependencies inlined and the built `index.html` embedded; Workers get a
   `webworker` build. A worker thread imports it once to read the `ssr` route paths.
5. **Deployment.** `src/vite/deployment/server.ts` writes the target's files (see the package
   README): a Node launcher over `createNodeServer`, a Vercel function and rewrites, a Netlify
   Functions API function, or a Cloudflare Pages `_worker.js` with `_routes.json`.

`playground/light-dom` shows the lower-level API (explicit components and routes). When
component modules are loaded through Vite's SSR module graph by hand, list the Dota packages
in `ssr.external`, or components and the engine read different metadata stores.

## Constraints and edge cases

- Import `@ayu-sh-kr/dota-ssr/server` before any component module. Module-level code that reads
  `window` or `document` while being imported still fails, because those globals exist only during a
  render.
- While any render is in flight, `typeof window` is `'object'` for every module in the process,
  including unrelated server code running concurrently.
- `@State` fields, `@Param`, `@BeforeInit`/`@AfterInit` hooks, listeners, and watchers do not run on
  the server. Only `@Property` values reach the browser.
- Element indexing follows the HTML tree builder only for the implied `<tbody>`. Other parser
  repairs that insert or move elements (foster parenting, an implied `<colgroup>`, `<td>` written
  directly inside `<table>`, and so on) are not modelled, and a template using them falls back
  to a client remount with a mismatch warning. Happy DOM itself omits the implied `<tbody>`, so SSG
  output for such templates does not hydrate in browsers either.
- A component with a value in a comment, raw-text, RCDATA, or inert `<template>` position renders
  correctly but cannot be hydrated. The client reports a mismatch and remounts it.
- Render errors propagate to the host server. `toNodeListener` passes them to `next(error)` or
  answers 500. Status codes, redirects, and streaming are not modelled.
- `maxDepth` (default 32) stops components that include themselves.

## Future work

- Status and redirect control from `serverLoad`, plus a streaming adapter.
- Per-request module state: the application is evaluated once per server, so singletons are shared between requests.
- Request headers and cookies on `RenderContext`, exposed through `document.cookie`.

## Related documentation

- [Buffered SSR and edge cache plan](../planning/buffered-ssr-and-edge-cache.md)
- [Source layout](source-layout.md)
- [Scoped hydration marker ownership](../../dota-rendering/planning/scoped-hydration-marker-ownership.md)
