# SSR + hydration implementation plan (grounded in current code)

**Status:** Proposed. Coordinating plan. No runtime SSR code is implemented yet.
**Reviewed:** 2026-08-06
**Target model:** Build-time prerender (SSG) first. Request-time SSR is a later, separate entry point.
**Scope:** `@ayu-sh-kr/dota-core` (lifecycle + mount), `@ayu-sh-kr/dota-rendering` (markers + parts),
`@ayu-sh-kr/dota-router` (initial-load hydrate vs. client navigate), `@ayu-sh-kr/dota-wrap` (composition root),
and a new build/prerender step.

## Why this document exists

Three earlier plans each describe one slice of SSR/hydration:

- [dota-core rendering/hydration roadmap](../../packages/libs/dota-core/planning/dota-core-rendering-hydration-architecture-roadmap.md)
  — *why* hydration is attachment and how `BaseElement` should decompose.
- [dota-rendering happy-dom + marker plan](../../packages/libs/dota-rendering/planning/ssr-happy-dom-hydration-markup-plan.md)
  — the marker contract and happy-dom prerender engine.
- [ssr/ssg base-support migration](../migration/ssr-ssg-base-support-migration.md)
  — the property/value contract that lets server and client agree on initial values.

Those plans predate (or under-describe) three facts that are now true in the shipped code. This
document restates the target **against the current implementation** and answers the two questions
those plans left implicit:

1. Given the router injects a page **component tag** (it does not fetch a page), the rendering
   module already does **targeted DOM updates**, and core already owns **lifecycle + rendering**,
   what concretely has to change?
2. **Do we need to add a server, or does Vite already give us one like it does in development?**

## The three facts, verified in code

### Fact 1 — the router injects a page *tag*, and overwrites the root on first load

`renderRoute()` mounts a route by writing a component tag into the root host, not by fetching or
inserting expanded page HTML:

```ts
// packages/libs/dota-router/src/coordinator/route-renderer.ts:53
rootElement.innerHTML = `<${componentConfig.selector}${message} path="${match.pathname}"></${componentConfig.selector}>`;
```

At startup the history adapter immediately drives one navigation, which runs the same overwrite:

```ts
// packages/libs/dota-router/src/router/dom-history.router.ts:49-50
this.init();
void this.coordinator.navigate(window.location.href, {commit: false});
```

**Consequence for SSR:** on the very first load the router *replaces* whatever HTML the server
sent with an empty `<page-tag path="…">`. Any prerendered content is discarded before the page
component even upgrades. The router is therefore the **first** overwrite point, and initial load
must become *adopt existing markup*, not *inject a fresh tag*.

### Fact 2 — rendering is already a targeted-patch engine, but its markers are not yet durable

`dota-rendering` is not a string re-renderer. `render()` returns a stateful `RenderInstance`;
`patch()`/`update()` apply part-level DOM writes; `TemplateStrategy` tracks child/attribute parts and
keyed ranges (`packages/libs/dota-rendering/src/renderer.ts`). During mount it already stamps:

- `<!--dota-component-start-->` / `<!--dota-component-end-->` around each component render;
- `data-dota-component="<local-name>"` on custom-element hosts;
- `data-dota-index="<n>"` on every element;
- `data-dota-dynamic` on elements owning a dynamic attribute (a mount-local locator) or dynamic text.

**Gaps that still block hydration (unchanged from the happy-dom plan):**

- **Child-text boundaries are erased at mount.** `findChildParts()` replaces each interpolation
  token with *two empty text nodes* (`renderer.ts:384-389`). Empty text nodes do not survive HTML
  serialization → re-parse, so a hydrating client cannot find them.
- **Marker identity is mount-local.** The dynamic locator is `dota-render-${templateMarkerId++}-…`
  (`renderer.ts:301`), a per-mount counter. It is not derived from the template's static strings,
  so a server realm and a browser realm produce different values for the same template.
- **No template id / marker version** is emitted, so deploy-skew is undetectable.

The engine is close, but hydration needs **durable, content-derived** markers rather than
**mount-local, consumed** ones.

### Fact 3 — core already owns rendering, and unconditionally replaces on connect

`BaseElement.connectedCallback()` calls `bindHTML()`, which always mounts fresh:

```ts
// packages/libs/dota-core/src/core/elements/base-elements.ts:288-302
private bindHTML() {
  if (this.isShadow) {
    this.shadowRoot = this.attachShadow({mode: "open"});          // clears a declarative root
    this.__renderInstance = mountRender(this.shadowRoot, this.render());
  } else {
    this.__renderInstance = mountRender(this, this.render());      // replaceChildren / innerHTML
  }
}
```

`mountRender` → `NativeRoot.replaceChildren()` / `writeHTML()` (`renderer.ts:153,166`). So core is the
**second** overwrite point: even if the router adopted server HTML, the component would still throw it
away on upgrade. This is the "re-render on component connect" the request calls out.

> **Prerequisite — extension seams.** The host modules have no sockets for a plugin to hook today (core
> and rendering are closed; the router's `RouteRenderer` seam is bolted shut at construction). Before
> any of the changes below can be *activated by a plugin* rather than baked into the modules, each
> module needs a narrow, feature-agnostic seam whose default is today's behavior. That analysis and the
> resulting seam-first (A) / plugin (B) reordering live in
> [Module extension seams & plugin activation](./module-extension-and-plugin-activation.md) — read it
> alongside this section.

## What we need to achieve, mapped to the three facts

| Requirement | Where it lands | Concrete change |
| --- | --- | --- |
| **Return rendered pages from the server** | new build/prerender step + `dota-rendering` markers | Emit the page component's *expanded* HTML with durable, content-derived markers + template id + marker version. |
| **Render those pages on request** | build-time route walk (SSG); a real server only if/when request-time SSR is added | Map each route → root shell → prerendered page HTML → static `.html` file. |
| **Prevent re-rendering on connect** | `dota-core` (`mountOrHydrate`) **and** `dota-router` (initial-load branch) | Adopt existing marked DOM instead of `replaceChildren`; router hydrates on first load and only injects a tag on later client navigations. |

The third requirement has **two** owners because there are two overwrite points (Fact 1 and Fact 3).
A plan that only fixes `BaseElement` still loses server HTML at the router boundary.

## Do we need to add a server? (the direct answer)

**For the recommended first step — build-time prerender / SSG — no runtime server is added.**
For request-time SSR later — yes, a real server (or serverless function) is required. The Vite dev
server does **not** do it for you. Details:

### The Vite dev server is not SSR

`vite` in development serves `index.html` and transforms/HMRs modules. It runs **your bundle in the
browser**; it never executes your components in Node to produce HTML. So "the server we use in
development" is a static-asset + module server, not a rendering server. Today's production deploy
matches that shape exactly: Vercel serves static files and rewrites every path to `/index.html`
(`vercel.json`), i.e. a pure SPA. There is no server-render anywhere in the current pipeline.

### What Vite *does* give you

Vite ships **SSR primitives**, not an SSR server: `server.ssrLoadModule()` and `ssrTransform` (dev),
`build --ssr` to bundle a server entry, and `server.middlewareMode` to mount Vite inside your own
Node server. Frameworks (Nuxt, SvelteKit, Astro) build their servers *on top of* these. Vite will
not, by itself, turn a route into HTML — you always write the render entry.

### Two ways to use those primitives

| Model | Runtime server? | Fits current deploy? | When |
| --- | --- | --- | --- |
| **Build-time prerender (SSG)** | **No.** A build script runs happy-dom, writes one static `.html` per route. | **Yes** — stays static on Vercel; drop the blanket SPA rewrite for prerendered routes. | **Now (this plan).** |
| **Request-time SSR** | **Yes** — Node/Hono/Express with `middlewareMode` in dev + built SSR bundle in prod; on Vercel a serverless/edge function. | No — needs a function target, not static rewrites. | Later, only if pages must vary per request (auth, live data). |

**Recommendation:** target SSG first. It reuses Vite's existing `build`, adds one prerender step, and
needs no server or infra change. Keep the request-time server behind the same render contract so it
can be added later without redoing the marker/hydration work. This is the roadmap's own position
("build-time browser prerendering… request-time SSR is a later, separate entry point").

## Architecture: three surfaces, one contract, reusing existing seams

SSR is not one module. It is **three surfaces that agree on one marker contract**, each landing on a
seam that already exists in the codebase.

```
Contract (C)   @ayu-sh-kr/dota-rendering
  durable content-derived template id, marker version, data-dh-* / comment anchors
        ▲                                   ▲                                   ▲
        │ shared, no cross-imports          │                                   │
  ┌─────┴─────┐                     ┌────────┴────────┐                 ┌────────┴────────┐
  │ Emitter (A)│                    │ Core adopt (B1) │                 │ Router adopt(B2)│
  │ build step │                    │ BaseElement     │                 │ coordinator     │
  │ happy-dom  │                    │ mountOrHydrate  │                 │ hydrate vs nav  │
  └───────────┘                     └─────────────────┘                 └─────────────────┘
   Node/build                        browser/runtime                     browser/runtime
```

- **A. Emitter** — a Vite build plugin / prerender script (happy-dom). Same convention as the
  existing `packages/plugins/*` Vite plugins. Never imported by the browser bundle.
- **B1. Core adoption** — `BaseElement` gains `mountOrHydrate()`: when the root carries valid markers,
  bind parts over existing nodes instead of `replaceChildren`. This is the roadmap's `HydrationEngine`
  port; ship a no-op default so `bootstrap(elements)` is unchanged.
- **B2. Router adoption** — the coordinator's **initial** navigation adopts existing root markup
  instead of writing a page tag; later navigations keep today's tag injection (client render).
- **C. Contract** — durable markers + template id + version live in `dota-rendering`, shared by A and
  B. A and B never import each other.

Registration threads through the existing composition root (`dota-wrap` `initializeApp` /
`AppConfig`), matching the roadmap's `runtime: { hydration }` seam — not a new global.

### The router hydrate-vs-navigate branch (new, and load-bearing)

This is the piece none of the prior plans covered, because it only becomes visible once you note the
router overwrites the root (Fact 1). The coordinator's `render` path must split by navigation origin:

```text
initial load (dom-history.router constructor navigate, {commit:false}):
  if root already contains a marked page for this route
     -> DO NOT set innerHTML
     -> leave the server DOM in place; let the page element upgrade and hydrate (B1)
  else
     -> today's behavior: rootElement.innerHTML = <page-tag path="…">   (client render)

later client navigation (user clicks a link):
  -> always today's behavior: inject <page-tag>, page renders client-side
     (there is no server HTML for a client-side route change)
```

So hydration only applies to the **first** paint of a prerendered entry. Every subsequent SPA
navigation is a normal client mount. `route.render` custom callbacks (`route-renderer.ts:41`) stay
client-only and opt out of hydration.

## Where each change lives (file-level)

| Change | File(s) |
| --- | --- |
| Durable, content-derived template id + marker version | `packages/libs/dota-rendering/src/template.ts`, `types.ts` |
| Emit durable child-text anchors + `data-dh-*` element markers (stop consuming into empty text nodes) | `packages/libs/dota-rendering/src/renderer.ts` (`findChildParts`, `indexElementsAndFindAttributeParts`, `mount`) |
| Re-bind parts over existing marked DOM (hydrate path) | `packages/libs/dota-rendering/src/renderer.ts` (new `hydrate(root, output)` alongside `render`) |
| `mountOrHydrate()` replacing unconditional `bindHTML()` | `packages/libs/dota-core/src/core/elements/base-elements.ts` |
| Adopt existing `host.shadowRoot` instead of `attachShadow()` when present | `base-elements.ts:295-296` |
| Initial-load hydrate vs. client-navigate branch | `packages/libs/dota-router/src/coordinator/route-renderer.ts`, `coordinator/*` (navigation origin flag), `router/dom-history.router.ts:50` |
| `runtime: { hydration }` composition seam | `packages/libs/dota-wrap/src/index.ts` (`AppConfig`, `initializeApp`) |
| Emitter (happy-dom prerender) + static route walk | new `@ayu-sh-kr/dota-ssr/vite` (or a `packages/plugins/*` prerender plugin) |
| Property/value agreement (server == client initial values) | per [ssr/ssg base-support migration](../migration/ssr-ssg-base-support-migration.md) |

## Marker contract (attributes first, one text anchor exception)

Unchanged from the [happy-dom + marker plan](../../packages/libs/dota-rendering/planning/ssr-happy-dom-hydration-markup-plan.md);
restated so this doc is self-contained.

| Part kind | Serialized marker | Client bind |
| --- | --- | --- |
| Component boundary | `data-dh-c="<local-name>"` on host | `querySelectorAll('[data-dh-c]')` |
| Template identity | `data-dh-t="counter:4c3a"` on host | validate id + version |
| Marker version | `data-dh-v="1"` on host | reject on mismatch |
| Attribute part | `data-dh-a="p3"` on owning element | rebind attribute part |
| Boolean-attr part | `data-dh-b="p4"` on owning element | rebind boolean part |
| Property part | `data-dh-p="p5"` on owning element | reassign live property |
| **Bare dynamic text** | `Count: <!--dh:p0-->0<!--/dh:p0-->` | comment range anchor (the one exception) |

The template id must be a **content hash of the static `strings`**, computed identically on server and
client — replacing the mount-local `templateMarkerId` counter for hydration purposes. The mount-local
locator can remain for pure client rendering; hydration needs the stable id.

## Phased steps (grounded, SSG-first)

Ordered so each phase is independently reviewable and leaves the app shippable. This refines the
roadmap's Phases 6–7 with the router work the roadmap omitted.

### Step 0 — Freeze current behavior
- Characterization tests: router initial navigate overwrites root; `bindHTML` replaces children;
  renderer patch/keyed behavior. These must stay green through the change.
- Add a Node-only import test proving the emitter entry loads with no `window`/`HTMLElement`.
- **Exit:** current overwrite behavior is pinned by tests before it is altered.

### Step 1 — Durable template identity (unblocks everything)
- Add content-hash `templateId` + `markerVersion` to compiled template data in `template.ts`.
- Same value in Node and browser for the same `html` template.
- **Exit:** identical template ⇒ identical id in both realms.

### Step 2 — Durable markers in the client renderer
- Change `findChildParts` to emit `<!--dh:pN-->…<!--/dh:pN-->` anchors instead of empty text nodes.
- Emit `data-dh-a/b/p` on element parts and `data-dh-c/t/v` on the component host.
- Prove round-trip: a client-mounted tree, serialized and re-parsed, re-binds every part with **zero**
  DOM replacement (this is the client-side proof that the format hydrates).
- **Exit:** serialize → re-parse → re-bind, no `replaceChildren`.

### Step 3 — `hydrate()` in rendering + `mountOrHydrate()` in core
- Add `hydrate(root, output)` to `dota-rendering` that binds parts over existing marked nodes and
  returns a `RenderInstance` shaped exactly like `render()`'s.
- In `BaseElement`, replace unconditional `bindHTML()` with `mountOrHydrate()`:
  - markers present + version matches → `hydrate`; markers absent → today's `mountRender`;
    version mismatch → configured `recover`/`throw`.
  - adopt `host.shadowRoot` when it already exists (declarative shadow DOM) instead of
    `attachShadow()`.
- Thread a `runtime: { hydration }` (no-op default) through `dota-wrap`.
- **Exit:** a component whose root already holds matching marked DOM upgrades with zero root writes;
  first reactive update flows through the normal patch path.

### Step 4 — Router initial-load adoption
- Add a navigation-origin flag so the coordinator distinguishes the startup navigate
  (`dom-history.router.ts:50`) from user navigations.
- On initial load, if the root already contains a marked page matching the resolved route, **skip**
  the `innerHTML` tag injection and let the existing element hydrate (Step 3). Otherwise, today's
  behavior.
- Later navigations: unchanged tag injection (client render).
- **Exit:** first paint of a prerendered route performs no root `innerHTML` write; SPA navigation is
  unaffected.

### Step 5 — happy-dom emitter + static route walk (the "server")
- New `@ayu-sh-kr/dota-ssr/vite` (or `packages/plugins/*` prerender plugin): per route, one fresh
  happy-dom `Window`, register the app's custom elements, mount the root shell + page tag, let sync
  `connectedCallback` run, inject Step-2 markers, serialize, write `dist/<route>.html`. Dispose the
  window per route.
- Deterministic guards (no raw `Date.now`/`Math.random` in prerendered components; data resolved
  before mount).
- Update `vercel.json`: serve the prerendered `.html` for known routes; keep the SPA fallback only
  for non-prerendered paths.
- **Exit:** each targeted route emits byte-stable marked HTML; re-parsing it in a real browser
  reproduces the same tree; the page hydrates (Steps 3–4) with no root replacement.

### Step 6 — Mismatch policy + pilot + measurement
- `data-dh-t`/`data-dh-v` mismatch → `recover` (replace only that component boundary,
  report `recoveredFromMismatch`) or `throw` (dev/`required`). One recovery per connection generation.
- Pilot one static, data-light route (a preview card / landing), then measure: server writes vs. client
  `innerHTML` writes, hydrated parts, mismatch count, LCP/CLS before/after.
- **Exit:** version-skew fixture recovers locally; pilot shows first paint from server HTML with no
  client re-render.

### Later — request-time SSR (separate, optional)
- Only if per-request rendering is needed. Reuse Steps 1–4 unchanged; add a Node server
  (`middlewareMode` dev, built SSR bundle prod) behind the **same** render contract, and a Vercel
  function target. No marker/hydration rework.

## Open decisions to confirm before Step 5
- **Shadow SSR:** does happy-dom v20.0.7 serialize declarative shadow roots? If not, shadow components
  fall back to client-only mount for the first release.
- **Text marker style:** comment anchors (recommended) vs. a generated wrapper span.
- **Marker names:** settle `data-dh-*` vs. the roadmap's `data-dota-part`; make client + server share
  one constant in `dota-rendering`.
- **Route set to prerender first:** static/data-light routes before any auth/live-data route.

## Related plans
- [Module extension seams & plugin activation](./module-extension-and-plugin-activation.md) — the seam-first prerequisite; reorders this plan's phases into A (sockets) + B (plugin).
- [dota-core rendering/hydration roadmap](../../packages/libs/dota-core/planning/dota-core-rendering-hydration-architecture-roadmap.md) — Phases 6–7 refined here with router work.
- [dota-rendering happy-dom + marker plan](../../packages/libs/dota-rendering/planning/ssr-happy-dom-hydration-markup-plan.md) — the marker/emitter detail this plan coordinates.
- [ssr/ssg base-support migration](../migration/ssr-ssg-base-support-migration.md) — the property/value agreement hydration depends on.
- [backward-compatible router integration](../../packages/libs/dota-router/migration/backward-compatible-router-integration-plan.md) — the coordinator this plan's Step 4 extends.
