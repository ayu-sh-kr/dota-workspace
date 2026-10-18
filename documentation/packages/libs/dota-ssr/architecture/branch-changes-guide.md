# Dota SSR and SSG: from application declaration to HTML and browser updates

> **Implementation reference, not the starting lesson.** New to SSR? Start with the [short server-rendering collection](/docs/ssg-ssr-csr): eight ordered lessons with flow diagrams, annotated code, and definitions. This page retains the detailed branch-wide file descriptions and function inventories for lookup.

This guide explains the framework implementation: how Dota renders a request,
how it generates static pages, which functions run in each path, and how the
browser takes ownership afterward. The main chapters follow library execution.
Dota Web is only a consumer example in the appendix.

Each runtime file has its own heading and a function/method map explaining its
inputs, results, decisions, and callers. Public APIs and private orchestration
helpers are both covered. Type-only and export-only files are identified as such.
Examples marked as simplified show the relevant contract; the existing playground
and consumer fixture provide runnable projects.

## First separate the two server lifecycles

| Question | Request SSR | Build-time SSG | Browser CSR |
| --- | --- | --- | --- |
| When does it produce the first HTML? | For each matched HTTP request | Once per selected concrete URL during the build | After the app shell reaches the browser |
| Which engine runs? | String adapter plus Rendering's server serializer | Normal app and DOM renderer in Happy DOM | Normal app and DOM renderer in the browser |
| Does `serverLoad(context)` run? | Yes, once per rendered component instance | No, not through the current SSG pipeline | No |
| Do connected / after-init hooks run? | Not as the adapter's rendering lifecycle | Yes, through ordinary app execution | Yes |
| How is URL/data supplied? | Request context, scoped globals, seeded properties | Window URL, normal routing/bindings, app readiness and tracked fetches | Browser URL, routing/bindings, normal client data work |
| What persists across pages? | Cached declarations/handler, not rendered component instances | Build caches and transformed code; route windows/module state are fresh | The active browser application |
| What leaves the producer? | Buffered HTML Response | HTML files plus optional hosting mappings | Live DOM |
| What happens next? | Browser route preservation / eligible hydration, then client updates | Browser route preservation / eligible hydration, then client updates | Ordinary client mount and updates |

The same component `render()` can serve all three environments, but the lifecycle
that prepares its state is different. **Moving data loading into `serverLoad`
does not automatically make SSG call it.** Keeping data only in a connected hook
does not automatically include it in string-rendered SSR.

```text
Request SSR
  app declaration → capture once → match each request → fresh context/instances
  → seed properties → await serverLoad → reflect → render → serialize/expand
  → shell + SEO → Response

Build-time SSG
  concrete URLs → fresh Happy DOM window → run the ordinary app
  → await applicationReady → wait for DOM/fetch settling
  → route markers → serialize whole document → write HTML file

Both outputs
  browser registration → preserve eligible initial route
  → adopt compatible component parts or mount normally → events and updates
```

SSR orchestration, SSG orchestration, browser integration, and build/deployment
remain in `dota-ssr`. `dota-rendering` owns the template contract, the DOM
renderer, and the new server serializer. `dota-server-dom` supplies the minimal
request environment. There is no separate SSR template language.

## A small example to keep in mind

Consider a request for `/tasks/42`. This component gives SSR an explicit data
hook and gives normal SSG/browser startup a separate URL-derived initialization.
The property is serialized so the first browser render can recover the same ID.

```ts
import {
  AfterInit, Component, DotaPageElement, Property, String, type SEO
} from '@ayu-sh-kr/dota-core';
import {html} from '@ayu-sh-kr/dota-rendering';
import {Route} from '@ayu-sh-kr/dota-router';
import type {RenderContext} from '@ayu-sh-kr/dota-ssr/server';

@Route({path: '/tasks/:id', mode: 'ssr'})
@Component({selector: 'task-page', shadow: false})
export class TaskPage extends DotaPageElement {
  @Property({name: 'task-id', type: String}) taskId = '';

  constructor() { super(); }

  get seo(): SEO {
    return {title: `Task ${this.taskId}`, description: 'Task details'};
  }

  serverLoad(context: RenderContext) {
    this.taskId = context.params.id;
  }

  @AfterInit()
  initializeFromBrowserUrl() {
    if (!this.taskId) { // SSR may already have transferred this value.
      this.taskId = location.pathname.split('/').at(-1) ?? '';
      this.updateHTML();
    }
    this.updateSEO();
  }

  render() {
    return html`<h1>Task ${this.taskId}</h1>`;
  }
}
```

This is an illustrative component, not a change to the application. For real API
data, use `context.fetch` in an async serverLoad; the existing standalone playground
demonstrates that pattern. SSG API loading must instead be reached through its
normal startup/readiness path, with a configured API base when necessary.

| Stage for this example | SSR | SSG for an explicitly selected `/tasks/42` |
| --- | --- | --- |
| Initial instance | taskId is empty | taskId is empty |
| State preparation | serverLoad receives params.id = 42 | Normal connection renders initially, then AfterInit derives 42 and updates |
| HTML production | Reflect task-id, serialize render output | Wait for updates, then serialize the document |
| Browser startup after delivery | Seed taskId from the host attribute; no second serverLoad | Seed the serialized property; normal browser behavior continues |

Explicit SSG URLs can override the usual producer for particular URLs. On the
Node host, a generated `tasks/42/index.html` is served first; `/tasks/99` can
still use the `/tasks/:id` request handler. This is one useful way SSG and SSR
work together in the same application.

Route mode is an initial-delivery decision. Later in-app navigation still uses
normal browser routing; it does not automatically fetch fresh SSR HTML.

## Reading order

- [1. Start from Dota's server entry and application declaration](#1-start-from-dotas-server-entry-and-application-declaration)
- [2. Follow one SSR request into HTML](#2-follow-one-ssr-request-into-html)
- [3. Follow the SSG build into static files](#3-follow-the-ssg-build-into-static-files)
- [4. Understand the shared template and the separate server writer](#4-understand-the-shared-template-and-the-separate-server-writer)
- [5. Connect builds and hosts to both paths](#5-connect-builds-and-hosts-to-both-paths)
- [6. Finish in the browser: CSR, route preservation, hydration](#6-finish-in-the-browser-csr-route-preservation-hydration)
- [7. Reach the server-environment units](#7-reach-the-server-environment-units)
- [Appendix A. Runnable examples and correctness checks](#appendix-a-runnable-examples-and-correctness-checks)
- [Appendix B. Brief consumer and generated-output references](#appendix-b-brief-consumer-and-generated-output-references)
- [Appendix C. Packaging, release notes, and supporting documents](#appendix-c-packaging-release-notes-and-supporting-documents)


## 1. Start from Dota's server entry and application declaration

First understand the contract: route mode chooses initial HTML production, Wrap supplies declarations, and the SSR server entry exposes the request engine. Existing supporting files are included only when they explain framework behavior.

### [packages/libs/dota-core/src/core/render/render-mode.ts](../../../../../packages/libs/dota-core/src/core/render/render-mode.ts)

This shared policy distinguishes a **route's initial delivery mode** from a **component's server opt-out**. Types are `RouteRenderMode = 'ssr' | 'ssg' | 'csr'` and `ComponentRenderMode = 'inherit' | 'csr'`.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `resolveRouteRenderMode(route)` | Returns explicit mode, otherwise ssg for legacy ssr: true, otherwise csr. Explicit mode wins even when the legacy field disagrees. |
| `resolveComponentRenderMode(component)` | Reads __dotaMode from a class/instance constructor, defaulting to inherit. |
| `setServerRender(enabled), isServerRender()` | Write/read the global-symbol server flag shared by module copies. BaseElement and the string adapter use it to omit client-only hosts during server work. |

The legacy name is easy to misread: `ssr: true` predates request rendering and still means build-time SSG. `CLIENT_ONLY_ATTRIBUTE` is `data-dota-csr`; the browser uses it as the empty server-host handoff.

### [packages/libs/dota-core/src/core/types/core.types.ts](../../../../../packages/libs/dota-core/src/core/types/core.types.ts)

Contains Core's component, property, binding, lifecycle, and SEO types. For this feature, `ComponentConfig.mode` describes whether a component inherits its page's environment or is client-only; that existing contract is consumed by both server paths.

### [packages/libs/dota-runtime/src/index.ts](../../../../../packages/libs/dota-runtime/src/index.ts)

Existing supporting file. It contains only the shared TypeScript contracts `DotaRuntimePlugin`, `DotaRuntimeContext`, and `RouteRendererWrapper`. A plugin's `setup` can select an initial mount strategy and wrap route presentation.

### [packages/libs/dota-wrap/src/runtime-plugin.ts](../../../../../packages/libs/dota-wrap/src/runtime-plugin.ts)

Existing supporting file. It re-exports the runtime contracts through Wrap. Application code can type runtime extensions while continuing to consume the wrapper as its public package surface.

### [packages/libs/dota-wrap/src/index.ts](../../../../../packages/libs/dota-wrap/src/index.ts)

This composition root makes the same app entry usable in the browser, SSG, and captured SSR. Its `AppConfig` contains modules, external components, explicit/decorated routes, root, fallback routes, navigation hooks, and runtime plugins.

**Normal browser/SSG path:** set up plugin sockets → register components → create router → initialize router → resolve readiness. **SSR capture path:** resolve declarations → report them to the hook → leave the returned promise pending. The capture branch runs first, so it does not accidentally start the browser router.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `extractComponent(modules)` | Awaits eager/lazy module records and collects exports whose prototypes inherit from the active HTMLElement. This resolves imports but does not register elements. |
| `resolveComponents(modules, externalComponents)` | Copies a supplied constructor array or resolves module records, then appends external UI components. Both capture and normal registration need the complete list. |
| `registerComponents(modules, externalComponents)` | Resolves the list, calls Core bootstrap once, and returns constructors. In the browser, define() can immediately upgrade existing server hosts. |
| `registerRoutes(components, errorRoute, defaultRoute, root, routes, globalHooks, renderer)` | Constructs the Router service using explicit routes when supplied or metadata discovery otherwise. Accepts the renderer already decorated by plugins. |
| `initializeApp(config)` | Chooses capture or normal startup. Capture reports configuration and never resolves its promise; normal startup configures plugins before bootstrap, initializes routing, and returns components/router service. |
| `runtimeContext.setMountStrategy(strategy)` | Claims the exclusive initial-mount socket. A second plugin claim throws with both plugin names rather than allowing order-dependent hydration. |
| `runtimeContext.wrapRouteRenderer(wrapper)` | Replaces the current renderer with the wrapper's result, passing the application root. Hydration uses this to protect only the first marked route. |

This ordering is necessary: if custom elements upgrade before the hydration strategy is installed, Core mounts fresh HTML and can erase the server DOM.

```ts
import {initializeApp} from '@ayu-sh-kr/dota-wrap';
import {dotaHydration} from '@ayu-sh-kr/dota-wrap/ssr';
import {AppRoot, TaskPage, HomePage, ErrorPage} from './pages';

export const applicationReady = initializeApp({
  modules: [AppRoot, TaskPage, HomePage, ErrorPage],
  root: AppRoot,
  defaultRoute: {path: '/', component: HomePage},
  errorRoute: {path: '/error', component: ErrorPage},
  plugins: [dotaHydration()]
}).then(() => {
  // Browser startup continuation; SSR capture never reaches it.
  window.scrollTo(0, 0);
});
```

This follows the existing [consumer fixture](../../../../../packages/libs/dota-wrap/test/fixtures/ssr-app/src/main.ts); page classes are supplied by its sibling module. SSG needs this promise to resolve, so SSG does not activate the capture hook.

### [packages/libs/dota-ssr/src/ssr/index.ts](../../../../../packages/libs/dota-ssr/src/ssr/index.ts)

This is the root of the request-time API: import `@ayu-sh-kr/dota-ssr/server` to obtain the component adapter, explicit request handler, application-capture handler, document writers, and shared types.

It contains exports rather than an additional rendering algorithm. The first import is local `server-globals`, which must run before Core defines its HTMLElement subclass. Constructors/scoping are forwarded from `dota-server-dom`; escaping/serialization are forwarded from `dota-rendering/server`. Existing SSR consumers can retain their imports after those implementations move.

**Call direction:** application host → this entry → application or request handler → string adapter → Rendering/server. Import the server entry before evaluating server-side component modules.

### [packages/libs/dota-ssr/src/ssr/server-globals.ts](../../../../../packages/libs/dota-ssr/src/ssr/server-globals.ts)

This module calls `installServerGlobals()` before Core is evaluated. It is kept as a separate local entry in SSR's library build because external imports may otherwise be hoisted before an inline installer statement.

There are no functions declared here: the module's work is the installer call. It establishes only `HTMLElement` and `customElements` for class evaluation. A request document/location is created later by `runInBrowserScope`; installing the class base does not create a page.

### [packages/libs/dota-ssr/src/application-capture.ts](../../../../../packages/libs/dota-ssr/src/application-capture.ts)

This file is the narrow bridge between Wrap startup and the SSR runtime. `CapturedApplication` carries the component list, route tree, root, and default/error routes. `ApplicationCaptureHook` is a callback receiving that object.

The bridge lives at `Symbol.for('dota.ssr.application-capture')`, not in a module-local variable, so differently loaded copies can find the same slot. It transfers application declarations, not rendered HTML or per-request state.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `setApplicationCaptureHook(hook)` | Stores the callback on the shared global symbol, or clears it with undefined. The server capture operation owns setting and clearing this slot. |
| `getApplicationCaptureHook()` | Returns the installed callback, if any. initializeApp checks this before its normal component registration and router startup. |

A capture import is configuration discovery. Component constructors may be resolved during discovery, but components are not being connected as a browser page. Application module-level statements still execute; only startup chained on the deliberately pending readiness promise is suppressed.

### [packages/libs/dota-ssr/src/ssr/application.ts](../../../../../packages/libs/dota-ssr/src/ssr/application.ts)

This file turns a captured Wrap application into a reusable handler. It separates **one-time declaration loading** from **per-request component construction**. Capturing once does not mean rendered page instances are shared across requests.

The shell's root selector is resolved from component metadata. It identifies where to insert the page; the request engine does not execute the root's normal connected lifecycle to render the whole app.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `captureApplication(loadEntry, timeout)` | Queues a capture, installs the shared hook inside a browser scope, invokes the import callback, and resolves with CapturedApplication. Import failure or missing report rejects; default timeout is 10 seconds. finally clears the hook so it cannot affect later startup. |
| `resolveServerRoutes(application)` | Flattens nested paths, keeps routes whose resolved mode is ssr, skips custom render callbacks, and converts component classes to selector-based PageRoute records. Carries optional route SEO. |
| `createApplicationHandler(loadEntry, options)` | Returns an async RequestHandler with an application() accessor. Caches application capture and handler creation lazily; prepares root/head outlets and builds a string adapter from captured constructors. |
| `loadApplication() — closure` | Shares the first capture promise across callers. Clears a rejected promise so a later call can retry rather than keeping startup permanently broken. |
| `handle(request) — closure` | Waits for the cached handler, then forwards the actual request. Handler setup failure clears that cache too; successful requests still get fresh RenderContext and instances. |
| `flattenRoutes(routes, parent)` | Returns each route paired with its full parent/child pathname. Collapses duplicate slashes and removes non-root trailing slashes so server lookup agrees with configured paths. |
| `selectorOf(component)` | Reads own Component metadata, falling back to __dotaSelector. Non-functions or classes without selectors are not renderable page hosts. |

A nested declaration `/tasks` + child `:id` becomes `/tasks/:id`. A route with a custom browser `render` callback is skipped: this server engine cannot infer HTML from that callback.

```ts
import {createApplicationHandler} from '@ayu-sh-kr/dota-ssr/server';

// shell is the built index.html; appEntry is a server-loadable entry module.
const handler = createApplicationHandler(() => import(appEntry), {
  template: shell,
  hydration: true
});
const response = await handler(new Request('http://localhost/tasks/42'));
```

This higher-level API requires capture-aware `initializeApp`. For a custom host without Wrap, use the explicit handler below.

## 2. Follow one SSR request into HTML

A captured application gives the request handler constructors and page patterns. Every request then gets a fresh context and instances; the following files explain that execution rather than application page design.

### [packages/libs/dota-ssr/src/ssr/types.ts](../../../../../packages/libs/dota-ssr/src/ssr/types.ts)

These interfaces define the boundary between HTTP orchestration and an output engine. They contain no executable functions.

| Contract | Meaning in a request |
| --- | --- |
| `RenderContext` | URL, decoded path params, relative-aware fetch, and a fresh state Map shared by components in this render. |
| `ServerLoadable` | Optional awaited `serverLoad(context)` method on a component. |
| `RenderAdapter` | Named engine with `render(selector, context)` returning HTML and optional page SEO. |
| `PageRoute` | Concrete/pattern path mapped to a page selector, optionally with fallback route SEO. |
| `RequestHandler` | Async Request → Response or undefined for host fallthrough. |
| `StringAdapterOptions` | Registered constructors, depth limit, and marker emission; hydration defaults on. |
| `DocumentTemplate` | Shell string or URL-dependent sync/async shell loader. |
| `ApplicationHandler` | Request handler plus application() for lazy captured declarations. |

The context `state` Map is server coordination, not automatic client state transfer. For first-client-render parity, assign needed data to serializable `@Property` fields; the adapter reflects those onto the host.

### [packages/libs/dota-ssr/src/ssr/request-handler.ts](../../../../../packages/libs/dota-ssr/src/ssr/request-handler.ts)

This file is the HTTP-to-render orchestration layer. It does not instantiate components itself. It matches a route, builds the context, asks an adapter to render the selector, fills the shell, and returns a buffered HTML response.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `matchRoute(routes, pathname)` | Checks routes in priority order. Splits by slash, ignores trailing slashes, compares literal segments, decodes :name values, and returns route plus params or undefined. This is deliberately smaller than the browser Router's full navigation system. |
| `createRequestHandler(options)` | Captures the fetch delegate once and returns the request function. Declines methods other than GET/HEAD and unknown paths. Creates fresh state, resolves relative string fetch inputs against the request URL, renders and loads the shell concurrently, then returns text/html. |
| `toNodeListener — forwarding export` | Exposes the Node HTTP bridge implemented in node-listener.ts; it is not another request-matching implementation. |

For `GET /tasks/42?tab=history`, the matcher uses pathname `/tasks/42`, while the full query remains on `context.url`. A component's own SEO wins over route SEO via `result.head ?? route.seo`; the objects are not field-by-field merged.

```js
import {
  createRequestHandler, createStringAdapter
} from '@ayu-sh-kr/dota-ssr/server';

// Evaluate decorated classes only after importing the server entry.
const {COMPONENTS} = await import('./components.js');
const handler = createRequestHandler({
  adapter: createStringAdapter({components: COMPONENTS}),
  routes: [{path: '/tasks/:id', page: 'task-page'}],
  template: '<html><head><!--dota-head--></head>' +
    '<body><!--dota-body--></body></html>'
});
const response = await handler(new Request('http://localhost/tasks/42'));
```

`undefined` means “this layer did not answer”; the host can serve an asset, API, or CSR shell. A thrown render error is different and propagates. HEAD still renders; Node suppresses the body when sending it.

### [packages/libs/dota-ssr/src/ssr/string-adapter.ts](../../../../../packages/libs/dota-ssr/src/ssr/string-adapter.ts)

This is the SSR component engine. It executes the same component `render()` methods used by the browser, but it explicitly performs a smaller server lifecycle. Normal connection hooks, DOM bindings, and browser event registration are not run.

The inputs are registered constructors plus the request's selector/context. The result contains the fully expanded page host, its reflected attributes, descendant HTML, optional markers, and the page's `seo`.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `createStringAdapter(options)` | Indexes constructors by __dotaSelector and rejects missing selectors. Captures maxDepth (default 32) and hydration (default true), then returns the string adapter. |
| `render(selector, context) — adapter method` | Creates the marked route host and render pass, enters a request browser scope, sets the shared server-render flag, renders the tree, renumbers scopes, and returns HTML plus page SEO. An active-render count keeps the flag true until overlapping renders finish. |
| `renderHost(host, pass, depth)` | Creates an instance, applies input attributes, clears stale identity, and checks client-only mode. Otherwise seeds typed properties, awaits serverLoad once, reflects properties, calls render, stamps structured identity, serializes, and expands descendants. It wraps shadow output in a declarative shadow-root template. |
| `expandHosts(markup, pass, depth)` | Finds registered non-overlapping hosts, renders siblings concurrently with Promise.all, and substitutes results into source-order slices. Each registered child owns expansion of its own rendered subtree. |
| `reflectProperties(instance)` | Reads Core property metadata and writes non-null values to attributes using each type's serializer. This is the transfer point between loaded server state and browser property seeding. |
| `renumberScopesInDocumentOrder(html)` | Maps provisional scope tokens to h0, h1, … by first appearance in finished markup. Concurrent sibling completion must not randomize document marker IDs. |
| `findHosts(markup, registry)` | Tokenizes markup to find registered top-level host spans and authored children. Ignores tag-like text inside comments/raw text/attributes/inert templates; traverses declarative shadow content and unregistered wrappers. |

The actual per-instance order is:

```text
construct → apply attributes → client-only check
  inherited: seed properties → await serverLoad → reflect properties
    → render → stamp identity → serialize → recursively expand children
  client-only: empty host + data-dota-csr
```

For shadow components, authored light children are expanded separately from shadow output. For a plain string result, HTML is still emitted, but it has no structured template identity to adopt. The route marker is independent.

Why not just call `connectedCallback()`? It would invoke DOM binding and browser lifecycle work that this minimal environment does not implement. Code needed for SSR HTML belongs in `serverLoad` or pure `render`; `@AfterInit` and connected listeners are not server data hooks.

Property serialization may be large: an object property can become a JSON attribute. Only transfer the data the first browser render actually needs. Fields without Property metadata and the context Map are not serialized automatically.

### [packages/libs/dota-core/src/core/elements/document-head.ts](../../../../../packages/libs/dota-core/src/core/elements/document-head.ts)

This is the shared SEO policy used by the browser updater and SSR serializer. `SeoHeadTag` describes title, meta, link, and managed JSON-LD tags without needing a DOM.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `seoHeadTags(seo)` | Returns the complete stable list in write order, including undefined values that mean a previously managed tag must be removed. |
| `seoHeadTagSelector(tag)` | Returns the browser selector identifying the managed title/meta/link/marked JSON-LD tag. The server uses equivalent identities when removing shell defaults. |
| `normalizeKeywords(keywords)` | Trims string/array keywords, removes blanks, and joins arrays into the meta content value. |
| `meta / link — local factories` | Build typed tag descriptions while keeping the policy list compact; they do not write elements. |

For example, removing `seo.canonical` on the next route must remove the previous route's canonical link, not leave stale metadata. `SEO_JSON_LD_ATTRIBUTE` marks the one framework-managed script so author-written scripts are not overwritten.

### [packages/libs/dota-core/src/core/elements/dota-page-element.ts](../../../../../packages/libs/dota-core/src/core/elements/dota-page-element.ts)

This is the browser/page lifecycle side of SEO. The string engine reads the same page `seo` getter and serializes it through its document writer.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `updateDocumentSEO(seo)` | Iterates the shared Core tag list and applies it to document.head. |
| `applyHeadTag(tag)` | Sets document.title, upserts/removes meta/link tags, and writes managed JSON-LD through textContent. Undefined values remove stale managed tags. |
| `DotaPageElement.handleBeforeInit() / updateSEO()` | Integrate SEO synchronization with normal page startup and expose explicit page metadata refresh. Request SSR does not need to invoke the full connection lifecycle to read seo. |

A page may derive SEO from values assigned by `serverLoad`; the adapter reads it after the load/render pass. When no page metadata exists, the request handler can use route-level SEO.

### [packages/libs/dota-ssr/src/ssr/document.ts](../../../../../packages/libs/dota-ssr/src/ssr/document.ts)

After the adapter has produced page HTML, this module inserts it into the actual document. It retains the shell's asset scripts/styles and unrelated hosts. The server shim's `document.head` is not the response document.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `prepareDocumentShell(template, rootSelector)` | Returns a shell with a head outlet before </head> and a body outlet inside the root component. Keeps already-authored outlets; tokenizes root spans; throws when the required head/root structure is absent. |
| `renderDocument(template, result)` | Removes matching framework-managed shell head tags when page metadata exists, then replaces head/body outlet comments using function replacers. Returns the full response string. |
| `renderHead(seo)` | Gets Core's ordered head-tag descriptions and serializes each one. The shared policy keeps browser and server SEO identities consistent. |
| `serializeHeadTag(tag)` | Writes escaped title/meta/link content. JSON-LD is JSON-stringified, escapes characters that could end the script or disrupt parsing, and receives the browser-managed marker. |
| `withoutManagedHeadTags(template, tags)` | Removes the shell defaults owned by the page tag list, avoiding duplicate descriptions, social tags, canonical URLs, or structured data. |
| `managedTagPattern(tag)` | Builds the correct search for title, meta name/property, link rel, or marked JSON-LD. Attribute quoting/order is accounted for. |
| `escape(value) — local regex helper` | Escapes metadata identity text before embedding it in a regular expression; this is not HTML escaping. |

With automatic app capture, a normal root shell is sufficient:

```html
<html>
  <head><title>Default title</title></head>
  <body>
    <app-root id="app-root"></app-root>
    <script type="module" src="/client.js"></script>
  </body>
</html>
```

`prepareDocumentShell(shell, 'app-root')` creates insertion points without executing the root's render method. The explicit request-handler example instead supplies `<!--dota-head-->` and `<!--dota-body-->` directly.

## 3. Follow the SSG build into static files

SSG is a second server execution path: normal application lifecycle inside Happy DOM. It shares template contracts and browser handoff with SSR, but does not call the string adapter. The functions below explain URL discovery, data readiness, isolation, and final disk writes.

### [packages/libs/dota-ssr/src/vite/index.ts](../../../../../packages/libs/dota-ssr/src/vite/index.ts)

This entry exposes both the SSG factory and the new SSR factory. The default export `dotaSsg(options)` is a build plugin; `dotaSsr` is a named export. They can run in one Vite application without sharing the same rendering algorithm.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `dotaSsg(options)` | Validates positive integer concurrency/timeouts and the worker-transfer restriction on settle callbacks. Returns the post-build SSG plugin with normalized concurrency/renderTimeout. |
| `apply(config, environment)` | Activates SSG only for build commands whose process arguments include --ssg. An options object by itself does not generate static pages. |
| `configResolved(resolvedConfig)` | Stores final root/output/config paths for the generation pass. |
| `closeBundle()` | Calls generateStaticPages once client assets and the client shell have been written. Errors fail the build instead of producing a misleading complete static output. |

The repository's `build:ssg` script is `tsc && vite build -- --ssg`. Plain `vite build` can still produce SSR output because the SSR plugin has different activation rules.

```ts
import {defineConfig} from 'vite';
import {dotaVitePlugins} from '@ayu-sh-kr/dota-wrap/vite';

export default defineConfig({
  oxc: {decorator: {legacy: true}},
  plugins: dotaVitePlugins({
    deployment: 'node',
    ssg: {
      autoDetectRoutes: true,
      routes: ['/tasks/42'],
      concurrency: 1
    }
  })
});
```

An explicit URL can be prerendered even when its declared route mode is SSR. On Node, that concrete static file then wins before the broader `/tasks/:id` SSR handler. This supports prebuilding a few stable URLs while rendering the remaining IDs per request.

### [packages/libs/dota-ssr/src/ssg/types.ts](../../../../../packages/libs/dota-ssr/src/ssg/types.ts)

This is the SSG data contract file; it contains interfaces/types rather than runtime functions.

- `DotaSsgRoute`/`DotaSsgRouteInput`: concrete pathname plus optional output, or a pathname shorthand.
- `ResolvedDotaSsgRoute`: validated pathname/output used for writing files.
- `DotaDecoratedRoute`: metadata-only path/mode/legacy-flag records from the preloader.
- `DotaSsgOptions`: discovery, explicit URLs, application entry, readiness export, settle barrier, timeouts, worker count, fetch base, and deployment options.
- `DotaSsgDeploymentOptions`/`DotaSsgVercelOptions`: static hosting-file configuration.

The optional `settle(window, route)` callback is another explicit readiness barrier. It is rejected with parallel workers because functions cannot be transferred as worker data. Await needed work in the application's readiness promise or use sequential mode.

### [packages/libs/dota-ssr/src/ssg/route-output.ts](../../../../../packages/libs/dota-ssr/src/ssg/route-output.ts)

Static generation needs a finite list of URLs and an unambiguous destination for each. This module validates those mappings before any page is written; it does not render components.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `resolveSsgRoutes(routes)` | Accepts pathname strings or {path, output} objects, normalizes/sorts paths, chooses directory-index outputs by default, and rejects duplicate paths/outputs, query/hash input, escaping paths, or non-HTML outputs. |
| `resolveDecoratedSsgRoutes(decoratedRoutes, routes)` | Selects discovered routes whose resolved mode is ssg, validates that discovered paths are concrete, and merges explicit entries. Explicit paths override the discovered output mapping for that same path. |

A dynamic declaration cannot tell the build which IDs exist. A discovered `mode: 'ssg'` route containing `:id` is rejected; pass concrete URLs explicitly instead.

```ts
resolveSsgRoutes([
  '/tasks/42',
  {path: '/about', output: 'pages/about.html'}
]);
// [
//   {path: '/about', output: 'pages/about.html'},
//   {path: '/tasks/42', output: 'tasks/42/index.html'}
// ]
```

The example is a call to the implementation function shown above; applications normally configure these values through the SSG options.

### [packages/libs/dota-ssr/src/ssg/generate.ts](../../../../../packages/libs/dota-ssr/src/ssg/generate.ts)

This is SSG's root coordinator, analogous to the request handler's orchestration role but running once during the build. It reads the completed client shell, resolves URLs, selects sequential/parallel execution, persists every result, and prepares static platform routing.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `generateStaticPages(config, options)` | Resolves root/output/template, creates a prerender server when discovery or sequential work needs it, chooses the route list, and bounds worker count by concurrency, CPU availability, and route count. Always closes any retained server in finally. |
| `writeRoute(route, html, timings, settled) — closure` | Creates destination directories once, awaits the actual HTML write, records stage/write timings, and warns when settling reached its limit. A failed write is not recorded as a completed route. |

Sequential mode shares the transformed-code, immutable-asset, and network caches across route renders. Each route still gets fresh evaluated modules and a new Happy DOM window. Parallel mode closes the discovery server and delegates to isolated workers, each with its own server/caches.

Once all writes complete, `prepareDeployment` writes static hosting rules. That order ensures a rewrite never points to an output the coordinator has not finished writing. No output URL selection means only optional deployment preparation is needed, not a fake rendering pass.

### [packages/libs/dota-ssr/src/vite/prerender-server.ts](../../../../../packages/libs/dota-ssr/src/vite/prerender-server.ts)

This creates the Vite environment used to execute a normal application for SSG. Vite's term “SSR module runner” here means server-side module evaluation; it does not mean this function calls the new string SSR engine.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `createPrerenderServer(config, root, entry, renderingModule, logType)` | Reloads the app transforms, creates a middleware-mode Vite server, resolves the shared Rendering entry, and installs a virtual SSG preamble. Closes the server if Rendering resolution fails. |
| `resolveId(id) — virtual-entry plugin` | Maps virtual:dota-ssg-entry to the plugin's internal resolved ID, leaving unrelated imports alone. |
| `load(id) — virtual-entry plugin` | Generates the preamble for that ID: configure logging, enable durable markers and the shared server-render flag, dynamically import the application, and export finishPrerender plus the application namespace. |
| `resolveDecoratedRoutes(server, routes)` | Loads virtual:dota-route-metadata, validates its array shape, and delegates discovery/explicit URL merging to resolveDecoratedSsgRoutes. |

The preamble intentionally **runs** `initializeApp` and exports its namespace. Unlike request SSR, it does not install the application capture hook. The normal app readiness promise must complete so page routing, component connection, and data-loading hooks can produce DOM.

The shared application-config loader removes SSG/SSR writers from this secondary Vite instance, preventing it from recursively generating another build.

### [packages/libs/dota-ssr/src/ssg/window-globals.ts](../../../../../packages/libs/dota-ssr/src/ssg/window-globals.ts)

SSG application modules expect browser globals during evaluation. This bridge temporarily redirects those names to a particular Happy DOM window rather than inventing another DOM implementation.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `installWindowGlobals(window)` | Snapshots existing property descriptors, skips non-configurable names, installs route-window APIs, and returns a restoration callback. Bound functions keep the correct window receiver. |
| `returned restore callback` | Replays captured descriptors in reverse order or deletes names that were originally absent. Restores getter/writability/configurability as well as values. |

This differs from request `runInBrowserScope`: it redirects configurable globals to an actual Happy DOM realm. Sequential route execution and worker isolation are important because these SSG globals are process-visible, not AsyncLocalStorage getters.

### [packages/libs/dota-ssr/src/ssg/prerender-runtime.ts](../../../../../packages/libs/dota-ssr/src/ssg/prerender-runtime.ts)

This file answers: “How does one selected URL become one static HTML document?” It owns the per-URL browser realm, application evaluation, readiness barrier, settle loop, route marking, serialization, and cleanup.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `prerenderRoute(server, template, route, outputDirectory, options, readAsset, networkCache)` | Creates a route window and fetch/global bridges, writes the shell, clears evaluated-module state, imports the SSG preamble, and awaits the configured readiness export. Settles DOM/fetch work, marks the page, serializes the full document, and returns HTML, timings, and settled status. |
| `createPrerenderWindow(path)` | Creates Happy DOM at a synthetic origin with that pathname. Disables automatic JavaScript/CSS/iframe resource loading and prevents runaway timer loops; controlled app evaluation supplies the code. |
| `resolveSsrRunner(server)` | Returns one cached module runner per Vite SSR environment. Requires a runnable environment, disables HMR/source-map interception, and supplies the compiled evaluator. |
| `CompiledModuleEvaluator.runInlinedModule(context, code)` | Caches a compiled async wrapper for transformed source, then invokes it against each route's fresh module context and seals exports. Code compilation is reused; route module state is not. |
| `settlePrerenderWindow(window, waitForFetches, timeout)` | Yields microtasks, waits for Happy DOM work, then waits for tracked fetch delivery. Repeats until no fetch work remains, or until the Node-clock deadline/25-pass cap is reached. Returns false when bounded waiting expires. |
| `markPrerenderedRoute(window, pathname)` | Finds the routed child host whose path matches the generated URL and stamps shared route markers. This allows initial browser routing to preserve even a page with legacy string output. |
| `closePrerenderWindow(window)` | Removes body children one at a time before closing Happy DOM. Disconnection hooks can remove sibling/portalled nodes, so teardown must not rely on a stale child-list length. |

The ordering is:

```text
fresh window → install globals/fetch → write shell
  → clear evaluated modules → import ordinary app
  → await applicationReady → settle DOM and tracked fetches
  → mark route → serialize document
  → stop fetch delivery → clear flags → close window → restore globals
```

The default readiness export is `applicationReady`; a missing/non-promise export is an error. Default settling is 30 seconds with at most 25 passes. A page that never becomes quiet can still be written with a warning; “build succeeded” alone is not proof every asynchronous article finished loading.

Cleanup is in nested `finally` blocks so failed rendering does not leave global objects or emission flags set for the next route.

### [packages/libs/dota-ssr/src/ssg/prerender-fetch.ts](../../../../../packages/libs/dota-ssr/src/ssg/prerender-fetch.ts)

This module makes build-time content loading predictable. A component fetching `/docs/topic.md` should read the built public asset, and SSG must wait until the resulting page handlers have had a chance to update DOM.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `installPrerenderFetch(window, staticRoot, fetchBaseUrl, readAsset, networkCache)` | Saves the window's fetch delegate, installs the tracked adapter, and returns a waiter with close(). A configured fetchBaseUrl is parsed as the API fallback URL. |
| `waitForFetches(deadline) — closure` | Waits for current delivery promises and any newly chained requests until the set is empty or the deadline is reached. Reports whether it waited so the outer settle loop knows more DOM work may exist. |
| `waiter.close()` | Marks the context closed. New/late requests are left unsettled rather than delivering callbacks against a disposed window or another route's globals. |
| `settlesBefore(promise, deadline)` | Races work against a timer based on Node performance.now(), clears the timer, and returns whether work finished before the deadline. The Node clock remains meaningful when window globals are installed. |
| `createPrerenderFetch(context)` | Returns a Happy DOM-compatible fetch wrapper. Tracks both success and failure delivery and preserves the original rejection for callers. |
| `deliver(settle) — inner closure` | Uses setImmediate to resolve/reject in a later task, removes its delivery from tracking, and releases the waiter after page handlers can be queued. This avoids an all-microtask fetch loop starving deadline timers. |
| `performPrerenderFetch(context, input, init)` | Passes cross-origin requests to the network delegate. For same-origin GET/HEAD, validates/decodes the path and reads built files; missing files can fall back to the API base. Returns 400 for malformed encoding, 404 for missing/escaping paths, or 405 for unsupported local methods without an API fallback. |

For a build window at `http://dota.ssg/tasks/42`:

```text
fetch('/docs/topic.md') → read <build output>/docs/topic.md
fetch('/api/tasks')    → missing asset → configured fetchBaseUrl, else 404
fetch('https://api.example.test/tasks') → network delegate
```

Readiness and fetch waiting are separate: component connection can start a request after initial registration. Once a response arrives, its handler can start another request. The delivery set and repeated settle loop cover this chain; arbitrary detached promises not attached to either barrier are not automatically awaited.

### [packages/libs/dota-ssr/src/ssg/asset-reader.ts](../../../../../packages/libs/dota-ssr/src/ssg/asset-reader.ts)

This owns a build-local byte cache, not a page/HTTP response cache. Reusing immutable public bytes avoids rereading the same Markdown/icons for every isolated route.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `createPrerenderAssetReader(outputs, maxBytes)` | Returns an async absolute-file reader. Shares in-flight reads, excludes generated route destinations, removes failed entries, caps entries at 256 and retained bytes at 32 MiB by default. A zero byte limit disables retention. |
| `returned reader(file, head)` | Returns {content, size}. Uncached HEAD uses stat and no body; cached bytes can provide length without a second read. Non-file paths fail as EISDIR so fetch policy can handle them. |

Generated HTML is excluded because it is being written during the same build and cannot be assumed immutable. Sharing bytes instead of window-specific Response objects prevents old route realms from being retained.

### [packages/libs/dota-ssr/src/ssg/network-cache.ts](../../../../../packages/libs/dota-ssr/src/ssg/network-cache.ts)

This shares eligible remote responses inside one SSG execution context. It is not the proposed deployment edge cache and does not cache request-time SSR page responses.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `createPrerenderNetworkCache(maxBytes)` | Returns a network wrapper with URL-keyed in-flight/result caching, at most 512 retained entries and 16 MiB of bodies by default. |
| `returned wrapper(window, networkFetch, input, init)` | Caches only plain GET calls without body/headers and without a Request object; other calls delegate directly. Saves response bytes/status/headers and reconstructs a fresh Response from the active route's constructor. |

HTTP error statuses can be cached just like successful responses, so routes in one build see the same answer. Rejections without a Response are removed. A fresh body copy and realm-specific Response avoid sharing consumed streams or objects tied to a disposed window. Parallel workers own separate caches.

### [packages/libs/dota-ssr/src/ssg/render-workers.ts](../../../../../packages/libs/dota-ssr/src/ssg/render-workers.ts)

This is the pool coordinator for parallel static pages. It transfers cloneable configuration and route jobs; it does not share a window or application instances across workers.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `renderRoutesInWorkers(routes, data, concurrency, timeout, write, workerFile)` | Starts a bounded pool, waits for ready/rendered/closed messages, assigns the next URL only after its output is written, and terminates all workers in finally. |
| `fail(error) — per-worker closure` | Rejects with route/startup/shutdown context and marks the pool failed so no more work is assigned. |
| `armTimeout() — per-worker closure` | Replaces the current startup/job/shutdown deadline and records the timer for cleanup. |
| `message handler` | Processes worker errors, awaits write(route, html, timings, settled), then sends another render job or close. A worker is not reused while its result is still being persisted. |

The coordinator's `write` callback is `generateStaticPages`'s writeRoute. Waiting for it bounds HTML buffering to roughly the worker count. Worker count is also limited by available CPUs; more workers are not free because each creates a Vite server and compiles/evaluates its own graph.

### [packages/libs/dota-ssr/src/ssg/render-worker.ts](../../../../../packages/libs/dota-ssr/src/ssg/render-worker.ts)

This is the executable `dota-ssr/worker` implementation. It is meant to run in a worker thread, not as a general application import.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `startWorker()` | Requires parentPort, reads RenderWorkerData, creates one asset/network cache and one prerender server, registers render/close message handling, and posts ready. Startup errors are reported to the parent and close the port. |
| `render message handler` | Runs prerenderRoute for the supplied URL and returns HTML, timings, and settled status. Errors are serialized as messages. |
| `close message handler` | Closes the worker's Vite server, posts closed, and closes the message port. |

One message is rendered at a time because the parent assigns work serially per worker. The worker reuses its server/caches, but prerenderRoute still creates a fresh window for every URL.

## 4. Understand the shared template and the separate server writer

The component's render method returns the same data structure in each environment. Here is how the new string writer plans that structure and emits markup compatible with the existing DOM renderer.

### [packages/libs/dota-rendering/src/template.ts](../../../../../packages/libs/dota-rendering/src/template.ts)

Existing supporting file. It defines the shared `html` template constructor, nested-template flattening, directive constructors/type guards, marker helpers for ordinary interpolation, and value-to-text conversion.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `html(strings, ...values)` | Returns shared TemplateResult data; flattens nested structural values and reuses a call-site plan when structure matches. |
| `appendFlattenedValue(value, flattened)` | Recursively merges nested static strings and dynamic leaves, recording the shape of each input. |
| `collectFlattenedValues(value, shape, values)` | Validates a cached shape and gathers current values; structural differences require rebuilding the plan. |
| `requiresStructuralFlattening(value), isUnsafeHtmlValue(value)` | Recognize nested templates, structural markup, and arrays that affect static structure. |
| `unsafeHTML(value), trustedHTML(value)` | Mark caller-trusted markup for structural composition or a dynamic child range respectively. Neither sanitizes untrusted input. |
| `keyed(items, getKey, renderItem)` | Creates key/template entries that the server serializes and the browser reconciles as bounded ranges. |
| `when(condition, truthy, falsy)` | Creates a conditional child directive; the default false branch is nothing. |
| `valueText(value)` | Makes null/undefined/nothing empty while preserving other values including 0 and false. |
| `isTemplateResult, isTrustedHtmlValue, isKeyedValue, isConditionalValue` | Discriminator guards shared by both output engines. |
| `isAttributePosition(source), valueMarkerFor(index), valueMarkerPattern` | Support template inspection and temporary parser tokens, distinct from the durable hydration addresses. |

### [packages/libs/dota-rendering/src/template-id.ts](../../../../../packages/libs/dota-rendering/src/template-id.ts)

Existing supporting file. It defines durable marker version 2, the host identity attribute names, `data-dh-a`, and `templateId`. Template identity hashes length-prefixed static segments so the same structure has the same ID across server and browser realms.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `templateId(strings)` | Caches a realm-independent FNV-style hash of length-prefixed static segments. Values do not affect structural identity, but segment lengths preserve interpolation boundaries. |

### [packages/libs/dota-rendering/src/main.ts](../../../../../packages/libs/dota-rendering/src/main.ts)

This is Rendering's existing root export surface for templates, types, diffing, renderer operations, template identity, and logging. The branch adds the shared hydration-marker exports.

### [packages/libs/dota-rendering/src/hydration-markers.ts](../../../../../packages/libs/dota-rendering/src/hydration-markers.ts)

SSR's string writer and SSG's DOM renderer must emit the same durable addresses for browser adoption. This module centralizes those addresses and the element/component/dynamic attribute names.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `hydrationScope(index)` | Returns h0, h1, … for a document host. The string adapter allocates provisional IDs before final document-order numbering. |
| `isHydrationScope(value)` | Accepts only h followed by digits; the browser rejects missing/malformed scope values. |
| `childPartMarkers(scope, index)` | Returns opening/closing comment data for one child interpolation, such as dh:h0:p1 and /dh:h0:p1. |
| `keyedEntryMarkers(scope, partIndex, position)` | Returns a keyed entry's paired range address within its parent child part. |
| `attributePartToken(scope, index)` | Returns the token stored in a dynamic element's data-dh-a list, for example h0:p0. |
| `hydrationIdentity(tagName, strings, scope)` | Returns host attributes for component tag, templateId, marker version, and scope. Both emitters use this rather than independently assembling identity. |

A simplified response fragment makes the ownership visible:

```html
<task-page data-dh-c="task-page" data-dh-t="template-hash"
           data-dh-v="2" data-dh-s="h0">
  <h1 data-dota-index="0" data-dota-dynamic="">
    Task <!--dh:h0:p0-->42<!--/dh:h0:p0-->
  </h1>
</task-page>
```

The template hash shown is illustrative. Nested components own separate scopes; the parent's adoption must not consume a child's part markers.

### [packages/libs/dota-rendering/src/server/index.ts](../../../../../packages/libs/dota-rendering/src/server/index.ts)

This is the public DOM-free Rendering output entry, exporting `serializeOutput`, `escapeHtml`, HTML tokenization/entity decoding, token types, and template/shadow-root element names.

It declares no rendering functions itself. It groups the serializer and its lexical dependencies with the package that already owns `TemplateResult`, directives, and hydration. The SSR adapter imports this supported surface; the browser continues to use the root Rendering entry.

### [packages/libs/dota-rendering/src/server/template-serializer.ts](../../../../../packages/libs/dota-rendering/src/server/template-serializer.ts)

This is a template-value interpreter, not a component runner. It receives an existing `RenderOutput` and writes HTML according to a cached plan. It neither chooses a route nor calls a component constructor or data hook.

Structured templates use the same directive guards and value-text policy as the browser. Plain strings keep the legacy raw-HTML contract; `nothing`/other non-string output becomes empty.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `serializeOutput(output, scope?)` | Dispatches a TemplateResult to serializeTemplate, passes a legacy string through, otherwise returns an empty string. Omitted scope produces plain HTML; a scope enables durable markers. |
| `escapeHtml(value)` | Escapes ampersand, angle brackets, and both quotes for text or quoted attribute contexts. Static authored HTML and explicitly trusted child markup are not passed through this dynamic-value escape. |
| `serializeTemplate(template, scope)` | Walks planTemplate(template.strings). Appends static/hydration-only operations, fills child/text slots, serializes quoted attributes, and writes attribute-part tokens. |
| `serializeChild(value, index, scope)` | Serializes the value and, when scoped, wraps it in paired child-part comments owned by that host. |
| `serializeChildContent(value, index, scope)` | Dispatches trusted markup, conditional templates, keyed lists, or ordinary escaped valueText. The conditional nothing sentinel produces no content. |
| `serializeKeyed(value, index, scope)` | Rejects duplicate keys, serializes entries in order, and wraps entries in position-based keyed ranges. The browser later associates those ranges with the client keys. |
| `serializeAttribute(value)` | Rejects trusted-HTML directives in attribute position and escapes ordinary valueText. This is distinct from writing raw child markup. |
| `serializeUnboundText(value, inRawText)` | Writes a text-only value. Raw-text content neutralizes closing-tag sequences; ordinary text contexts are escaped. These slots cannot carry adoptable comment ranges. |
| `wrapInMarkers(pair, content)` | Surrounds child/keyed content with start/end HTML comments; this makes the range discoverable after the browser parses the response. |

For a component whose render method returns:

```ts
import {html} from '@ayu-sh-kr/dota-rendering';
import {serializeOutput} from '@ayu-sh-kr/dota-rendering/server';

const view = (name: string) => html`<p title="${name}">Hello ${name}</p>`;
serializeOutput(view('<Ada>'));
// <p title="&lt;Ada&gt;">Hello &lt;Ada&gt;</p>
serializeOutput(view('<Ada>'), 'h0');
// Same visible content, plus element indexes, attribute tokens, and child ranges.
```

The adapter separately stamps the host identity. A template alone does not know which component tag owns it, so `serializeOutput` does not invent the host wrapper.

### [packages/libs/dota-rendering/src/server/template-plan.ts](../../../../../packages/libs/dota-rendering/src/server/template-plan.ts)

A template separates static strings from dynamic values. Before writing values, this module determines what each interpolation means in HTML. It caches the resulting operations by the static-string array so repeated renders avoid reparsing the same template shape.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `planTemplate(strings)` | Joins static segments with private placeholders, tokenizes once, dispatches tokens to TemplatePlanner, caches the finished operation list, and returns it. |
| `TemplatePlanner.constructor(source)` | Starts component boundary output and initializes open-element, inert-template, foreign-content, and element-index state. |
| `TemplatePlanner.startTag(token)` | Copies static attributes, turns quoted dynamic attributes into operations, adds indexes/part tokens, updates open-element state, and rejects dynamic names/unquoted values. |
| `TemplatePlanner.endTag(token)` | Closes matching open elements, adjusts inert/foreign depth, and explicitly closes any implied table body owned by the planner. |
| `TemplatePlanner.text(token)` | Splits placeholder positions. Ordinary content creates child operations and a dynamic-parent flag; raw text, RCDATA, and inert templates create unbound-text operations. |
| `TemplatePlanner.comment(token)` | Keeps comments as markup but writes interpolated comment content as unbound text, not adoptable child comments. |
| `TemplatePlanner.finish()` | Appends the component end boundary and returns the plan accumulated so far. |
| `TemplatePlanner.elementMarkers(name, dynamic)` | Allocates a document-order element index and optional component/dynamic attributes. Their indexes must match the browser's detached template parse. |
| `TemplatePlanner.openImpliedTbody()` | Writes/indexes a tbody when a tr is authored directly under table. The browser would insert that element, so omitting it would shift later indexes. |
| `TemplatePlanner.markDynamic(element)` | Adds the dynamic-parent flag once to a tracked element when it owns child interpolation. |
| `TemplatePlanner.pushStatic(html)` | Appends markup, merging adjacent static operations instead of creating many tiny steps. |
| `hasPlaceholder(value)` | Recognizes private planning placeholders in names/attributes so unsupported syntax can be rejected. |
| `splitPlaceholders(value)` | Returns alternating literal strings and numeric interpolation indexes for a source fragment. |

For `<p title="…">…</p>`, the planner must distinguish the first value as an attribute and the second as child content. Escaping and marker writing depend on that distinction. For `<textarea>…</textarea>`, a comment would become visible text, so durable child markers are not valid there.

This implements selected parser corrections, not the whole HTML tree-building standard. Write valid HTML and use the parity tests as evidence for supported constructs rather than assuming any browser-normalized malformed markup will adopt.

### [packages/libs/dota-rendering/src/server/html-tokenizer.ts](../../../../../packages/libs/dota-rendering/src/server/html-tokenizer.ts)

Both SSR host discovery and template planning need to read markup without treating every `<` as a tag. The tokenizer yields source-spanned start tags, end tags, text, and comments; attribute records include raw and decoded values.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `tokenizeHtml(source)` | Yields tokens covering the input. Tracks foreign-content context and keeps raw-text/RCDATA bodies together until the appropriate closing tag. |
| `decodeHtmlEntities(value)` | Decodes numeric references and the supported small named table; leaves unknown names unchanged. |
| `readMarkup(source, open)` | Classifies markup at a candidate opening angle bracket, including comments/declarations/end/start tags, or lets the caller treat it as text. |
| `readStartTag(source, open)` | Reads a start-tag name, ordered attributes, end position, and self-closing flag. Tokenizing preserves the source offsets needed for substitution. |
| `readAttribute(source, start)` | Reads one name and optional quoted/unquoted value, returning quote/rawValue/decoded value and source spans. |
| `scanName(source, from)` | Advances over a tag-name region using lexical terminators. |
| `skipWhitespace(source, from)` | Advances over HTML whitespace before the next name/value/delimiter. |
| `findRawTextEnd(source, name, from)` | Locates the correct raw-text closing tag using a cached tag-specific pattern; content inside is not rescanned as ordinary tags. |
| `isWhitespace(code), isAsciiLetter(code)` | Classify the ASCII syntax characters used by the scanner. |
| `isTagNameEnd(code), isAttributeNameEnd(code), isUnquotedValueEnd(code)` | Define context-specific terminators. Using one delimiter rule for all three contexts would misread valid attributes. |

For `<script>"<task-item>"</script>`, host discovery must not create a task-item component. Likewise, an angle bracket inside a quoted label must remain attribute data.

```ts
import {tokenizeHtml} from '@ayu-sh-kr/dota-rendering/server';

const tokens = [...tokenizeHtml('<task-item label="A &amp; B"></task-item>')];
// start tag: task-item, decoded label "A & B"; then matching end tag.
```

The output is tokens, not a browser-normalized DOM tree.

### [packages/libs/dota-rendering/src/server/html-elements.ts](../../../../../packages/libs/dota-rendering/src/server/html-elements.ts)

This file contains shared constants/sets rather than functions: void elements, raw-text/RCDATA elements, SVG/MathML roots, template/declarative-shadow names, and table/body/row names.

The sets tell the tokenizer when tag-like text is inert and tell the planner whether an element stays open, receives indexes, or needs a parser-inserted body. These syntax categories are Rendering concerns; request orchestration should not carry its own conflicting copy.

## 5. Connect builds and hosts to both paths

Build plugins produce the app/server artifacts; hosting policy chooses static files, SSR, or the client shell. Static redirect writers and server function writers have different responsibilities.

### [packages/libs/dota-wrap/src/vite/index.ts](../../../../../packages/libs/dota-wrap/src/vite/index.ts)

This factory composes the application build plugins. It does not select a page at request time. SSG is opt-in through an options object plus the SSG build flag; SSR integration is included unless explicitly disabled.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `dotaVitePlugins(options)` | Returns preloader, event-map, Web Types, optional SSG, default-enabled SSR, and extension plugins in that order. Propagates shared roots/logging and deployment settings while allowing nested overrides. |
| `ssgDeploymentTarget(ssg)` | Reads a string/object/legacy Vercel SSG deployment setting so SSR can use the same target when no common/SSR override was supplied. |

The SSR plugin defaults to Node when no target is selected. `{ssg: false, ssr: false}` removes both integrations, leaving ordinary client startup. These options enable infrastructure; actual route declarations determine which initial producer handles a page.

### [packages/libs/dota-wrap/src/ssg/index.ts](../../../../../packages/libs/dota-wrap/src/ssg/index.ts)

This is Wrapper forwarding and one small SSG adapter. It keeps consumers on `dota-wrap` imports while implementation remains in `dota-ssr`.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `dotaSsg(options)` | Calls the SSR package's SSG factory with renderingModule set to dota-wrap/rendering, then applies caller overrides. Returns the original Vite plugin. |

It also forwards `dotaSsr`, route utilities, and configuration/target types. There is no second SSR or SSG rendering algorithm here.

### [packages/libs/dota-ssr/src/vite/application-config.ts](../../../../../packages/libs/dota-ssr/src/vite/application-config.ts)

Both secondary build environments need the application's transforms without re-running the primary artifact writers.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `loadApplicationConfig(config, root, command)` | Re-reads the app Vite configuration, flattens nested/async plugin arrays, removes SSG/SSR plus event-map/Web Types writers, and returns remaining plugins separately from config settings. |

The excluded plugins would recursively trigger another server/prerender build or rewrite artifacts already generated by the client build. Keeping decorator transforms, aliases, and the component preloader is necessary so server and client evaluate compatible classes/templates.

### [packages/libs/dota-ssr/src/vite/ssr/types.ts](../../../../../packages/libs/dota-ssr/src/vite/ssr/types.ts)

Contains `DotaServerTarget`, `DotaSsrOptions`, and `ServerDeployment`. The options select the app entry, document template, hydration, output directory, logging, and Node/Vercel/Netlify/Cloudflare/GitHub target.

### [packages/libs/dota-ssr/src/vite/ssr/plugin.ts](../../../../../packages/libs/dota-ssr/src/vite/ssr/plugin.ts)

This file integrates the request engine into Vite development and production. The application declares `mode: 'ssr'`; the plugin supplies middleware or a deployable server rather than requiring a hand-maintained server entry.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `dotaSsr(options)` | Creates the plugin and its cached config, SSR-declaration signal, and original-shell state. |
| `configResolved(config)` | Stores final application build settings. |
| `transform(code, id)` | Checks application source for a literal mode: 'ssr' signal, excluding node_modules/dist. Returns null because it detects rather than rewriting source. |
| `writeBundle(options, bundle)` | Saves the original built index asset before SSG may overwrite index.html with a static home page. |
| `configureServer(server)` | Installs the development middleware below. |
| `closeBundle.handler()` | In a client production build with a detected signal and deployment enabled, builds the server bundle, reads its real SSR routes, and writes platform output. Skips recursive SSR builds and applications with no actual server routes. |
| `installDevMiddleware(server, options, logger)` | Accepts HTML GET/HEAD requests, lazily creates an application handler through Vite's module graph, and delegates with toNodeListener. Unmatched/static/non-HTML requests continue through Vite. |
| `invalidate(file) — watcher closure` | Clears the cached handler on source activity; after finding no SSR routes, only a change containing the mode signal triggers recapture. |
| `createHandler() — closure` | Loads the server API and app entry through Vite, captures the app, resolves real routes, and supplies a URL-specific transformIndexHtml shell. No routes means middleware can stay inactive. |
| `declaresServerRoutes() — closure` | Consults metadata for warning severity when capture fails. Incomplete metadata cannot safely prove all SSR absent. |

The production detector is a regular expression, not execution of arbitrary route expressions. A computed mode without a visible literal is not guaranteed to trigger server output. In development a failed capture disables SSR until the next change and is logged according to metadata; it is not a successful render with missing content.

A clean shell matters in mixed builds: returning an already-prerendered home document as every CSR fallback would show the wrong page before startup.

### [packages/libs/dota-ssr/src/vite/ssr/server-build.ts](../../../../../packages/libs/dota-ssr/src/vite/ssr/server-build.ts)

This generates an application server bundle, distinct from building the published SSR library. The library leaves workspace dependencies external; the deployable application bundle inlines them so it can be copied to a function directory.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `ownModule(entry)` | Resolves the SSR package's own server/Node ESM path internally. A Wrap-only app should not need a direct SSR dependency just to resolve generated imports. |
| `serverEntrySource(entryFile, target, hydration)` | Generates source exporting a lazy application handler, a serverRoutes reader, and the Node host export only for the Node target. |
| `buildServerBundle(config, root, options, target, template)` | Reuses filtered app configuration, defines entry/template virtual modules, embeds the clean shell, and builds one ESM server file. Node built-ins remain external; Cloudflare uses webworker targeting but still needs Node compatibility for scoping. |
| `virtual plugin resolveId / load` | Resolve the generated entry/template IDs and return server source or a JSON-escaped shell export. These modules belong to this build, not files the app maintains. |
| `readServerRoutes(bundleFile)` | Imports/evaluates the built application in a temporary worker and returns captured SSR path patterns. Isolates module globals from the build process and has a 30-second deadline. |
| `finish(error?, routes?) — closure` | Clears the route-read timer, terminates the worker, and resolves/rejects the route discovery promise. |

A simplified generated entry is:

```ts
import {createApplicationHandler, resolveServerRoutes}
  from '@ayu-sh-kr/dota-ssr/server';
// shell is supplied by the generated template virtual module.
export const handler = createApplicationHandler(
  () => import('/absolute/app/src/main.ts'),
  {template: shell, hydration: true}
);
export const serverRoutes = async () =>
  resolveServerRoutes(await handler.application()).map(route => route.path);
```

Reading routes loads declarations, not every page's `serverLoad`. Request-time data is loaded later when a matching request reaches the adapter.

### [packages/libs/dota-ssr/src/ssr/node.ts](../../../../../packages/libs/dota-ssr/src/ssr/node.ts)

Provides `dota-ssr/node`, exporting `createNodeServer` and `NodeServerOptions`. Consumers wanting a complete Node HTTP host use this entry; a custom Fetch-compatible host can call the lower-level request handler instead.

### [packages/libs/dota-ssr/src/ssr/node-listener.ts](../../../../../packages/libs/dota-ssr/src/ssr/node-listener.ts)

This bridges web-standard request handling to Node/Connect HTTP. It avoids importing Core so Vite configuration can load the bridge before server element setup.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `toNodeListener(handler)` | Returns an async listener that constructs Request from Node method/headers/URL, forwards it, sends response status/headers/buffered body, and suppresses the HEAD body. Undefined calls next or sends 404; exceptions call next(error) or send 500. |

The listener alone does not serve files or choose a SPA fallback; `createNodeServer` wraps it with that policy. A custom host can instead use the Request/Response handler directly.

### [packages/libs/dota-ssr/src/ssr/node-server.ts](../../../../../packages/libs/dota-ssr/src/ssr/node-server.ts)

This is where SSG, SSR, and CSR meet in an actual Node request. The host first looks for existing built files, then calls the request renderer, then serves the clean client shell when neither answered.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `createNodeServer(options)` | Resolves the client/fallback paths, creates a Node listener and http.Server, and returns it unstarted. Handles GET/HEAD file responses, SSR errors as 500, unmatched unsupported methods as 405, and malformed request processing as 400. |
| `isShell(file) — closure` | Identifies an unrendered root index identical to a separately preserved fallback shell. Skipping that file lets an SSR route at / run instead of being shadowed by an empty client index. |
| `findFile(root, pathname)` | Tries exact file, directory index, and .html form after validating the resolved path remains inside the client directory. |
| `sendFile(file, headOnly, response)` | Writes MIME type and streams file bytes, or sends headers only for HEAD. A read-stream failure destroys the response. |

For a hybrid task application:

```text
/tasks/42 → dist/tasks/42/index.html exists → static SSG response
/tasks/99 → no static file → /tasks/:id matches → request SSR response
/chat     → no static file, no SSR match → clean shell → CSR
```

An SSR exception is not the same as “no match”: it becomes an error response, not a successful shell fallback.

```js
import {createNodeServer} from '@ayu-sh-kr/dota-ssr/node';

// handler is a createRequestHandler/createApplicationHandler result.
createNodeServer({
  handler,
  clientDirectory: './dist',
  fallback: '../dist-server/shell.html'
}).listen(3000);
```

The generated startup supplies absolute paths. Static files winning first also means an explicitly prerendered SSR URL will not execute serverLoad again until its file is removed/rebuilt.

### [packages/libs/dota-ssr/src/vite/deployment/server.ts](../../../../../packages/libs/dota-ssr/src/vite/deployment/server.ts)

The server bundle is platform-neutral application output only within the current runtime requirements. This file writes the entry wrappers and routing files needed to invoke it on each target; it does not deploy the result.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `prepareServerDeployment(target, deployment, logger)` | Dispatches to Node/Vercel/Netlify/Cloudflare writers. GitHub Pages logs a static-only warning because it cannot execute request SSR. |
| `prepareNode(deployment, logger)` | Writes index.mjs, server.mjs, and clean shell.html. Startup calls createNodeServer using clientDirectory and fallback, reading PORT with a default of 3000. |
| `prepareVercel(deployment, logger)` | Copies a private server bundle, writes GET/HEAD API handlers, and prepends owned SSR rewrites ahead of authored SPA fallbacks. Carries the original pathname in __dota_path and restores it before rendering. |
| `prepareNetlify(deployment, logger)` | Writes a Functions API entry whose path configuration claims only SSR route patterns, leaving other content to static/client hosting. |
| `prepareCloudflarePages(deployment, logger)` | Writes an advanced worker falling back to env.ASSETS, routes configuration, and a missing Wrangler config with nodejs_compat. Warns if an existing config lacks required compatibility. |
| `basePrefix(base)` | Extracts the public deployment pathname without its trailing slash so generated patterns respect the Vite base. |
| `projectName(root)` | Reads package name or directory fallback and normalizes it into a worker-safe project name. |

Node and platform functions are different wrappers over the same handler. SSG artifacts are already files, not code that these wrappers must regenerate. Vercel's root index can take priority over an SSR `/` rewrite, and the writer warns about that limitation.

The Cloudflare bundle still uses Node-compatible async context; targeting `webworker` does not erase that dependency. Generated directories/files are overwritten on builds, so maintain the writer/configuration rather than manually editing emitted code.

### [packages/libs/dota-ssr/src/vite/deployment/index.ts](../../../../../packages/libs/dota-ssr/src/vite/deployment/index.ts)

This is the **static** hosting dispatcher invoked after SSG has finished writing documents. It is separate from server deployment because mapping a URL to HTML is different from invoking a function.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `prepareDeployment(root, outputDirectory, routes, options, base)` | Resolves explicit deployment or the legacy Vercel option, does nothing when disabled, and delegates to the appropriate static writer. Rejects unsupported targets. |

No target/legacy option means no static hosting preparation; it does not silently publish anything. The supplied route outputs have already been validated and written.

### [packages/libs/dota-ssr/src/vite/deployment/redirects.ts](../../../../../packages/libs/dota-ssr/src/vite/deployment/redirects.ts)

Netlify and Cloudflare static output use a generated ownership block in `_redirects` so future builds can update only Dota's rules.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `writeRedirects(outputDirectory, routes, base)` | Reads existing rules, removes complete owned blocks, rejects unmatched markers, validates concrete URLs, prepends status-200 mappings, and writes only when changed. Keeps all authored text outside the owned block. |

A status-200 rule serves a document without changing the visible page URL. It is not a server-rendering endpoint. Wildcard/parameter paths are rejected because this writer receives concrete SSG pages.

### [packages/libs/dota-ssr/src/vite/deployment/netlify.ts](../../../../../packages/libs/dota-ssr/src/vite/deployment/netlify.ts)

This is the thin Netlify static adapter.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `prepareNetlify(outputDirectory, routes, base)` | Calls writeRedirects for completed static page mappings. Request-time Netlify function generation is implemented separately in deployment/server.ts. |

### [packages/libs/dota-ssr/src/vite/deployment/cloudflare-pages.ts](../../../../../packages/libs/dota-ssr/src/vite/deployment/cloudflare-pages.ts)

This is the thin Cloudflare Pages static adapter.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `prepareCloudflarePages(outputDirectory, routes, base)` | Calls writeRedirects for completed static pages. It does not create the advanced worker; that belongs to the SSR deployment writer. |

### [packages/libs/dota-ssr/src/vite/deployment/github-pages.ts](../../../../../packages/libs/dota-ssr/src/vite/deployment/github-pages.ts)

GitHub Pages does not offer the rewrite/function capability expected by the other target writers.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `prepareGithubPages(outputDirectory, routes)` | Maps custom outputs to default directory-index aliases, checks conflicts before copying completed HTML, and writes .nojekyll. Does not remove stale files or add a SPA fallback. |

This makes SSG content reachable through static paths. It does not add request-time SSR to GitHub Pages.

### [packages/libs/dota-ssr/src/vite/vercel-config.ts](../../../../../packages/libs/dota-ssr/src/vite/vercel-config.ts)

SSG and SSR both need to preserve a project's authored Vercel configuration. This shared reader/parser plus the static redirect updater keep their ownership distinct.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `updateVercelConfig(root, routes, options)` | Reads/parses configuration, replaces generated static redirect sources with current mappings, preserves unrelated settings, and writes only when the serialized result changes. |
| `createVercelRedirects(routes)` | Returns redirect records for completed static outputs, avoiding self-mappings and handling route URL variants. |
| `readVercelConfigSource(root, configuredFile)` | Reads an explicitly selected config or searches ancestors for vercel.json; returns the filename and existing text for diagnostics/unchanged-write checks. |
| `parseVercelConfig(text, configFile)` | Parses JSON and requires an object, reporting the source filename on invalid input. |
| `hasVercelRedirectSource(value)` | Type-checks a redirect entry before reading its source while merging old/generated entries. |
| `outputUrl(output)` | Converts the relative HTML output mapping to the URL form used by generated redirects. |

The SSR writer uses the exported reader/parser, but writes `rewrites` to invoke the function. SSG's `redirects` and SSR's `rewrites` are different records and should not be described as the same serving operation.

## 6. Finish in the browser: CSR, route preservation, hydration

The document has now reached a browser. Route preservation prevents the initial page from being erased; structured hydration establishes part ownership; CSR mounts normally. Later updates and navigation use the ordinary client framework.

### [packages/libs/dota-ssr/src/route-marker.ts](../../../../../packages/libs/dota-ssr/src/route-marker.ts)

This owns the route-boundary contract: `data-dh-route`, `data-dh-route-version`, and route version 1. It is independent of template marker version 2.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `routeMarkerAttributes()` | Returns the route attribute record used by SSG's markPrerenderedRoute and SSR's top-level page host. The browser route wrapper reads it to decide whether its first page host can remain. |

A page can have a valid route marker even when its render output is a legacy string without structured template parts. That permits preserving the initial routed page; it does not grant part-by-part template adoption.

### [packages/libs/dota-ssr/src/index.ts](../../../../../packages/libs/dota-ssr/src/index.ts)

This is the browser hydration integration, used with either SSG or SSR output. It connects Core's initial-mount socket and Router's initial-presentation socket to Rendering's existing `hydrate`/`deferRender` operations.

**Important distinction:** ordinary marked component parts can be adopted immediately; the captured root/page boundary is initially deferred so the router does not erase server output. Its first later update can mount normally. “Kept server page” and “hydrated every page part” are not the same claim.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `dotaHydration(options)` | Creates a runtime plugin with warn/throw mismatch policy. It does not itself register custom elements; initializeApp runs setup before registration. |
| `setup(context)` | Installs the mount strategy, wraps route presentation, and captures the marked initial page while it still exists before upgrades. |
| `installMountStrategy(context, mismatch, getHandoff)` | Defers eligible captured root/page mounts. Otherwise mounts unmarked output normally, or validates template ID/version/scope before hydrate. Invalid host identity follows the selected mismatch policy. |
| `createHydrationRouteRenderer(next, root, mismatch, handoff)` | Retains the initial captured page only when selected component/path/markers agree. Other routes and later navigations delegate to next; a custom renderer remains authoritative. |
| `captureInitialRoute(root)` | Finds the root and its direct marked page child before registration, recording root/page/pathname and a captured lifecycle state. |
| `rootHasMarkedPage(root, match, context, handoff)` | Checks host identity/placement, route markers or the pinned legacy template version, normalized paths, and absence of a custom renderer. |
| `reportRouteMismatch(handoff, mismatch)` | Warns or throws when a captured route could not be adopted; custom render presentation is an intentional bypass rather than this error. |
| `normalizePath(path)` | Normalizes trailing slashes while preserving root /, so equivalent startup URLs do not manufacture a mismatch. |
| `hydrationMismatch(host, cause?)` | Creates a component-specific diagnostic and preserves the underlying marker/adoption failure as cause. |

The initial handoff state moves from captured to adopted, released, or invalid; it is not a reusable server-route cache for future navigations.

```ts
import {dotaHydration} from '@ayu-sh-kr/dota-wrap/ssr';
const plugins = [dotaHydration({mismatch: 'throw'})];
// Pass to initializeApp before registration; use warn for local remount recovery.
```

Missing markers preserve ordinary client mounting. Malformed/old identity is different from missing identity: it is reported. Rendering's warn-policy hydration can also recover from malformed part markers by remounting locally.

### [packages/libs/dota-core/src/core/helper/bootstrap.ts](../../../../../packages/libs/dota-core/src/core/helper/bootstrap.ts)

Existing supporting file. `bootstrap` registers component constructors by `__dotaSelector` with `customElements.define`, avoiding duplicate definitions. In a browser, registration can immediately upgrade existing server hosts.

### [packages/libs/dota-core/src/core/elements/render-strategy.ts](../../../../../packages/libs/dota-core/src/core/elements/render-strategy.ts)

Existing supporting file. It defines `MountStrategy`, the default browser mount, `setMountStrategy`, and `resolveMountStrategy`. Core owns the initial-mount extension point; SSR supplies an implementation through its runtime plugin.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `defaultMountStrategy(host, root, output)` | Delegates to ordinary Rendering.render; the default does not use host identity. |
| `setMountStrategy(strategy)` | Installs one application-wide initial-mount policy. A second claim throws instead of replacing hydration ownership. |
| `resolveMountStrategy()` | Returns the installed strategy or the default. BaseElement calls it for inherited components' initial mount. |

### [packages/libs/dota-core/src/core/elements/base-elements.ts](../../../../../packages/libs/dota-core/src/core/elements/base-elements.ts)

Existing supporting file. `BaseElement` implements component construction, connection/disconnection, property/event binding, initial rendering, and reactive updates. It connects the low-level renderer to Dota decorators and lifecycle events.

### [packages/libs/dota-router/src/coordinator/route-renderer.ts](../../../../../packages/libs/dota-router/src/coordinator/route-renderer.ts)

Existing supporting file. `createRouteRenderer`/`renderRoute` select the root outlet, apply route SEO, respect a custom renderer, and normally write the selected page tag with its path into the root.

### [packages/libs/dota-rendering/src/renderer.ts](../../../../../packages/libs/dota-rendering/src/renderer.ts)

This is the existing DOM engine used directly in CSR, in Happy DOM during SSG, and for browser adoption after SSR/SSG. The branch shares marker construction; it does not rewrite the renderer.

The public session object stays stable while its internal strategy changes between legacy strings and structured templates. The following map includes the internal functions that matter to producing and adopting the shared representation.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `render(root, output)` | Creates a new RenderSession and mounts output into the owned Element/ShadowRoot. This is Core's default client mount and SSG's marked DOM-writing path. |
| `hydrate(root, output, options)` | Creates a hydration-mode RenderSession over existing marked DOM. Strict failures throw; warn mode logs and mounts a fresh session. The integration must validate host template identity/version before calling it. |
| `deferRender(initialOutput, createSession)` | Returns a session doing no initial DOM work. Its output getter exposes the baseline; update creates a normal session on first mutation; dispose prevents further work and releases a created session. |
| `patch(instance, output), update(instance, output)` | Forward the next output to the retained session and return its mutation summary. They do not rerun serverLoad. |
| `setHydrationEmit(enabled)` | Controls durable marker emission for new mounts, enabled around the SSG pass and restored afterward. |
| `setHydrationMismatchPolicy(policy), warnHydrationMismatch(error)` | Provide default direct-call recovery policy and the diagnostic. An explicit per-call option wins. |
| `RenderSession.constructor / output / update / dispose` | Chooses string/template and mount/hydrate strategy, exposes current output, delegates compatible changes, switches strategies when output kind changes, and disposes owned nested resources. |
| `StringStrategy.constructor / update / dispose` | Handles legacy strings via HTML writes; it has no structured interpolation parts to adopt or patch. |
| `TemplateStrategy.constructor / update / dispose` | Mounts or adopts a structured template. Diffs later output, patches changed values for compatible structure, or disposes parts and remounts changed structure. |
| `TemplateStrategy.mount(output)` | Parses detached template DOM, finds parts, applies values, stamps/clears identity, and replaces the root's children. |
| `TemplateStrategy.adopt(output)` | Plans expected parts using a detached parse, then attaches them to live indexed elements and paired scope-owned comments. Fails if expected interpolation indexes are missing. |
| `TemplateStrategy.parseTemplate(output)` | Builds a detached template with unique interpolation placeholders and neutral attribute names so binding setup does not leak temporary values into custom elements. Rejects unquoted dynamic attributes. |
| `TemplateStrategy.findParts / findChildParts / indexElementsAndFindAttributeParts` | Discover placeholder text and attributes, index elements, allocate child boundaries, and record which values drive which live parts. |
| `TemplateStrategy.applyIndexes / applyAttribute / applyChild` | Apply only affected value indexes. Attribute writes follow planned quote/value semantics; children choose scalar text, trusted markup, conditional branches, or keyed lists. |
| `TemplateStrategy.applyKeyed` | Reuses/moves existing keyed entry ranges, mounts new keys, and removes absent keys while rejecting duplicates. |
| `TemplateStrategy.adoptChildRepresentation` | Reconstructs scalar text ownership or nested conditional/keyed sessions inside a marked child range, preserving nodes for subsequent compatible patches. |
| `TemplateStrategy.clearTrustedMarkup / clearBranch / clearKeyed / disposeParts` | Release the old child representation and nested sessions when value kind or structure changes. Avoid keeping sessions alive for nodes no longer owned. |
| `NativeRoot constructor / ownerDocument / replaceChildren / findDynamicElement / writeHTML / hydrationNodes` | Adapt an Element/ShadowRoot to renderer operations and traverse its owned representation. |
| `NativeRoot.stampHydrationIdentity / clearHydrationIdentity` | Stamp the component boundary with shared identity or remove stale identity when ordinary client output replaces it. |
| `RangeRoot constructor / ownerDocument / replaceChildren / findDynamicElement / writeHTML / clear / hydrationNodes` | Perform equivalent operations between two boundary nodes for conditional/keyed subtemplates. Its stampHydrationIdentity/clearHydrationIdentity are no-ops because it owns no component host. |
| `recordRenderPart / appendMarkerTokens` | Index a value's mutation targets and merge durable attribute tokens without dropping existing tokens. |
| `createHydrationScope / readHydrationScope` | Allocate scopes for marked DOM mounts or validate the server scope before adoption. |
| `parseHydrationChildStart / parseHydrationChildEnd / parseHydrationKeyedStart / parseHydrationKeyedEnd` | Recognize only the active scope's comment grammar; nested component markers are not adopted by the parent. |
| `collectDescendants / collectTopLevelHydrationElements` | Traverse eligible element/comment nodes and isolate the active template's top-level candidates. |
| `collectHydrationChildParts / collectHydrationKeyedRanges` | Pair durable boundaries, reject malformed/unclosed ranges, and preserve nesting needed for child sessions. |
| `nodesBetween / removeInclusiveRange / moveInclusiveRange` | Read or mutate bounded sibling ranges, enabling keyed movement without replacing the rest of the component. |

A same-call-site update can preserve server nodes:

```ts
import {html, hydrate, patch} from '@ayu-sh-kr/dota-rendering';

const view = (label: string) => html`<p>${label}</p>`;
// host already contains valid matching server markup; identity was checked.
const session = hydrate(host, view('Before'), {mismatch: 'throw'});
const original = host.querySelector('p');
patch(session, view('After'));
console.assert(host.querySelector('p') === original);
```

A changed template shape is allowed to replace DOM. The purpose of hydration is establishing correct part ownership, not promising every future change can preserve every node.

## 7. Reach the server-environment units

These are the low-level stand-ins used by request SSR. SSG uses Happy DOM instead. The APIs below are intentionally bounded, and those limits explain why the two server lifecycles are different.

### [packages/libs/dota-server-dom/src/index.ts](../../../../../packages/libs/dota-server-dom/src/index.ts)

Contains the extracted package's pure exports: node/element/document constructors, registry, attribute reflection, browser-object stand-ins, and the callable global installer.

### [packages/libs/dota-server-dom/src/install.ts](../../../../../packages/libs/dota-server-dom/src/install.ts)

The side-effect entry imports and immediately calls `installServerGlobals`. It lets an external consumer request module-time setup explicitly:

### [packages/libs/dota-server-dom/src/module-globals.ts](../../../../../packages/libs/dota-server-dom/src/module-globals.ts)

Component classes extend HTMLElement at module evaluation time. This installer supplies only that class base and a custom-element registry before any request begins.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `installMissingGlobal(name, value)` | Defines a configurable/writable global only when its current value is undefined. Preserves a real browser, Happy DOM, or host object. |
| `installServerGlobals()` | Calls the helper for HTMLElement and customElements. Repeated calls keep the first registry rather than resetting definitions. |

These objects remain process-wide. They are distinct from request document/location/storage, which belong to the Node scope below. The `/install` module calls this function explicitly; importing pure constructors does not.

### [packages/libs/dota-server-dom/src/node/index.ts](../../../../../packages/libs/dota-server-dom/src/node/index.ts)

Exports `runInBrowserScope` from the Node-specific entry. It is the supported API for code that needs request-backed browser globals across asynchronous work.

### [packages/libs/dota-server-dom/src/node/browser-scope.ts](../../../../../packages/libs/dota-server-dom/src/node/browser-scope.ts)

A server can render overlapping URLs. A single mutable global `location` would let one request read another's URL after an await. This module supplies request-selected getters backed by AsyncLocalStorage.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `runInBrowserScope(url, task)` | Creates a fresh scope, installs missing getters while any render is active, runs/awaits task inside the scope, and removes owned globals when the final overlapping render finishes. Returns the task result. |
| `createBrowserScope(url)` | Allocates linked location/document plus independent history, local/session storage, and window-event target for this request. |
| `installBrowserGlobals()` | Installs accessors for request objects and plain values for inert process APIs; records names it owns. Skips names already present on globalThis. |
| `removeBrowserGlobals()` | Deletes only recorded names and releases the out-of-render fallback scope. Does not delete host-provided globals. |

The scope's isolation guarantee applies to objects **it supplies**. A pre-existing runtime `localStorage` is preserved, even if that object is shared. This is observable and covered by preservation/isolation tests.

```ts
import {runInBrowserScope} from '@ayu-sh-kr/dota-server-dom/node';

const renderPath = (path: string) =>
  runInBrowserScope(new URL(path, 'http://localhost'), async () => {
    await Promise.resolve();
    return location.pathname;
  });

const paths = await Promise.all([renderPath('/slow'), renderPath('/fast')]);
// ['/slow', '/fast'] when the scope supplies location.
```

`window` refers to globalThis; document/location/history accessors resolve the active scope. Media queries do not match, viewport dimensions are placeholders, animation callbacks do not execute, and observers are inert. This supports pure/template/data work, not browser layout.

### [packages/libs/dota-server-dom/src/browser/browser-objects.ts](../../../../../packages/libs/dota-server-dom/src/browser/browser-objects.ts)

This file contains non-layout browser-shaped services created by the request scope. They allow shared component getters/data code to read familiar APIs without starting browser navigation, persistence, or observers.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `ServerLocation constructor / href / origin / protocol / host / hostname / port / pathname / search / hash` | Wrap a URL and expose its request-specific fields. ancestorOrigins is an empty stand-in; toString returns the URL representation. |
| `ServerLocation.assign / replace / reload` | Do not navigate or restart the server render. |
| `ServerHistory.pushState / replaceState / back / forward / go` | No-op navigation methods with placeholder history state; server code cannot drive a real browser transition. |
| `ServerStorage.length / key / getItem / setItem / removeItem / clear` | Implement an in-memory string store and key enumeration. The request scope allocates separate stores unless a host global is preserved. |
| `createUnmatchedMediaQuery(media)` | Returns a media-query-shaped object whose query text is retained and matches is false; its listener operations are inert. |
| `InertObserver constructor / observe / unobserve / disconnect / takeRecords` | Accept observer-style calls without scheduling callbacks; takeRecords returns no observations. |

A component using layout/media queries to decide essential HTML may render a different initial tree in a real browser. Keep essential SSR output based on request data and explicit properties, then use browser lifecycle work for visual effects.

### [packages/libs/dota-server-dom/src/dom/custom-element-registry.ts](../../../../../packages/libs/dota-server-dom/src/dom/custom-element-registry.ts)

Component modules can register themselves during evaluation, and element identity may need a constructor-to-tag lookup. This small registry supports those operations without browser tree upgrading.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `ServerCustomElementRegistry.define(name, constructor)` | Validates/stores the name and reverse constructor mapping; resolves pending whenDefined promises. Duplicate/invalid definitions throw. |
| `get(name) / getName(constructor)` | Return a registered constructor or its element name. |
| `whenDefined(name)` | Returns an already-resolved promise or a shared pending promise for that name. define resolves it when registration happens. |
| `upgrade(root)` | Intentionally does nothing. The string adapter constructs components explicitly; it does not ask a DOM parser to upgrade a document. |

### [packages/libs/dota-server-dom/src/dom/server-document.ts](../../../../../packages/libs/dota-server-dom/src/dom/server-document.ts)

This provides a document-shaped request object with html/head/body nodes and a linked Location. It is not the actual response shell parsed into a live DOM; the string document writer owns response assembly.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `ServerDocument.constructor(location)` | Creates documentElement/head/body links and retains the request location. |
| `nodeType / nodeName / ownerDocument` | Expose document identity; ownerDocument is null because a document has no owning document. |
| `title getter/setter / URL / documentURI / defaultView` | Keep simple title state and derive URL/view information from request/global objects. |
| `readyState / visibilityState / hidden / activeElement / hasFocus` | Provide stable server placeholders, not a browser lifecycle, focus, or visibility simulation. |
| `createElement(name) / createElementNS(namespace, name)` | Create stand-in elements; namespace creation does not implement a complete browser namespaced DOM. |
| `createTextNode(data) / createComment(data) / createDocumentFragment()` | Allocate server nodes used by shared code. |
| `querySelector / querySelectorAll / getElementById / getElementsByTagName / getElementsByClassName` | Return null/empty results instead of querying an HTML response tree. |

Appending SEO nodes here does not add them to the response. Assign page/route `seo` so `renderHead` writes them into the real shell.

### [packages/libs/dota-server-dom/src/dom/server-element.ts](../../../../../packages/libs/dota-server-dom/src/dom/server-element.ts)

This is the HTMLElement-like base that decorated component classes extend in a Node render. It supplies attributes and familiar reflection APIs without executing a browser component lifecycle.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `ServerElement.create(localName)` | Creates an ordinary stand-in element with an explicit tag name; used by document.createElement. |
| `nodeType / nodeName / localName / tagName` | Expose element identity. The name comes from the explicit name, registry lookup, or constructor __dotaSelector; tagName/nodeName use element casing conventions. |
| `id / className / classList / dataset / style` | Reflect convenience properties onto the underlying attribute store using the token/style/dataset adapters. |
| `attributes / getAttributeNames()` | Expose attribute records/names that the string adapter serializes after data loading. |
| `hasAttribute(name) / hasAttributes() / getAttribute(name)` | Read the stored attributes, including the normal null result for an absent name. |
| `setAttribute(name, value) / removeAttribute(name) / toggleAttribute(name, force)` | Maintain attribute strings and presence. These are data operations, not browser upgrade/connection processing. |
| `children / firstElementChild / shadowRoot` | Read the small node tree and optional attached shadow root. |
| `attachShadow(init)` | Creates one server shadow root; a second attachment throws. The SSR adapter later emits declarative shadow markup from component output. |
| `querySelector / querySelectorAll / getElementsByTagName / getElementsByClassName / closest / matches` | Return empty/null/false results: there is no parsed rendered-page tree to search. |
| `getBoundingClientRect / focus / blur / scrollIntoView` | Return zero layout information or do nothing; rendering must not depend on actual viewport/layout work here. |
| `ServerShadowRoot constructor / nodeType / nodeName` | Hold host/mode with fragment-like root identity. |
| `ServerShadowRoot.querySelector / querySelectorAll / getElementById` | Return empty results for the same reason as element queries. |

Example: setting `this.dataset.taskId = '42'` can affect the serialized host; searching `this.querySelector('h1')` cannot inspect the HTML returned by `render()`. Those are deliberately different capabilities.

### [packages/libs/dota-server-dom/src/dom/element-reflection.ts](../../../../../packages/libs/dota-server-dom/src/dom/element-reflection.ts)

These adapters make convenience APIs update the attributes the SSR adapter eventually emits. This is useful compatibility, independent of a full browser tree.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `ServerTokenList constructor / length / value / item / contains` | Wrap one attribute as a whitespace-token list. Reads parse the current stored value so direct attribute changes stay visible. |
| `ServerTokenList.add / remove / toggle / replace` | Mutate tokens and write one normalized attribute value. toggle supports the optional forced-presence argument. |
| `ServerTokenList.forEach / [Symbol.iterator] / toString` | Expose iteration/string behavior over the current token list. |
| `ServerTokenList.tokens / write` | Internal parsing/serialization boundary; write deduplicates/normalizes the underlying attribute. |
| `createDataset(host)` | Returns a proxy translating dataset property reads/writes/deletes/enumeration to data-* attributes. |
| `attributeOf / keyOf — dataset closures` | Convert camelCase property names to data-kebab-case names and back for proxy operations. |
| `ServerStyleDeclaration.constructor / create(host)` | Wrap an element's style attribute; create returns a proxy that also supports familiar style.propertyName access. |
| `cssText / length / item / getPropertyValue / getPropertyPriority` | Read serialized declarations, enumeration order, values, and important priority. |
| `setProperty(name, value, priority) / removeProperty(name)` | Update/remove CSS declarations, preserve requested priority, and rewrite the style attribute. removeProperty returns the removed value. |
| `declarations() / write(declarations)` | Parse the current style text into a declaration map and serialize updates back. |
| `cssPropertyName(key)` | Converts JS camelCase property access to CSS kebab-case while preserving custom-property names. |

For example, `element.style.backgroundColor = 'red'` becomes `style="background-color: red;"`, and `element.dataset.userId = '42'` becomes `data-user-id="42"`. The adapter reads the attributes, not proxy implementation details.

### [packages/libs/dota-server-dom/src/dom/server-node.ts](../../../../../packages/libs/dota-server-dom/src/dom/server-node.ts)

This is the minimal tree behind server elements/documents. It inherits the platform EventTarget, but there is no browser event propagation or layout. The tree supports shared component code; rendered HTML still comes from `render()`, not automatic tree serialization.

| Function or method | Inputs, result, and behaviour |
| --- | --- |
| `ServerNode nodeType / nodeName / isConnected / ownerDocument` | Base type/name are placeholders; subclasses override them. isConnected is always false. ownerDocument reads the current scoped document rather than retaining one from a previous request. |
| `parentNode / parentElement / childNodes / firstChild / lastChild / nextSibling / previousSibling` | Expose tree relationships; childNodes returns a copy so callers cannot mutate the tree by editing the returned array. |
| `textContent getter/setter` | Reads descendant text while excluding comments; assignment replaces children with text. |
| `hasChildNodes() / appendChild(node) / insertBefore(node, reference)` | Query children and implement insertion. insertBefore is the central mutation: fragments contribute their children, moves detach old parents, and cycles/invalid reference children throw. |
| `removeChild(node) / remove()` | Detach a particular child or the node itself and keep parent links consistent. |
| `append(...nodes) / prepend(...nodes) / replaceChildren(...nodes)` | Perform convenience mutations, converting string inputs into text nodes. |
| `contains(node) / getRootNode()` | Walk parent links for ancestry/root queries. |
| `ServerCharacterData constructor / nodeType / nodeName / textContent / length` | Represent text or comment nodes with data and the corresponding node type/name. Updating textContent updates their data. |
| `ServerDocumentFragment nodeType / nodeName` | Provide fragment identity used by the insertion logic. |
| `toServerNode(node)` | Returns an existing server node or converts a string into ServerCharacterData of text kind. |

## Appendix A. Runnable examples and correctness checks

Use the existing standalone playground or deployment fixture to run the concepts. Test descriptions identify the invariant being checked; they are not a claim that the whole workspace suite was freshly run for this document.

### [packages/libs/dota-core/test/core/elements/dota-page-element.test.ts](../../../../../packages/libs/dota-core/test/core/elements/dota-page-element.test.ts)

Adds checks for creating, updating, and removing the managed JSON-LD script. It verifies that unrelated application-authored JSON-LD remains in the document.

### [packages/libs/dota-rendering/test/server/html-tokenizer.test.ts](../../../../../packages/libs/dota-rendering/test/server/html-tokenizer.test.ts)

Checks how HTML is split into tokens and how attributes/entities are read. Cases include raw text, SVG/MathML, incomplete markup, and self-closing tags.

### [packages/libs/dota-rendering/test/server/template-parity.test.ts](../../../../../packages/libs/dota-rendering/test/server/template-parity.test.ts)

Contains markup normalization, a helper that mounts through the browser renderer with marker emission, and comparisons against `serializeOutput`. It uses Happy DOM as the browser parser side.

### [packages/libs/dota-rendering/test/server/template-serializer.test.ts](../../../../../packages/libs/dota-rendering/test/server/template-serializer.test.ts)

Checks escaping, directives, unsupported interpolation positions, duplicate keys, legacy strings, and durable marker output. These tests describe what the server serializer accepts and produces.

### [packages/libs/dota-server-dom/test/dom/server-element.test.ts](../../../../../packages/libs/dota-server-dom/test/dom/server-element.test.ts)

Checks the minimal element's attribute and property behavior, including class/style/dataset reflection and supported tree operations. It verifies the extracted stand-ins independently of SSR.

### [packages/libs/dota-server-dom/test/module-globals.test.ts](../../../../../packages/libs/dota-server-dom/test/module-globals.test.ts)

Contains isolated installer tests that remove test-created globals afterward. It verifies missing globals are supplied, repeated calls keep the same registry, and a host-provided `HTMLElement` is preserved.

### [packages/libs/dota-server-dom/test/node/browser-scope.test.ts](../../../../../packages/libs/dota-server-dom/test/node/browser-scope.test.ts)

Checks scoped globals, overlapping requests, cleanup, preservation of pre-existing globals, and registry behavior. It describes where request isolation applies and what the host continues to own.

### [packages/libs/dota-ssr/playground/light-dom/index.html](../../../../../packages/libs/dota-ssr/playground/light-dom/index.html)

Provides the small demo's HTML shell, with head/body insertion points, a little styling, and the browser entry script. The server inserts the rendered task page into it.

### [packages/libs/dota-ssr/playground/light-dom/server.mjs](../../../../../packages/libs/dota-ssr/playground/light-dom/server.mjs)

Contains a Node/Vite middleware demonstration, a small in-memory tasks API, explicit SSR page routes, and a shell loader. It imports the server API before loading decorated components and externalizes shared framework packages to avoid duplicate metadata stores.

### [packages/libs/dota-ssr/playground/light-dom/src/client.ts](../../../../../packages/libs/dota-ssr/playground/light-dom/src/client.ts)

Contains the standalone browser bootstrap. It installs `dotaHydration` through a context exposing Core's mount-strategy setter, then registers the same components used on the server.

### [packages/libs/dota-ssr/playground/light-dom/src/components.ts](../../../../../packages/libs/dota-ssr/playground/light-dom/src/components.ts)

Contains the standalone example's `Task` type, `TaskItemComponent`, `ClickCounterComponent`, `TasksPage`, and shared `COMPONENTS` list. The page fetches data in `serverLoad`; rows get typed attributes; conditional/keyed templates render lists; the counter binds a click handler.

### [packages/libs/dota-ssr/playground/light-dom/tsconfig.json](../../../../../packages/libs/dota-ssr/playground/light-dom/tsconfig.json)

Gives the playground its TypeScript settings, including legacy decorators and browser/Node types. It checks the demo components without emitting JavaScript.

### [packages/libs/dota-ssr/test/ssr/application.test.ts](../../../../../packages/libs/dota-ssr/test/ssr/application.test.ts)

Checks application capture, timeout/error handling, flattened SSR route selection, and handler reuse. It verifies that captured applications produce pages through the normal SSR pipeline.

### [packages/libs/dota-ssr/test/ssr/document.test.ts](../../../../../packages/libs/dota-ssr/test/ssr/document.test.ts)

Checks the document shell and head writer. It covers automatic insertion points, replacement of shell metadata, and JSON-LD output that cannot accidentally close its script element.

### [packages/libs/dota-ssr/test/ssr/head-parity.test.ts](../../../../../packages/libs/dota-ssr/test/ssr/head-parity.test.ts)

Contains head normalization and comparisons between SSR `renderHead` and Core's browser `updateDocumentSEO`. It checks the same SEO contract through both writers.

### [packages/libs/dota-ssr/test/ssr/hydration-parity.test.ts](../../../../../packages/libs/dota-ssr/test/ssr/hydration-parity.test.ts)

Contains server-context construction, inert HTML parsing, a direct `hydrateHost` helper, and adoption/update assertions using Rendering's real `hydrate` and `patch`.

### [packages/libs/dota-ssr/test/ssr/node-server.test.ts](../../../../../packages/libs/dota-ssr/test/ssr/node-server.test.ts)

Checks the complete Node host: static-file precedence, SSR routes, client fallback, rendering at `/`, file-path restrictions, and error/method responses.

### [packages/libs/dota-ssr/test/ssr/request-handler.test.ts](../../../../../packages/libs/dota-ssr/test/ssr/request-handler.test.ts)

Checks route matching, dynamic parameters, HTML response assembly, per-request state, relative fetches, and declined requests. It also exercises the Node listener through an actual HTTP server.

### [packages/libs/dota-ssr/test/ssr/string-adapter-fixtures.ts](../../../../../packages/libs/dota-ssr/test/ssr/string-adapter-fixtures.ts)

Contains example components used by the SSR tests: nested tasks, conditional/keyed content, shadow output, browser API probes, and client-only/render-mode cases. These fixtures make expected rendering behavior concrete.

### [packages/libs/dota-ssr/test/ssr/string-adapter.test.ts](../../../../../packages/libs/dota-ssr/test/ssr/string-adapter.test.ts)

Checks component construction, server data loading, property reflection, nested rendering, shadow output, and hydration markers. It also tests client-only behavior and request-specific browser globals.

### [packages/libs/dota-wrap/test/fixtures/ssr-app/.gitignore](../../../../../packages/libs/dota-wrap/test/fixtures/ssr-app/.gitignore)

Excludes output generated when deployment tests build the fixture, including server bundles, platform files, and local dependencies.

### [packages/libs/dota-wrap/test/fixtures/ssr-app/index.html](../../../../../packages/libs/dota-wrap/test/fixtures/ssr-app/index.html)

Provides the deployment fixture's document shell and application entry script. The server build uses this shell to test page insertion inside the root host.

### [packages/libs/dota-wrap/test/fixtures/ssr-app/src/main.ts](../../../../../packages/libs/dota-wrap/test/fixtures/ssr-app/src/main.ts)

Contains the complete fixture call to Wrap's `initializeApp`, including all components, root, fallbacks, and hydration plugin. It exports `applicationReady` with a chained `window.scrollTo`.

### [packages/libs/dota-wrap/test/fixtures/ssr-app/src/pages.ts](../../../../../packages/libs/dota-wrap/test/fixtures/ssr-app/src/pages.ts)

Contains the fixture root, SSR task page, CSR about page, home page, and error page. The task page uses `serverLoad(context)` to copy the route ID and scoped pathname into serializable properties; its title derives from that data.

### [packages/libs/dota-wrap/test/fixtures/ssr-app/vite.config.ts](../../../../../packages/libs/dota-wrap/test/fixtures/ssr-app/vite.config.ts)

Contains the fixture build configuration, decorator transform, deployment target from `DOTA_FIXTURE_TARGET`, and an alias to Wrap's built entries. It disables unrelated metadata writers.

### [packages/libs/dota-wrap/test/ssr-deployment.test.ts](../../../../../packages/libs/dota-wrap/test/ssr-deployment.test.ts)

Contains real fixture builds for Node, Vercel, Netlify, and Cloudflare Pages, with setup/cleanup for their generated files. It starts the Node output and checks SSR parameters, static assets, and CSR shell behavior; other cases inspect generated route/function/worker configuration.

### [packages/libs/dota-wrap/test/vite-composition.test.ts](../../../../../packages/libs/dota-wrap/test/vite-composition.test.ts)

Updates the expected plugin list to include SSR and checks that SSR can be disabled. It also keeps explicit extension-only composition covered.

## Appendix B. Brief consumer and generated-output references

These files consume or expose the framework. Their application UI is outside the implementation walkthrough, so each is summarized briefly while retaining the requested file-level inventory.

### [api/_dota-ssr/index.mjs](../../../../../api/_dota-ssr/index.mjs)

Generated application server bundle copied into Vercel's API directory. The function wrapper imports it to render requests; it is build output rather than source to maintain by hand.

### [api/dota-ssr.mjs](../../../../../api/dota-ssr.mjs)

Generated Vercel function wrapper for GET and HEAD. It restores the original page path from the rewrite query parameter and forwards the request to the bundled handler.

### [packages/apps/dota-web/CHANGELOG.md](../../../../../packages/apps/dota-web/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/apps/dota-web/dist-server/index.mjs](../../../../../packages/apps/dota-web/dist-server/index.mjs)

Generated application server bundle for local Node hosting. It contains the bundled request handler and application code; rebuild it from source rather than editing it directly.

### [packages/apps/dota-web/dist-server/server.mjs](../../../../../packages/apps/dota-web/dist-server/server.mjs)

Generated Node startup file. It loads the bundled handler, locates client assets and the fallback shell, and starts the HTTP host on the configured port.

### [packages/apps/dota-web/dist-server/shell.html](../../../../../packages/apps/dota-web/dist-server/shell.html)

Generated copy of the clean client document used as the SPA fallback. Keeping it separate prevents a prerendered home page from accidentally becoming every client route's shell.

### [packages/apps/dota-web/package.json](../../../../../packages/apps/dota-web/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/apps/dota-web/src/configs/docs.config.ts](../../../../../packages/apps/dota-web/src/configs/docs.config.ts)

Contains `DOCS`, `docUrl`, and `findDoc`, feeding docs navigation, titles, paging, and concrete SSG URLs. The Server Rendering group starts at `/docs/ssg-ssr-csr`, follows eight short lessons, and finishes with this reference at `/docs/ssr-file-reference`. The registry stays metadata-only because Vite config imports it.

### [packages/apps/dota-web/src/pages/blog-content.page.ts](../../../../../packages/apps/dota-web/src/pages/blog-content.page.ts)

Marks article URLs as SSR. Its `seo` getter and `render` produce request-aware metadata and a legacy string layout; `afterViewInit` is browser/Happy DOM lifecycle work. The nested article loader is not called by the string adapter, so the route mode alone does not guarantee Markdown content is in request HTML.

### [packages/apps/dota-web/src/pages/blog.page.ts](../../../../../packages/apps/dota-web/src/pages/blog.page.ts)

Changes the listing from legacy static-generation opt-in to request SSR. Contains `BlogPage.seo`, the scrolling `afterViewInit` hook, and the layout `render` method; no SSR engine functions are implemented here.

### [packages/apps/dota-web/src/pages/chat.page.ts](../../../../../packages/apps/dota-web/src/pages/chat.page.ts)

Marks the route CSR. Its constructor initializes service/state, `afterViewInit` restores browser-stored messages, and `render` composes the chat interface. Those page-specific details are independent of SSR orchestration.

### [packages/apps/dota-web/src/pages/community.page.ts](../../../../../packages/apps/dota-web/src/pages/community.page.ts)

Marks the route SSR. Contains a connected scroll handler and a string layout composing community sections; it illustrates registered child expansion, not browser animation execution on the server.

### [packages/apps/dota-web/src/pages/docs.page.ts](../../../../../packages/apps/dota-web/src/pages/docs.page.ts)

Contains `DocsRoutePage.seo`/`render` and concrete docs route classes. `/docs` opts into SSG; concrete `/docs/:slug` URLs are supplied by configuration. This demonstrates explicit static URL selection rather than automatic parameter expansion.

### [packages/apps/dota-web/src/pages/error.page.ts](../../../../../packages/apps/dota-web/src/pages/error.page.ts)

Keeps error rendering on the CSR route path. Contains path/message/status properties, `seo`, a connected scroll handler, and the error layout. Node SSR exceptions still return HTTP 500 rather than automatically invoking this page.

### [packages/apps/dota-web/src/pages/home/home.page.ts](../../../../../packages/apps/dota-web/src/pages/home/home.page.ts)

Uses `mode: 'ssg'` for the home route. `HomePage.seo`, `onConnected`, and `render` supply metadata, a scroll hook, and a composed landing-page template. It is a consumer of the engine, not where static generation is implemented.

### [packages/apps/dota-web/src/pages/resource.page.ts](../../../../../packages/apps/dota-web/src/pages/resource.page.ts)

Marks resources CSR. Contains the scroll `afterViewInit` and page-composition `render`; it adds no new server rendering logic.

### [packages/apps/dota-web/src/service/doc-loader.service.ts](../../../../../packages/apps/dota-web/src/service/doc-loader.service.ts)

Contains `loadDoc`, `loadResource`, and `loadBlog` over the shared REST client. `loadDoc` uses eager raw imports for the learning collection and this canonical reference, embeds trusted repository SVGs, and rewrites repository links for the website. Eager text avoids an unobserved asynchronous module import during SSG; inline vector geometry avoids development-only asset URLs. Diagram presentation uses attributes rather than SVG style elements, preserving the rest of the article through Happy DOM parsing. Other docs, resources, and blogs use public-file fetches.

### [packages/apps/dota-web/vite.config.ts](../../../../../packages/apps/dota-web/vite.config.ts)

Configures the consumer's shared target, SSG concrete URL list, and plugin composition. Benchmark switches alter the explicit prerender list; the SSR/SSG engines themselves remain in library packages.

### [packages/apps/dota-web/web-types.json](../../../../../packages/apps/dota-web/web-types.json)

Generated editor metadata. The branch updates source offsets after annotations moved; this file does not affect HTML production.

### [vercel.json](../../../../../vercel.json)

Adds SSR rewrites for the blog listing, blog articles, and community page before the SPA catch-all. Existing static redirects and asset-cache headers remain part of the hosting configuration.

## Appendix C. Packaging, release notes, and supporting documents

These remaining branch files explain publication/build setup, release-history differences, investigations, and illustrations. They are retained for completeness without placing release metadata in the main runtime explanation.

### [.changeset/automatic-ssr-deployment.md](../../../../../.changeset/automatic-ssr-deployment.md)

Release note for automatic development and production SSR in `dota-ssr`. It describes application capture, platform output, Node hosting, and document/SEO handling.

### [.changeset/automatic-ssr-wrap.md](../../../../../.changeset/automatic-ssr-wrap.md)

Release note for automatic SSR wiring through Wrap. It documents default Vite composition, deployment selection, opt-out, and server application capture.

### [.changeset/light-dom-string-ssr.md](../../../../../.changeset/light-dom-string-ssr.md)

Release note for the explicit string-rendering server API and standalone playground. It also explains render-mode handling in the adapter.

### [.changeset/render-mode-core.md](../../../../../.changeset/render-mode-core.md)

Release note describing Core's route/component render modes and server-render flag. Its presence relative to local `master` reflects release history as well as feature development; it does not mean all that Core behavior was newly written in this branch.

### [.changeset/render-mode-preloader.md](../../../../../.changeset/render-mode-preloader.md)

Release note describing render-mode extraction by the route scanner. The actual preloader source has no corresponding new change in this comparison.

### [.changeset/render-mode-router.md](../../../../../.changeset/render-mode-router.md)

Release note describing explicit route modes and compatibility with the old `ssr` flag. Router source is unchanged in this comparison; the note is part of the release-history differences.

### [.changeset/render-mode-ssr.md](../../../../../.changeset/render-mode-ssr.md)

Release note describing SSG route selection by resolved render mode. It distinguishes static generation from routes explicitly assigned SSR or CSR.

### [.changeset/rendering-server-entry.md](../../../../../.changeset/rendering-server-entry.md)

Contains the Rendering release entry for the new `/server` API. It documents template-to-string output, escaping, optional hydration markers, and exported lexical HTML support, plus the requirement that server and root share runtime values/types.

### [.changeset/seo-json-ld-core.md](../../../../../.changeset/seo-json-ld-core.md)

Release note for structured data in page SEO and the shared head-tag description. It explains browser updates and the common contract used by server output.

### [.changeset/server-dom-package.md](../../../../../.changeset/server-dom-package.md)

Contains the first release entry for `dota-server-dom`. It lists pure constructors, explicit installation, request scoping, preservation of existing globals, and the Node-compatible runtime requirement.

### [.changeset/shared-hydration-markers.md](../../../../../.changeset/shared-hydration-markers.md)

Release note for Rendering's public marker helpers and constants. These let other writers produce markup compatible with the existing hydration engine.

### [.changeset/ssr-shared-server-packages.md](../../../../../.changeset/ssr-shared-server-packages.md)

Contains the SSR compatibility release entry for consuming the extracted packages. It explains that existing server constructor, scoping, escaping, and serialization exports remain available as forwarding exports even though their implementation owners changed.

### [documentation/packages/libs/dota-ssr/architecture/branch-changes-guide.md](../../../../../documentation/packages/libs/dota-ssr/architecture/branch-changes-guide.md)

This canonical guide documents the runtime functions and execution paths, followed by a complete branch-file appendix. The docs loader renders this same file at /docs/ssg-ssr-csr, so there is one Markdown source to maintain.

### [documentation/packages/libs/dota-ssr/architecture/light-dom-string-rendering.md](../../../../../documentation/packages/libs/dota-ssr/architecture/light-dom-string-rendering.md)

Explains the string renderer's design, data-loading phase, component nesting, render modes, and limitations. It is the detailed implementation narrative for the SSR work.

### [documentation/packages/libs/dota-ssr/architecture/package-boundaries-and-execution.md](../../../../../documentation/packages/libs/dota-ssr/architecture/package-boundaries-and-execution.md)

Records the packaging assessment, published-package snapshot, template/hydration findings, and standalone/Wrap execution examples. Its recommendations were written before the subsequent extraction visible in this working tree, so read them as a dated review.

### [documentation/packages/libs/dota-ssr/architecture/source-layout.md](../../../../../documentation/packages/libs/dota-ssr/architecture/source-layout.md)

Maps the package's source folders and public entries. It explains the division between browser hydration, build tooling, SSG, and request-time rendering; folder references need to track package extractions.

### [documentation/packages/libs/dota-ssr/architecture/ssr-execution-flow.excalidraw](../../../../../documentation/packages/libs/dota-ssr/architecture/ssr-execution-flow.excalidraw)

Editable scene for the request execution illustration. It contains the boxes, labels, and connectors used to explain the two entry paths.

### [documentation/packages/libs/dota-ssr/architecture/ssr-execution-flow.svg](../../../../../documentation/packages/libs/dota-ssr/architecture/ssr-execution-flow.svg)

Viewable illustration showing explicit standalone inputs and Wrap capture converging on the same request/render/document pipeline.

### [documentation/packages/libs/dota-ssr/architecture/template-hydration-flow.excalidraw](../../../../../documentation/packages/libs/dota-ssr/architecture/template-hydration-flow.excalidraw)

Editable scene for the template/hydration illustration. Use it to adjust the diagram's layout or wording; its SVG companion must be updated separately.

### [documentation/packages/libs/dota-ssr/architecture/template-hydration-flow.svg](../../../../../documentation/packages/libs/dota-ssr/architecture/template-hydration-flow.svg)

Viewable illustration connecting shared templates to server serialization and the existing browser hydration/update engine.

### [documentation/packages/libs/dota-ssr/performance/render-mode-benchmark-2026-10-17.md](../../../../../documentation/packages/libs/dota-ssr/performance/render-mode-benchmark-2026-10-17.md)

Records measurements comparing mixed rendering, SSG, SSR, and CSR across three applications. It describes the benchmark setup, build costs, request performance, and browser loading observations.

### [documentation/packages/libs/dota-ssr/performance/ssr-request-render-benchmark-2026-10-15.md](../../../../../documentation/packages/libs/dota-ssr/performance/ssr-request-render-benchmark-2026-10-15.md)

Records earlier experiments with request-time rendering and bundling. Its statements about features not yet implemented describe the state at the time of that experiment.

### [documentation/packages/libs/dota-ssr/planning/buffered-ssr-and-edge-cache.md](../../../../../documentation/packages/libs/dota-ssr/planning/buffered-ssr-and-edge-cache.md)

Keeps the longer-term plan for buffered SSR and caching, with a link to the string-rendering implementation. Planned cache/lifecycle work should not be read as already shipped.

### [documentation/packages/libs/dota-ssr/planning/dom-free-component-rendering-analysis.md](../../../../../documentation/packages/libs/dota-ssr/planning/dom-free-component-rendering-analysis.md)

Contains the original investigation into rendering components without Happy DOM. It explains reusable framework pieces and missing capabilities before the later implementation existed.

### [packages/libs/dota-core/CHANGELOG.md](../../../../../packages/libs/dota-core/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/libs/dota-core/package.json](../../../../../packages/libs/dota-core/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/libs/dota-rendering/package.json](../../../../../packages/libs/dota-rendering/package.json)

Contains Rendering's package identity, dependencies, scripts, output files, and export map. The added `./server` map points ESM/CommonJS and TypeScript consumers to the new serialization entry.

### [packages/libs/dota-rendering/tsconfig.json](../../../../../packages/libs/dota-rendering/tsconfig.json)

Configures Rendering's source/test TypeScript checks. The addition maps the package's own root name to `src/main.ts`, so server source importing `@ayu-sh-kr/dota-rendering` checks against the current source contract rather than stale built declarations.

### [packages/libs/dota-rendering/vite.config.ts](../../../../../packages/libs/dota-rendering/vite.config.ts)

Builds root and server runtime entries in ESM and CommonJS. The server entry's package-name import of the root is externalized so it reuses the root runtime and identity values rather than bundling a second copy.

### [packages/libs/dota-rendering/vitest.config.ts](../../../../../packages/libs/dota-rendering/vitest.config.ts)

Runs Rendering tests in Happy DOM and sets source/test aliases. The added exact-match alias for the package root makes server and browser code use the same current root module in tests, including identity values and template types.

### [packages/libs/dota-router/CHANGELOG.md](../../../../../packages/libs/dota-router/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/libs/dota-router/package.json](../../../../../packages/libs/dota-router/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/libs/dota-runtime/CHANGELOG.md](../../../../../packages/libs/dota-runtime/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/libs/dota-runtime/package.json](../../../../../packages/libs/dota-runtime/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/libs/dota-server-dom/README.md](../../../../../packages/libs/dota-server-dom/README.md)

Contains the public explanation, installation command, entry-point table, and usage example for the extracted server DOM package. It explains how to install module-time globals before importing component classes and how to run work inside a request scope.

### [packages/libs/dota-server-dom/package.json](../../../../../packages/libs/dota-server-dom/package.json)

Defines the new `@ayu-sh-kr/dota-server-dom` workspace package, its initial version, publication files, commands, Node engine requirement, and three public entries.

### [packages/libs/dota-server-dom/tsconfig.json](../../../../../packages/libs/dota-server-dom/tsconfig.json)

Configures strict TypeScript checks for source, tests, and package configuration. DOM types describe browser-shaped APIs while Node types cover request scoping.

### [packages/libs/dota-server-dom/vite.config.ts](../../../../../packages/libs/dota-server-dom/vite.config.ts)

Builds the pure, install, and Node entries separately and emits their type declarations. Keeping installation as an explicit entry preserves its required evaluation order.

### [packages/libs/dota-server-dom/vitest.config.ts](../../../../../packages/libs/dota-server-dom/vitest.config.ts)

Runs the package's tests in a Node environment and defines local source/test aliases and coverage settings.

### [packages/libs/dota-ssr/CHANGELOG.md](../../../../../packages/libs/dota-ssr/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/libs/dota-ssr/README.md](../../../../../packages/libs/dota-ssr/README.md)

Contains SSR's public introduction and usage documentation. The branch adds request-time string-rendering examples, the explicit server entry, `serverLoad` guidance, render-mode behavior, and the playground command.

### [packages/libs/dota-ssr/package.json](../../../../../packages/libs/dota-ssr/package.json)

Contains SSR's dependencies, build/test/playground scripts, and public root/Vite/worker/server/Node entries. The branch adds the `/server` and `/node` output maps, playground command, and workspace dependency on `dota-server-dom`.

### `packages/libs/dota-ssr/src/ssr/.gitkeep` (deleted)

Deleted placeholder. The SSR directory now contains implementation files, so it no longer needs an empty file to keep the directory in Git.

### [packages/libs/dota-ssr/tsconfig.json](../../../../../packages/libs/dota-ssr/tsconfig.json)

Enables legacy TypeScript decorators so the package can type-check the decorated components used in its SSR fixtures.

### [packages/libs/dota-ssr/vite.config.ts](../../../../../packages/libs/dota-ssr/vite.config.ts)

Builds the browser root, Vite entry, SSG worker, SSR server entry, Node host entry, and local server-global setup chunk. It emits ESM/CommonJS plus declarations.

### [packages/libs/dota-wrap/CHANGELOG.md](../../../../../packages/libs/dota-wrap/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/libs/dota-wrap/package.json](../../../../../packages/libs/dota-wrap/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/libs/dota-wrap/vitest.config.ts](../../../../../packages/libs/dota-wrap/vitest.config.ts)

Excludes fixture source files from direct test discovery. The fixture is built by the deployment test instead of being treated as a collection of test modules.

### [packages/plugins/dota-vite-preloader/CHANGELOG.md](../../../../../packages/plugins/dota-vite-preloader/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/plugins/dota-vite-preloader/package.json](../../../../../packages/plugins/dota-vite-preloader/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/plugins/web-type-json/CHANGELOG.md](../../../../../packages/plugins/web-type-json/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/plugins/web-type-json/package.json](../../../../../packages/plugins/web-type-json/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/ui/dota-md/CHANGELOG.md](../../../../../packages/ui/dota-md/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/ui/dota-md/package.json](../../../../../packages/ui/dota-md/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [packages/ui/dota-ui/CHANGELOG.md](../../../../../packages/ui/dota-ui/CHANGELOG.md)

Contains the package's released-change history. Relative to local `master`, this checkout lacks a newer release entry; this is a release-history difference, not an SSR implementation change in this file.

### [packages/ui/dota-ui/package.json](../../../../../packages/ui/dota-ui/package.json)

Contains package identity, version, dependencies, scripts, and public entry configuration. In this comparison its change is the version value relative to local `master`; it does not add runtime behavior or a new public entry.

### [pnpm-lock.yaml](../../../../../pnpm-lock.yaml)

Records workspace dependency resolution, including the new server DOM package's tooling. It keeps installations reproducible as package boundaries change.


## Appendix D. Learning collection and docs integration

These files provide the beginner reading path and its presentation. They do not add another SSR engine. The SVGs are canonical package documentation assets, embedded by the docs loader without duplicating them into public content. Their title/description, responsive viewBox, semantic-color fallbacks, and arrow legend keep them accessible and usable both standalone and in Dota Web.

### [packages/apps/dota-web/src/components/docs/docs-view.component.ts](../../../../../packages/apps/dota-web/src/components/docs/docs-view.component.ts)

Composes the docs shell, grouped navigation, Markdown view, loading state, TOC, and previous/next links. `loadDoc()` skips an already prerendered article; `doc` selects metadata; `renderNav()`, `renderSkeleton()`, `renderNotFound()`, `renderPager()`, and `render()` build their named regions. Both navigation scroll areas opt into the hidden-scrollbar utility without disabling overflow; the left navigation remains keyboard-focusable.

### [packages/apps/dota-web/src/style.css](../../../../../packages/apps/dota-web/src/style.css)

Imports the shared theme and component styles, then defines app utilities. The `no-scrollbar` utility now also covers descendant `overflow-y-auto` containers, because the Markdown TOC has both an outer aside and an inner scroll container. It hides the scrollbar chrome with Firefox/Chromium-compatible rules while preserving scrolling.

### [packages/apps/dota-web/test/components/docs/docs-view.component.test.ts](../../../../../packages/apps/dota-web/test/components/docs/docs-view.component.test.ts)

Exercises active navigation, neighboring pages, loading/publishing Markdown, reuse of prerendered content, unknown slugs, and the hidden-scrollbar hooks. Its `mount()` helper connects a real docs component and waits for asynchronous initialization.

### [packages/apps/dota-web/test/service/doc-loader.service.test.ts](../../../../../packages/apps/dota-web/test/service/doc-loader.service.test.ts)

Tests local collection loading, the full reference, repository-link rewriting, registered lesson links, accessible SVG embedding, and preservation of the content after a diagram in the SSG DOM. Also verifies the ordered registry and public document/resource/blog requests, including fetch failure propagation.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssg-ssr-csr.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssg-ssr-csr.md)

The collection entry point at `/docs/ssg-ssr-csr`. Contains the reading order, estimated reading times, the three producer timelines, key distinctions, and the link to this implementation reference.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-html-first.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-html-first.md)

Lesson 1 builds the request/response model from scratch. Contains HTTP/HTML examples, CSR/SSR/SSG comparisons, route-mode syntax, a comprehension check, and the distinction between HTML delivery and interactivity.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-component.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-component.md)

Lesson 2 presents the complete task page used throughout the course. Explains decorators, typed properties, server versus browser initialization, transfer through attributes, syntax symbols, and an optional API-loading method.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-request.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-request.md)

Lesson 3 follows a matched request through capture, matching, fresh context, fresh instances, recursive rendering, SEO, document outlets, and a buffered response. Links the orchestrating functions in execution order.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-templates.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-templates.md)

Lesson 4 separates the shared template contract from the server writer and browser renderer. Contains escaping examples, tokenizer/plan explanations, a marker legend, version boundaries, and raw-HTML safety notes.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-static-build.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-static-build.md)

Lesson 5 follows concrete URLs through build-time Happy DOM execution. Contains route configuration, readiness/settling examples, API-base guidance, output mappings, worker/cache boundaries, cleanup behavior, and the existing build command.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-hydration.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-hydration.md)

Lesson 6 explains registration order, mounting, adoption, and deferred root/page rendering separately. Contains plugin setup, a client-only before/after HTML example, browser event/update code, and mismatch recovery. It replaces ambiguous “empty handoff” language with an explicit empty host and its later contents.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-hosting.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-hosting.md)

Lesson 7 compares Wrap composition with direct standalone request-handler setup. Contains build/start commands, Node static-first selection, mixed SSG/SSR/CSR examples, response failure boundaries, and platform-specific deployment notes.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssr-package-map.md](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssr-package-map.md)

Lesson 8 maps responsibilities across Wrap, SSR, Rendering, Core, Router, Runtime, and Server DOM. Contains the minimal-environment contract, asynchronous request isolation, release-status cautions, debugging checkpoints, and the complete end-to-end recap.

### [documentation/packages/libs/dota-ssr/architecture/learning/rendering-modes.svg](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/rendering-modes.svg)

The three-timeline illustration reused by the overview and first lesson. Shows when CSR, SSR, and SSG produce page content; its arrows show ordered work rather than elapsed durations.

### [documentation/packages/libs/dota-ssr/architecture/learning/request-flow.svg](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/request-flow.svg)

The matched-request spine. Separates cached declaration capture from per-request matching, fresh hosts, document composition, and the final HTML response.

### [documentation/packages/libs/dota-ssr/architecture/learning/ssg-flow.svg](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/ssg-flow.svg)

The static-build spine. Shows concrete route selection, a fresh Happy DOM window, ordinary app startup, readiness/settling, and file output.

### [documentation/packages/libs/dota-ssr/architecture/learning/browser-flow.svg](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/browser-flow.svg)

The browser-startup branch illustration. Distinguishes deferred initial root/page output, compatible host adoption, normal/client-only mounting, and invalid-marker recovery. The caption explicitly says these are branches, not sequential steps.

### [documentation/packages/libs/dota-ssr/architecture/learning/hosting-flow.svg](../../../../../documentation/packages/libs/dota-ssr/architecture/learning/hosting-flow.svg)

The successful Node page-selection flow. Shows static-file precedence, then SSR, then the CSR shell, with labeled yes/no branches. Failure statuses remain explained in the accompanying lesson.
