# Hydration + SSR

The single entry point for Dota's server-rendering and hydration work. Start here.

This initiative lets Dota send meaningful HTML **before** JavaScript runs, then make it interactive
**without** re-rendering it. It spans four packages (`dota-core`, `dota-rendering`, `dota-router`,
`dota-wrap`) plus a new build step, so the plans live in several places. This README is the map that
connects them.

## TL;DR

- **Goal:** return rendered pages from the server, serve them per route, and stop the client from
  re-rendering (and discarding) that HTML on connect.
- **Delivery model:** **build-time prerender (SSG) first.** No runtime server is added.
- **The server question:** the Vite dev server is *not* SSR — it serves the SPA and runs your bundle
  in the browser. SSG reuses Vite's `build` + a happy-dom step (fits the current static Vercel deploy).
  Request-time SSR is a later, optional entry point behind the same marker contract.
- **The key correction:** there are **two** client overwrite points that discard server HTML, not one
  — `BaseElement` on connect **and** the router on first load. Both must become hydration-aware.

## Read in this order

0. **[Overview / at-a-glance](./ssg-hydration-overview.md)** — one-page summary: socket map, the
   per-module change table, key design decisions, flows, and phasing. **Read this first for the
   shape.**
0. **[Implementation blueprint](./ssg-hydration-implementation-blueprint.md)** — the **actionable build
   plan**: per-module "what changes / what it looks like" code sketches, the socket map, end-to-end
   flows, and Phase A/B checklists that result in a working SSG + hydration API. **Then build from
   this.**
1. **[Implementation plan](./ssr-hydration-implementation-plan.md)** — the coordinating plan. Grounded
   in the shipped code; maps the three requirements to file-level changes; answers the server
   question; defines the three-surface split and the phases. Read for the *why* behind the blueprint.
2. **[Module extension seams & plugin activation](./module-extension-and-plugin-activation.md)** — how
   the SSG module plugs into core/rendering/router **without** baking SSG code into them. Audits each
   module's extension capability today and reorders the work into seam-first (A) + plugin (B). Read
   this to understand *why the host modules need sockets before the plugin can exist*.
3. **[dota-core runtime environment & hydration attachment](./dota-core-runtime-environment.md)** —
   the *core* internals of "prevent re-render on connect". **Hydration only needs the `bindHTML` mount
   seam** (three local changes, no environment); the runtime-environment/`ComponentRuntime` is an
   *optional, independent* decomposition covered here for teams that also want it. Start with its
   "Do we even need a runtime environment? — No" section.
4. **[dota-rendering: happy-dom + marker plan](../../packages/libs/dota-rendering/planning/ssr-happy-dom-hydration-markup-plan.md)**
   — the marker contract (`data-dh-*` + comment anchors), the happy-dom prerender engine, and the
   renderer gaps to close.
5. **[dota-core: rendering/hydration roadmap](../../packages/libs/dota-core/planning/dota-core-rendering-hydration-architecture-roadmap.md)**
   — *why* hydration is attachment, and how `BaseElement` decomposes into a runtime + engines. Phases
   6–7 are the hydration/server work sequenced by (1).
6. **[ssr/ssg base-support migration](../migration/ssr-ssg-base-support-migration.md)** — the
   property/value contract that lets server and client compute the **same** initial values (the
   prerequisite for matching HTML). Phases 0–3 here gate Phase 4 hydration.

## Findings (verified in code, 2026-08-06)

These are the facts the coordinating plan is built on. File references are current.

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **The router injects a page *tag* and overwrites the root on first load.** It does not fetch/insert expanded page HTML. So the router is the *first* place server HTML is discarded. | `dota-router/src/coordinator/route-renderer.ts:53` (`rootElement.innerHTML = <tag>`), driven by `dota-router/src/router/dom-history.router.ts:50`. |
| 2 | **Rendering is already a targeted-patch engine, but its markers are mount-local and consumed.** Child-text tokens become empty text nodes; the locator is a per-mount counter; no template id/version. | `dota-rendering/src/renderer.ts` (`findChildParts` ~L384, `templateMarkerId` L301). |
| 3 | **Core already owns rendering and unconditionally replaces on connect.** `connectedCallback → bindHTML → mountRender → replaceChildren`. This is the *second* overwrite point. | `dota-core/src/core/elements/base-elements.ts:288-302`. |
| 4 | **No server exists today.** Static Vercel + SPA fallback (`rewrites` → `/index.html`). The dev flow is `vite` serving the SPA, not SSR. | `vercel.json`, `packages/apps/dota-web/vite.config.ts`. |

## The three requirements → where they land

| Requirement | Owner(s) | Change |
| --- | --- | --- |
| Return rendered pages from the server | new build/prerender step + `dota-rendering` markers | happy-dom emits expanded page HTML with durable, content-derived markers + template id + version. |
| Render those pages on request | build-time route walk (SSG) | per route → root shell → prerendered HTML → static `.html`. A real server only if/when request-time SSR is added. |
| Prevent re-rendering on connect | `dota-core` **and** `dota-router` | core `mountOrHydrate()` adopts marked DOM; router hydrates on first load, injects a tag only on later client navigations. |

## Status & open decisions

- **Status:** all proposed. No runtime SSR/hydration code is implemented yet.
- **Decided:** SSG-first; markers shared in `dota-rendering`; hydration reuses the existing engine.
- **Open before the emitter (Step 5):** does happy-dom v20.0.7 serialize declarative shadow roots?;
  final marker names (`data-dh-*` vs `data-dota-part`); text anchor style (comment vs wrapper); which
  routes to prerender first. Tracked in the [implementation plan](./ssr-hydration-implementation-plan.md#open-decisions-to-confirm-before-step-5).

## Supporting background (context, not required reading)

- [BaseElement rendering/hydration audit](../audits/dota-core-base-element-rendering-hydration-audit.md) — the original evidence behind the roadmap.
- [BaseElement P2–P6 rendering improvements](../../packages/libs/dota-core/planning/base-element-p2-p6-rendering-improvement-plan.md) — the batching/reflection work already shipped.
- [Startup render deferral plan](../../packages/libs/dota-core/planning/base-element-startup-render-deferral-plan.md) — viewport/offscreen mounting, adjacent to hydration.
- [Backward-compatible router integration](../../packages/libs/dota-router/migration/backward-compatible-router-integration-plan.md) — the coordinator the router hydration branch extends.
