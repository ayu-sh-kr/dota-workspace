# 8. Packages and server limits

**Question:** now that the flow makes sense, which package owns each piece, and what is safe to run on the server?

**You will learn:** the responsibility boundaries, the difference between a minimal server DOM and Happy DOM, request isolation, and a practical debugging sequence.

## Read the stack from the application downward

```text
Your application
  dota-wrap          consumer imports, initializeApp, Vite composition
    dota-ssr         SSR requests, SSG builds, hydration integration, hosting
      dota-core      components, properties, lifecycle, render-mode policy, SEO
      dota-router    browser navigation and route presentation
      dota-rendering shared html contract, DOM rendering, server serializer
      dota-server-dom minimal server element/document and request scopes
    dota-runtime     type contracts for runtime plugin integration
```

This is a responsibility map, not a complete npm dependency graph. In particular, browser code and server-only entry points must stay separate.

| Part | Why it belongs there | Main functions or contracts |
| --- | --- | --- |
| Wrap | Applications configure one facade rather than coordinating internals themselves. | `initializeApp`, `dotaVitePlugins`, wrapped `dotaSsg`. |
| SSR | Coordinates when rendering happens and connects the result to requests, files, and browser startup. | `captureApplication`, `createApplicationHandler`, `createRequestHandler`, `createStringAdapter`, `prerenderRoute`, `dotaHydration`. |
| Rendering | Server and browser must agree on template shape and marker meaning. | `html`, `serializeOutput`, `templateId`, `render`, `hydrate`, `deferRender`. |
| Core | Property and SEO semantics should not diverge between browser and server. | `PropertyUtils.seedInitialValues`, `seoHeadTags`, `BaseElement`, render-mode resolvers. |
| Server DOM | Components need a minimal element base and request environment without a full browser per request. | `ServerElement`, `ServerDocument`, `installServerGlobals`, `runInBrowserScope`. |
| Runtime | Defines plugin sockets without owning a renderer or starting an app. | `DotaRuntimePlugin`, `DotaRuntimeContext`, `RouteRendererWrapper`. |

SSR remains in the same `dota-ssr` package. The server template writer is grouped with the already-existing Rendering package. The new server-DOM package groups the related element/document/attribute/reflection/scope implementation instead of making each helper its own package. Hydration integration and hosting do not need separate packages merely because they run at different moments; explicit entry points isolate those responsibilities.

> **Source status is not release status.** This collection documents the current branch. A package directory, version field, or export declaration does not prove that code has been published to npm. `dota-server-dom` is a new workspace package in this branch; do not assume it is already available from a released registry version. See the [file reference's packaging and changeset section](/docs/ssr-file-reference#appendix-c-packaging-release-notes-and-supporting-documents) for the branch changes.

## String SSR uses a deliberately small environment

Core component classes extend `HTMLElement`. Node does not supply that browser class, so the server entry installs minimal stand-ins before component modules load. The implementation supports the construction and reflection needed to render strings; it does not try to be a complete browser.

| You can use for request rendering | You must not assume |
| --- | --- |
| Attributes, class/style/dataset reflection, small element trees | Real selector queries, layout, painting, focus behavior, or connected elements |
| A document/location representing the request | That writing `document.head` produces response SEO |
| Request-local storage and event-target surfaces | Real navigation, bubbling, animation frames, or observer notifications |
| Explicit `serverLoad` and pure `render` | Browser `connected`/`AfterInit` handlers executing in string SSR |

Selector queries return empty results in this minimal environment; measurements are zero, navigation/history are inert, and animation/observer APIs do not behave like a running browser. A library that calls these APIs may import successfully and still not produce meaningful server content.

The server registry records definitions and `whenDefined` promises; it does not upgrade existing elements like the browser registry. The string adapter creates registered components explicitly. Shadow components can emit declarative shadow-root markup rather than relying on a live browser to attach a shadow tree.

## Why requests do not all see the same URL

`runInBrowserScope` uses Node's **AsyncLocalStorage**, which keeps a value associated with one asynchronous execution chain, including work resumed after `await`.

```text
Request A → /tasks/42 → scope A document/location/storage
Request B → /tasks/99 → scope B document/location/storage

Awaiting A's data must not make A observe B's location.
```

The package exposes scope-aware getters for globals it owns. Existing globals supplied by the host are preserved; that preservation is not a guarantee that those foreign globals become request-isolated. Keep real server state in the explicit context when possible, and do not install a shared third-party browser realm and assume it has become per-request.

SSG takes a different isolation approach: install a fresh Happy DOM realm, run one route within it, then restore globals. Parallel routes use workers rather than sharing one mutable global window concurrently.

`Symbol.for(...)` in shared flags/hooks means “find the same symbol by this registry key,” allowing cooperating module copies to agree on that slot. It is not itself request isolation. A `WeakMap` cache keyed by template strings likewise caches reusable template analysis, not visitor state.

## Debug in execution order

| Symptom | Check this boundary first |
| --- | --- |
| Expected SSR but received only a shell | Explicit route mode, selected host, SSR plugin output, and whether the handler matched the URL. |
| Old data after a fresh request | A static SSG file may be winning before SSR; distinguish build caches from deployed content. |
| SSR has data, SSG does not | Only `serverLoad` may be implemented; inspect normal startup, API base, readiness, and settling warnings. |
| Content disappears on browser startup | Hydration setup order, initial route path/placement, matching HTML/JS deployment, and mismatch warnings. |
| Widget is empty in initial HTML | Check for component `mode: 'csr'`; an empty marked host is intentional. |
| Text is visible but a click does nothing | Verify browser registration, loaded assets, binding selectors, and connection errors—not just server HTML. |
| Browser and server titles differ | Compare loaded properties, page/route SEO, and when browser SEO is refreshed. |

## Put the whole story together

For `/tasks/42`, a build may have saved a static page. If so, the host serves it. Otherwise an SSR route captures declarations as needed, matches the URL, constructs fresh components, awaits server data, serializes the shared templates, and fills the document shell. A CSR-only path instead receives the shell and renders in the browser.

Whichever path produced the document, browser startup registers components. Hydration integration preserves the eligible initial page and adopts compatible ordinary hosts; unmarked or client-only hosts mount normally. Events and later updates belong to the running browser app. Later navigation follows the normal router rather than replaying the server pipeline automatically.

That is the complete execution model. For the individual implementation units, keep the [file and function reference](/docs/ssr-file-reference) beside the relevant lesson rather than reading it as one uninterrupted tutorial.

**Source map:** [Wrap entry](../../../../../../packages/libs/dota-wrap/src/index.ts), [SSR source](../../../../../../packages/libs/dota-ssr/src), [Rendering server entry](../../../../../../packages/libs/dota-rendering/src/server/index.ts), [server-DOM source](../../../../../../packages/libs/dota-server-dom/src), and [runtime contracts](../../../../../../packages/libs/dota-runtime/src/index.ts).

**Continue: [Implementation reference →](/docs/ssr-file-reference)** · [Back to the collection](/docs/ssg-ssr-csr)
