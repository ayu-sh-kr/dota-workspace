# SSG + Hydration — overview (at a glance)

A one-page summary of the plan. Full detail and code sketches are in the
[implementation blueprint](./ssg-hydration-implementation-blueprint.md); the *why* is in the
[implementation plan](./ssr-hydration-implementation-plan.md).

## Objective

Ship **SSG (build-time prerender) + client hydration** as a **separate module**
(`@ayu-sh-kr/dota-ssr`) that plugs into the existing libraries through **narrow sockets**. Existing
modules change only where hydration requires it, and only to expose a socket whose default is
byte-for-byte today's behavior. No plugin ⇒ sockets inert ⇒ current behavior.

## Socket map

```
@ayu-sh-kr/dota-rendering   CAPABILITY   hydrate(root, output) + templateId() + emit mode   (always present)
@ayu-sh-kr/dota-core        STRATEGY     setMountStrategy(fn)   default = mountRender          (exclusive)
@ayu-sh-kr/dota-router      DI           inject RouteRenderer   default = createRouteRenderer  (exclusive)
@ayu-sh-kr/dota-wrap        AGGREGATOR   AppConfig.plugins → DotaRuntimeContext               (additive)
@ayu-sh-kr/dota-ssr  (new)  PLUG         implements the three above + happy-dom emitter        (the feature)
```

## What changes per module

| Layer | Change | Socket type | Default when no plugin |
| --- | --- | --- | --- |
| **rendering** | `templateId()` + `MARKER_VERSION`; opt-in `setHydrationEmit` (durable comment/attr markers); `hydrate(root, output)` | Capability | flag off ⇒ today's `render()`/`patch()` untouched |
| **core** | `setMountStrategy` slot in `bindHTML`; adopt existing `shadowRoot`; seed values before first render | Exclusive Strategy (Null Object default) | slot = `mountRender` ⇒ byte-for-byte today |
| **router** | inject `RouteRenderer` (wiring only); add `initial` to `NavigationContext` | DI | default `createRouteRenderer` + `initial` ignored |
| **dota-wrap** | `AppConfig.plugins` + `DotaRuntimeContext`; run `setup` before `registerRoutes` | Additive hook object (Vite-plugin shape) | no plugins ⇒ identical wiring |
| **`@ayu-sh-kr/dota-ssr`** (new) | `dotaHydration()` plugin + `./vite` happy-dom emitter | The plug | not installed |

## Design patterns

Ports & Adapters / Dependency Inversion (sockets) · Strategy (mount, route renderer) · Null Object
(defaults = today) · Capability/Factory (`hydrate`) · Decorator (hydration renderer wraps the default) ·
Plugin hook object (`AppConfig.plugins`, mirroring `packages/plugins/*`) · Composition Root (`dota-wrap`).

## Key design decisions

- **Hydration reuses the existing patch machinery.** `hydrate()` reconstructs the same
  `ChildPart`/`AttributePart` structures by adopting existing `<!--dh:pN-->` comment boundaries instead
  of creating them — everything after mount is unchanged.
- **Emit mode is build-time only.** Durable markers never reach the browser bundle; the flag is flipped
  solely inside `dota-ssr/vite` (happy-dom). Pure pay-for-play.
- **The route renderer is a Decorator** wrapping the default: on `context.initial` with marked markup
  present → skip inject (adopt); else call the default. Client navigation is untouched.
- **`initial` is essentially free** — `currentMatch === undefined` already means first paint; just made
  explicit.
- **Exclusive sockets throw on double-registration** (core mount strategy) so two plugins can't clobber.

## End-to-end flows

- **Build (SSG):** Vite build → `dota-ssr/vite` walks routes → happy-dom renders each with emit mode →
  marked `.html` in `dist`. No runtime server.
- **First paint + hydration:** browser shows server HTML → router's initial navigation skips the
  `innerHTML` inject (marked markup present) → element upgrades → core mount strategy sees matching host
  markers → `hydrate()` binds parts over existing nodes, **zero root replacement**.
- **Client navigation:** `context.initial` false → renderer injects a fresh page tag → normal client
  mount. No hydration.

## Phasing (safety by construction)

- **Phase A — sockets only:** no new module, no behavior change, independently releasable; every existing
  test stays green; each socket gets a fake-injection test. One behavior-adjacent change
  (`seedInitialValues` reordering) is gated behind a characterization test.
- **Phase B — the module + pilot:** first paint proves **zero root replacement**; removing the plugin
  provably returns to Phase-A behavior.
- **Dependency:** mismatch-free hydration also needs server/client value agreement (property codecs from
  the [ssr/ssg base-support migration](../migration/ssr-ssg-base-support-migration.md) Phases 0–3);
  `mismatch: 'recover'` is the safety net until then.

## First commit

Rendering `template-id.ts` + core `setMountStrategy` slot — everything else builds on those two.

## See also

- [Implementation blueprint](./ssg-hydration-implementation-blueprint.md) — full per-change code sketches.
- [Hydration + SSR README](./README.md) — the initiative map.
