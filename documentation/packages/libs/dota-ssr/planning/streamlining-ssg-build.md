# Streamlining the Dota SSG build

This document defines the work needed to make Dota static site generation
faster and more configurable without weakening route isolation or browser
compatibility.

The current implementation is correct but intentionally conservative: every
route is rendered in a fresh DOM realm, and the application is loaded again so
its custom-element constructors belong to that realm.

## Context and intent

`dotaSsg()` is a post-build Vite plugin. It reads the built HTML shell, creates
a DOM window for each selected route, loads the application through Vite's SSR
module runner, waits for application readiness, and serializes the settled
document. The implementation is in
[`dota-ssr/src/vite/index.ts`](../../../../../packages/libs/dota-ssr/src/vite/index.ts).

The package currently uses `happy-dom` as an optional peer dependency:
[`dota-ssr/package.json`](../../../../../packages/libs/dota-ssr/package.json)
declares it for the SSG runtime while keeping it out of the browser entry.

The optimization has two separate goals:

1. avoid unnecessary component discovery, duplicate registration, and module
   work;
2. allow a more browser-faithful DOM runtime when an application needs one.

Changing the DOM runtime alone does not solve repeated application setup.

## Current behavior

For each route, `prerenderRoute()` currently performs this sequence:

1. creates a new `happy-dom` `Window`;
2. installs that window's browser globals temporarily on `globalThis`;
3. writes the built HTML shell into the new document;
4. invalidates Vite's module graph;
5. loads the application entry with `ssrLoadModule()`;
6. initializes the application and registers its components;
7. waits for `applicationReady` and pending DOM work;
8. serializes the document and closes the window;
9. restores the host process globals.

The fresh realm is deliberate. A custom-element class extends the
`HTMLElement` belonging to the realm in which the module was evaluated. A
constructor created for route A cannot safely be reused with route B's fresh
`HTMLElement` and `customElements` registry.

Therefore, registration once per isolated route is currently required for
correctness. It is not the same as redefining an element twice in one browser
registry.

`bootstrap()` already checks `customElements.get(selector)` before defining an
element. However, it logs a warning for an existing selector, and
`registerComponents()` appends application and external constructors without
deduplicating them. Duplicate selectors supplied by both inputs can therefore
produce avoidable warnings inside one route.

## DOM runtime choices

The SSG runtime should be treated as an abstraction rather than making the
renderer depend permanently on one DOM implementation.

| Runtime | Strength | Cost or limitation |
| --- | --- | --- |
| `happy-dom` | Fast and lightweight; suitable for Dota's custom-element and DOM rendering path | Not a complete browser; layout, resource loading, and some browser APIs differ |
| `jsdom` | Broad DOM standards coverage and a familiar Node DOM API | Usually slower; it still does not provide real layout or browser rendering |
| Playwright/Chromium | Highest fidelity for custom elements, CSS, layout, canvas, and browser APIs | Slower builds, browser installation, server startup, and more complicated data isolation |
| Pure string SSR | Potentially fastest and independent of a DOM emulator | Requires Dota components and rendering to support a server-only rendering contract |

`jsdom` should be added only when a concrete compatibility gap is found in
`happy-dom`. Playwright should be a separate high-fidelity rendering mode, not a
drop-in replacement for the current Vite SSR module runner. It would load the
built application through an HTTP server and capture the resulting browser
document.

## Ordered implementation plan

### 1. Measure the current cost and classify duplicate registration

Add focused diagnostics or tests around:

- component-module evaluation per route;
- component extraction per route;
- calls to `bootstrap()`;
- duplicate selectors across generated and external component lists;
- time spent waiting for DOM settlement.

This distinguishes unavoidable realm-specific registration from avoidable
duplicate input and prevents optimizing the wrong stage.

### 2. Make registration selector-aware and idempotent

Update [`dota-wrap/src/index.ts`](../../../../../packages/libs/dota-wrap/src/index.ts)
or the Core registration boundary to:

1. merge application and external constructors;
2. deduplicate them by `__dotaSelector`;
3. silently skip the same constructor when it is already registered;
4. report a clear error when different constructors claim the same selector;
5. call `bootstrap()` once with the unique constructor list.

This removes duplicate warnings and repeated registration attempts within one
realm. It does not remove the required registration step between isolated
route realms.

### 3. Keep fresh-realm rendering as the correctness baseline

Do not remove `moduleGraph.invalidateAll()` or reuse constructors across fresh
windows until the application lifecycle supports it. Reusing a constructor from
another realm can make custom-element definition or element construction fail.

The isolated mode should remain the default while the faster mode is designed
and verified.

### 4. Introduce a pluggable SSG DOM adapter

Move the DOM-specific operations behind an internal adapter responsible for:

- creating a route window;
- exposing and restoring browser globals;
- waiting for pending work;
- running the optional settle callback;
- serializing the document;
- closing the runtime.

The existing `happy-dom` implementation should be the default adapter. The
adapter boundary should be internal to the SSG package so normal browser
consumers do not receive Node or DOM-emulator code.

### 5. Add `jsdom` only as an opt-in compatibility adapter

If a real application demonstrates a missing `happy-dom` API, add an optional
`jsdom` peer and expose a documented adapter selection. The adapter must retain
the same route isolation, readiness barrier, settle callback, global restoration,
and deterministic resource-loading behavior.

The SSG contract must not assume `window.happyDOM`; waiting and cleanup must be
provided by the selected adapter instead.

### 6. Add a separate Playwright renderer when browser fidelity is required

For applications that require layout-sensitive behavior, canvas, browser-only
APIs, or real resource loading, add a separate Playwright-based rendering path.
It should:

1. build the client application;
2. start a controlled preview or application server;
3. open each configured route in Chromium;
4. wait for an explicit Dota readiness marker;
5. capture the page HTML;
6. close the page and server deterministically.

This path must define how APIs, authentication, network requests, timers, and
deployment URLs are controlled during a build. It should not silently replace
the fast Node-based renderer.

### 7. Design a persistent-realm mode around an application factory

The real performance improvement requires rendering multiple routes in one
realm. That cannot be achieved safely by caching the current
`applicationReady` promise because router state, event services, component
instances, and DOM state belong to the previous route.

First expose an application factory or explicit render lifecycle, for example:

```ts
createApplication()
renderRoute(path)
resetApplication()
```

The persistent mode can then initialize components once, navigate or render
each route, clear route-owned DOM and state, and serialize the result. The
isolated mode remains available for applications whose components retain global
state or perform route-specific side effects.

### 8. Consider pure server rendering as a separate architecture

If the project eventually needs very large route sets or server-side rendering
without any DOM emulator, Dota Rendering and component contracts would need a
server renderer that does not require `HTMLElement`, `customElements`, or
browser lifecycle callbacks. That is a larger architectural effort and should
not be mixed into the adapter or registration cleanup.

## Constraints and edge cases

- A new DOM realm has a new custom-elements registry; defining components per
  route is expected in isolated mode.
- A constructor from one realm must not be registered in another realm.
- Duplicate selectors in one component list are a configuration error even if
  the current registry check prevents a second definition.
- `applicationReady` and the settle callback must remain explicit readiness
  barriers; replacing `happy-dom` must not make asynchronous application work
  race serialization.
- Resource loading should remain deterministic by default. Real network access
  belongs in an explicitly configured renderer or test fixture.
- The SSG implementation must continue to restore host globals after every
  route, including failure paths.
- Nitro integration remains a separate deployment concern. Nitro can serve the
  generated output and APIs, but it does not remove the need for a DOM runtime
  or solve route-level application isolation.

## Recommended default

Keep `happy-dom` and fresh route realms as the default today. Implement selector
deduplication first, then add the internal DOM adapter. Add `jsdom` only for a
demonstrated compatibility need and Playwright only for browser-fidelity use
cases. Build a persistent realm after Dota exposes an application factory and
reset contract.

## Related documentation

- [Dota Wrap SSR and Vite plugin composition](../../dota-wrap/configuration/ssr-and-vite-plugin-composition.md)
- [Nitro and `dotaSsg` integration audit](../../../../standards/audits/nitro-to-dota-ssg-migration.md)
- [Dota SSR architecture](../architecture/dota-ssr-architecture.svg)
