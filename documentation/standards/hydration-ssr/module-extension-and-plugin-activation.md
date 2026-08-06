# Module extension seams & plugin activation

**Status:** Proposed. Findings + approach. No seam code is implemented yet.
**Reviewed:** 2026-08-06
**Scope:** extension capability of `dota-core`, `dota-rendering`, `dota-router`, `dota-wrap`, and how the
SSG/hydration module activates through them.
**Coordinated by:** the [SSR + hydration implementation plan](./ssr-hydration-implementation-plan.md).
Read this **before** that plan's phases — it reframes them into seam-first (A) and plugin (B).

## The question this answers

Hydration/SSG will ship as a **separate module, activated by a plugin**. That raises a design
question about the *host* modules:

> Is it correct to "upgrade" core / rendering / router for SSG support — or were those modules
> designed without extension capability, and should we add that instead? Because if the SSG module is
> never installed, there is no point in core/router/rendering carrying SSG-specific code.

**Answer:** do **not** add SSG logic to the host modules. Add **generic extension seams** (sockets)
whose default behavior is exactly today's behavior. The SSG plugin supplies implementations for those
sockets. Host modules never gain "SSG support"; they gain a socket. Plugin absent ⇒ sockets inert ⇒
byte-for-byte current behavior. This removes the "orphaned support with no plugin" problem entirely.

## Findings: extension capability today (verified in code, 2026-08-06)

| Module | Seam for a plugin to hook? | Evidence |
| --- | --- | --- |
| **Core** (`BaseElement`) | **None.** `connectedCallback → bindHTML() → mountRender(this, render())` is hardcoded; the constructor hardwires its services. The roadmap's `RuntimeEnvironment`/`hydrator` port is *proposed, not built*. | `dota-core/src/core/elements/base-elements.ts:87,288-302`; constructor L58-72. |
| **Rendering** | **None.** `main.ts` exports concrete `render/patch/update/html`. String-vs-Template strategy is internal and sealed. No `hydrate()` entry, no injectable parser/marker strategy. | `dota-rendering/src/main.ts`; `renderer.ts` `RenderSession` (closed strategy switch). |
| **Router** | **Half-open.** `RouteRenderer<T>` *is* an injectable function seam the coordinators already consume, and the config type even declares an unused optional `renderer?` — but `fromComponents`/`DotaRouterService` ignore it and hardcode `this.renderer = createRouteRenderer(root)`. The socket is designed but unwired. | `Types.ts:18,161`; `HistoryCoordinator.ts:35,62`; `DotaRouterService.ts:55`. |
| **dota-wrap** (`AppConfig`) | **None.** No `runtime`/`plugins`/`renderer` field; hardcodes `DomHistoryRouter` + default renderer. | `dota-wrap/src/index.ts` (`AppConfig` type L18-26). |

**Conclusion:** the extension points were not designed in (router got closest with `RouteRenderer`,
then bolted it shut at construction). This is the real gap — and it is fixable without a rewrite.

## The design rule: two kinds of change, kept separate

The earlier plan blurred these. They must be distinct commits/PRs:

| Kind | Lives in | Knows about SSG? | Cost when plugin absent |
| --- | --- | --- | --- |
| **1. Generic extension seam** (socket) | core / rendering / router | **No** | Zero — default = today's behavior |
| **2. Plugin implementation** (plug) | new SSG/hydration module | **Yes** (markers, happy-dom, adoption) | Not shipped |

A seam is feature-agnostic: "an external strategy may decide how mounting/adoption happens here." It
is useful beyond SSG (devtools, alternate renderers, test doubles). The plugin gives the socket
meaning. This is the roadmap's own *dependency inversion* + *pay-for-play* discipline, applied as the
prerequisite it always was.

## What a "socket" is, and how to design one

"Socket" is the informal name used in this document for an **extension seam**: a *named, typed
indirection point where a host module delegates a decision to a replaceable implementation, and ships a
default that preserves current behavior.* The receptacle in the host module is the **socket**; the
implementation a plugin provides is the **plug**. The same idea appears in the wild under several
names — *extension point*, *hook*, *port* (hexagonal / ports-and-adapters), *strategy slot*, *seam*
(Feathers, *Working Effectively with Legacy Code*). They are all the same move: invert the dependency
so the host depends on an interface, not on a concrete feature.

### Two axes decide the mechanism

Do not pick a mechanism by taste. Two properties of the seam determine it:

1. **Cardinality** — is the decision **exclusive** (exactly one implementation may answer; the last one
   wins or a conflict is an error) or **additive** (many implementations compose / all run)?
2. **Timing & scope** — **build-time** vs **runtime**, and **global** vs **per-class** vs
   **per-instance**.

Hydration's mount decision is *exclusive + runtime + per-class*. Diagnostics/devtools would be
*additive + runtime + global*. The build emitter is *additive + build-time*. Mixing these up is how
extension systems rot (e.g. a global mutable setter used for something that needs per-instance scope).

### Mechanism taxonomy

| Mechanism | Cardinality | Shape | Use when | Precedent |
| --- | --- | --- | --- | --- |
| **Capability method** | n/a | just export the function; always present | the ability is universal and cheap; the *caller* decides when to use it | any stdlib API |
| **Strategy slot / setter** | exclusive, global | `let impl = default; setImpl(fn)` | one app-wide policy, simplest possible | jQuery `$.ajaxSetup`; risky as a permanent design |
| **Registry keyed by identity** | exclusive, per-key | `WeakMap<key, impl>` + default | a decision varies per class/instance | `customElements.define(tag, ctor)`; dota `bootstrap` keys by constructor |
| **DI via composition root** | exclusive, per-app | pass the impl through config, thread it down | one wiring point owns construction | Angular DI; dota router `RouteRenderer`; `AppConfig` |
| **Hook object (named hooks)** | additive, ordered | `{ name, hookA?, hookB? }[]` run by a host | many concerns, each taps named phases | **Vite / Rollup plugins** — and **dota's own** `packages/plugins/*` |
| **Middleware / onion chain** | additive, wrapping | `fn(next) => (…) => next(…)` composed | each layer may wrap/short-circuit the next | Express, Koa, Redux middleware |
| **Observer / event bus** | additive, loose | emit events; plugins subscribe | fire-and-forget notifications, no control flow | DOM `EventTarget`; dota `ApplicationEventService` |

### How existing libraries support extension (precedent)

| Library | Mechanism | Notable detail we borrow |
| --- | --- | --- |
| **Vite / Rollup** | array of **plugin objects** with named hooks (`config`, `resolveId`, `load`, `transform`, `transformIndexHtml`, `configureServer`) | hooks have explicit resolution: `resolveId` is *first-non-null wins* (exclusive), `transform` is *sequential* (additive). Cardinality is per-hook, not per-plugin. |
| **Lit** | `ReactiveController` via `host.addController(c)` with `hostConnected`/`hostUpdated`; **directives** for template extension | per-instance additive controllers; SSR ships as a *separate entry*, not baked into the element |
| **Web platform** | `CustomElementRegistry.define`, `static observedAttributes`, lifecycle callbacks, `ElementInternals` | the registry *is* an identity-keyed socket; `observedAttributes` is a static declaration the host reads once |
| **Redux / Koa** | middleware composition (`applyMiddleware`, onion) | additive control-flow where order matters and a layer may short-circuit |

**Repo precedent (already shipping in dota):**
- **Hook-object model** — `dota-vite-preloader`, `event-map-generator`, `web-type-json` are all Vite
  plugin objects (`name` + `resolveId`/`load`/`buildStart`/`configureServer`;
  `dota-vite-preloader/src/main.ts:82`). The team already knows and uses this shape.
- **Strategy slot** — the router's `RouteRenderer` function type (`Types.ts:161`) is an exclusive
  runtime strategy; there is even an **unused** optional `renderer?: RouteRenderer` in the router
  config type (`Types.ts:18`) that `fromComponents`/`DotaRouterService` currently ignore. The socket is
  90% designed and simply not wired.

### Design checklist for a good socket

- **Default = identity / no-op.** Absent plug ⇒ current behavior, provably (test it against Phase-0
  fixtures).
- **Narrow, typed port.** One interface per decision; do not expose internals.
- **One registration site.** Register through the composition root (`dota-wrap`), not scattered module
  globals. A global mutable setter is acceptable only as the *minimal first form*, and only for a truly
  app-global exclusive decision.
- **Identity-keyed when scoped.** Per-class ⇒ `WeakMap<constructor, impl>` (the key `bootstrap` already
  uses); never a class name string.
- **Idempotent / one owner.** For an *exclusive* socket, a second registration should **throw or warn**,
  never silently last-win.
- **Pay-for-play.** The plug tree-shakes out when unused; the socket adds no hot-path allocation.
- **Introspectable & versioned.** Enough metadata (e.g. marker version) for the plug to detect skew and
  for tests to assert which strategy ran.

### Cardinality of each dota seam (so we pick correctly)

| Seam | Cardinality / scope | Mechanism chosen |
| --- | --- | --- |
| Rendering `hydrate()` | universal capability | **Capability method** — just export it |
| Core mount-or-hydrate | exclusive, runtime, per-class | **Registry by constructor** (min form: a global strategy slot) |
| Core render-root (shadow adopt) | exclusive, per-class | folded into the mount seam |
| Router route rendering | exclusive, per-app | **DI via composition root** (wire the existing `renderer?`) |
| `AppConfig.plugins` aggregator | additive, ordered | **Hook object** — mirror the existing Vite-plugin shape |
| Build emitter | additive, build-time | **Vite plugin hook** (`transformIndexHtml`/`buildStart`) |

## The minimal socket per module

The full roadmap decomposition (`RuntimeEnvironment`, `ComponentRuntime`, `RenderEngineRegistry`) is
**not** required to get a plugin seam. One narrow port each; the larger refactor can land later
*behind* these ports without breaking them.

### Rendering — expose a capability (not a plugin)

- Add **`hydrate(root, output): RenderInstance`** as a peer of `render()`: bind parts over existing
  marked DOM, return the same `RenderInstance` shape.
- Emit **durable, content-derived markers + `templateId` + `markerVersion`** (replacing the mount-local
  `templateMarkerId` counter for hydration).
- This is always present and cheap — the lowest layer and the shared contract owner. Core/plugin
  decides *when* to call `hydrate` vs `render`; rendering does not need its own plugin switch.

### Core — a mount-strategy slot (smallest form of the `hydrator` port)

- Replace the direct `mountRender` call in `bindHTML` with a **module-level mount-strategy slot** that
  defaults to `mountRender`.

  ```ts
  // default (today's behavior)
  let mountStrategy: MountStrategy = (root, output) => mountRender(root, output);
  export function setMountStrategy(next: MountStrategy): void { mountStrategy = next; }
  // bindHTML() calls mountStrategy(root, this.render()) instead of mountRender(...)
  ```
- Default slot = client mount, unchanged. Hydration slot (installed by the plugin) = markers present &
  version matches → `hydrate`, else `mountRender`, else `recover`/`throw`.
- The slot is the **minimal form** of a full runtime environment. How the slot grows into a
  per-constructor `RuntimeEnvironment` and eventually a per-instance `ComponentRuntime` — and why
  static factory registration wins over class override — is worked out in
  [dota-core runtime environment & hydration attachment](./dota-core-runtime-environment.md).
- Also adopt an existing `host.shadowRoot` instead of `attachShadow()` when present (declarative shadow
  DOM). This is a correctness fix independent of the plugin.

### Router — wire the seam that already exists (DI)

Mechanism: **DI via composition root** — the socket is already a typed function (`RouteRenderer`,
`Types.ts:161`) and the config type already declares an unused `renderer?` (`Types.ts:18`). The work is
wiring, not design:

- **(a)** Honor the existing optional `renderer` in `fromComponents` and thread it through the
  `DotaRouterService` constructor, defaulting to `createRouteRenderer(root)` only when absent (today it
  hardcodes the default at `DotaRouterService.ts:55`).
- **(b)** Put the **navigation origin** (initial load vs. subsequent navigation) into
  `NavigationContext`, so a hydration-aware renderer can choose *adopt existing markup* vs. *inject a
  page tag*. (Initial load is `dom-history.router.ts:50`, `{commit:false}`.)

### dota-wrap — the aggregator (hook object, mirroring the existing Vite-plugin shape)

Mechanism: **additive hook object** — the same shape the team already ships in `packages/plugins/*`.
Do **not** invent a new plugin format; reuse the `{ name, …hooks }` convention so a runtime plugin
looks like the build plugins developers already know.

```ts
export interface DotaRuntimePlugin {
  readonly name: string;                     // like Vite's plugin.name
  setup?(ctx: DotaRuntimeContext): void;     // runtime wiring
  // vite?: Plugin;                           // optional build-time half (the emitter)
}

export interface DotaRuntimeContext {
  setMountStrategy(fn: MountStrategy): void;  // exclusive: throws on double-set
  setRouteRenderer(r: RouteRenderer): void;   // exclusive: throws on double-set
}
```

- Add `plugins?: DotaRuntimePlugin[]` to `AppConfig`; `initializeApp` runs each `setup(ctx)` before
  `registerRoutes`, so the ctx can install the core strategy and hand the router its renderer.
- The aggregator is *additive* (many plugins), but each underlying socket it fills is *exclusive*
  (one mount strategy, one route renderer) — hence the `ctx` setters throw on conflict rather than
  silently last-winning.

## Activation flow

```text
initializeApp({
  ...,
  plugins: [ dotaHydration({ mismatch: 'recover' }) ],   // ← additive list; the only activation switch
})

// dotaHydration() returns a DotaRuntimePlugin { name, setup, vite }
setup(ctx):
  • ctx.setMountStrategy(adoptOrMount)     // exclusive socket → adopt marked DOM, else mountRender
  • ctx.setRouteRenderer(adoptOrInject)    // exclusive socket → uses NavigationContext origin
  • uses rendering.hydrate() + durable markers  // capability, already exposed
vite:
  • the happy-dom build-time emitter       // additive Vite hook; never in the browser bundle
```

`plugins: []` or omitted ⇒ core uses default `mountRender`, router uses default renderer, rendering
still emits cheap markers ⇒ **identical to today**. Pay-for-play holds; no orphaned SSG code.

## Reordered work: seam-first, then plugin

This supersedes the linear phase list in the coordinating plan by splitting it:

### Phase A — sockets (no SSG, no behavior change, independently releasable)

- [ ] Rendering: durable content-derived `templateId` + `markerVersion`.
- [ ] Rendering: durable child-text anchors + `data-dh-*` element markers (stop consuming into empty
  text nodes); add `hydrate(root, output)`; prove serialize → re-parse → re-bind with zero replacement.
- [ ] Core: `setMountStrategy` slot; `bindHTML` calls the slot; default = `mountRender`. Adopt existing
  `host.shadowRoot`.
- [ ] Router: inject `RouteRenderer`; add navigation origin to `NavigationContext`.
- [ ] dota-wrap: `AppConfig.plugins` threaded to the core slot + router renderer.
- **Exit:** with no plugin installed, every existing test passes unchanged; the sockets are covered by
  their own unit tests (default strategy == today; injected fake strategy is invoked).

### Phase B — the plugin module

- [ ] New SSG/hydration module implementing `adoptOrMount` (core), `adoptOrInject` (router), and the
  happy-dom build-time emitter (separate `./vite` entry).
- [ ] Wire it through `AppConfig.plugins`; mismatch policy (`recover`/`throw`).
- [ ] Pilot one static route; measure server vs. client writes, hydrated parts, mismatch count.
- **Exit:** first paint of a prerendered route performs no root replacement; SPA navigation unaffected;
  uninstalling the plugin returns to Phase-A behavior.

## Relationship to the roadmap decomposition

The mount-strategy slot is the **smallest form** of the roadmap's `RuntimeEnvironment.hydrator` port.
Shipping it now does not block the larger `ComponentRuntime`/`RenderEngineRegistry` extraction — that
refactor later replaces the module-level slot with a per-instance environment lookup **behind the same
call site**, so the plugin contract does not change.

## Related

- [SSR + hydration implementation plan](./ssr-hydration-implementation-plan.md) — the end-to-end plan these seams serve.
- [Hydration + SSR README](./README.md) — the initiative map.
- [dota-core rendering/hydration roadmap](../../packages/libs/dota-core/planning/dota-core-rendering-hydration-architecture-roadmap.md) — the full `RuntimeEnvironment`/`hydrator` decomposition this seam is the minimal form of.
- [backward-compatible router integration](../../packages/libs/dota-router/migration/backward-compatible-router-integration-plan.md) — where the `RouteRenderer` seam and coordinator live.
