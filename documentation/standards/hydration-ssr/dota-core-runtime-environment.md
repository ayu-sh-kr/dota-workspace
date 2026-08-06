# dota-core runtime environment & hydration attachment

**Status:** Proposed. Design exploration. No runtime-environment code is implemented yet.
**Reviewed:** 2026-08-06
**Scope:** how `@ayu-sh-kr/dota-core` attaches a replaceable runtime to `BaseElement`, how the existing
inline responsibilities move into it, and how hydration plugs in.
**Coordinated by:** the [SSR + hydration implementation plan](./ssr-hydration-implementation-plan.md)
and [Module extension seams & plugin activation](./module-extension-and-plugin-activation.md). This
document zooms into the **core** seam those two describe at a high level.

## Do we even need a runtime environment for hydration? — No.

**The runtime environment is not required for SSR/hydration.** The only core change hydration needs is
the **mount step**, which lives entirely in `bindHTML()`. If your goal is hydration, stop after the
"minimal core surface" below and skip the rest of this document. The environment is an *independent*
refactor justified by decomposing the 692-line `BaseElement` (replaceable scheduler, testability) — a
maintainability goal, **not** a hydration prerequisite. Do not make the feature wait on the rewrite.

### Minimal core surface hydration actually needs

Three local changes in/around `bindHTML()` — no environment, no `ComponentRuntime`:

1. **Mount-or-hydrate branch.** `bindHTML` calls `mountRender` unconditionally
   (`base-elements.ts:298,301`). Change to: markers present + version match → `hydrate`, else
   `mountRender`.
2. **Adopt an existing shadow root.** `bindHTML` calls `attachShadow({mode:"open"})` (`:296`), which
   *clears* a server declarative shadow root. Use `host.shadowRoot` when it already exists.
3. **Values before first render.** `connectedCallback` runs `bindHTML()` (`:87`) *before*
   `bindProperties()` (`:90`), so the first `render()` runs before attributes are typed into
   properties. Seed reactive values before the first render so server and client markup match.

Bindings and lifecycle (`bindMethods`, `bindHostEvents`, `bindElements`, `bindEmitter`, event emits)
are **origin-agnostic** and do not change for hydration. That is the whole core surface.

The smallest activation for change #1 is the module-global `setMountStrategy(fn)` slot (or even an
inline marker check in `bindHTML` guarded by "was a hydrator registered?"). Everything below is the
*optional* path for teams that also want the decomposition — read it as "if we later build the
environment, this is how it should attach," not "hydration requires this."

## The concept (optional refactor — read only if pursuing the decomposition)

Today `BaseElement` *is* the runtime. `connectedCallback()` performs, inline and in-class:

- **mount** — `bindHTML() → mountRender(root, render())` (`base-elements.ts:87,288-302`);
- **scheduling** — `requestHTMLUpdate()` / `updateHTML()` / `__updateScheduled` / `queueMicrotask`
  (`base-elements.ts:155-199`);
- **reactivity** — `PropertyUtils.bindReactive`, `attributeChangedCallback` reflection
  (`base-elements.ts:211-227,316-318`);
- **bindings** — `bindMethods` (delegated events), `bindHostEvents`, `bindElements`, `bindEmitter`,
  `exposeMethods`, application-event managers (`base-elements.ts:344-512,100-101`);
- **lifecycle** — `CONSTRUCTED`/`CONNECTED`/`DISCONNECTED`/`DOM_UPDATED` on `__eventChannel`,
  `@BeforeInit`/`@AfterInit` (`base-elements.ts:82-116,249-275`).

A **runtime environment** is an indirection: a bag of *replaceable services* the element consults
instead of doing the work itself. `BaseElement` becomes an adapter that forwards native callbacks to
the environment. **Hydration is one service in that bag** — it changes the mount step from *replace*
to *adopt* and nothing else about the element.

```text
Browser callback ─▶ BaseElement (adapter) ─▶ RuntimeEnvironment
                                              ├─ scheduler        (was requestHTMLUpdate)
                                              ├─ renderer/mount    (was bindHTML/mountRender)
                                              ├─ hydrator?         (NEW, optional)
                                              ├─ reactive          (was PropertyUtils)
                                              ├─ bindings          (was bind* methods)
                                              └─ lifecycle         (was __eventChannel emits)
```

The question this document answers is **how that environment is attached and how hydration is
activated**. Three candidate mechanisms were raised; each is explored below against the same criteria:
how existing pieces are dealt with, how hydration attaches, pay-for-play, testability, and migration
cost.

## Option 1 — Static factory registration

A module-level registry resolves an environment per component **constructor**, with a default that
reproduces today's behavior. The plugin registers its environment once at bootstrap.

```ts
// dota-core
const environments = new WeakMap<Function, RuntimeEnvironment>();
let defaultEnvironment: RuntimeEnvironment = createDefaultEnvironment(); // == today

export function registerRuntime(ctor: Function, env: RuntimeEnvironment): void {
  environments.set(ctor, env);
}
export function setDefaultRuntime(env: RuntimeEnvironment): void {
  defaultEnvironment = env;
}

// BaseElement constructor
this.#env = environments.get(this.constructor) ?? defaultEnvironment;
```

- **How existing pieces are dealt with:** each inline responsibility becomes a method on the resolved
  environment. `bindHTML` calls `this.#env.mount(ctx, output)`; `requestHTMLUpdate` calls
  `this.#env.scheduler.request(this)`; etc. The default environment's methods are the current code
  moved verbatim, so behavior is unchanged.
- **How hydration attaches:** the plugin builds an environment whose `mount` consults a `hydrator`
  (markers present + version match → adopt existing DOM; else fall back to client mount) and calls
  `setDefaultRuntime(hydrationEnvironment)` at bootstrap.
- **Pay-for-play:** no plugin ⇒ `defaultEnvironment` ⇒ byte-for-byte today. The hydrator is never
  imported into the browser bundle.
- **Testability:** excellent — a test calls `registerRuntime(MyEl, fakeEnv)` and asserts the element
  invoked the fake; no private-field patching.
- **Fits current code:** bootstrap already keys everything by constructor statics
  (`__dotaSelector`, `__dotaShadow`) and calls `customElements.define(selector, ctor)`
  (`bootstrap.ts`). A `WeakMap<ctor, env>` is the same identity model.
- **Cost:** one indirection in the constructor + a registry. This is the roadmap's
  `createDotaRuntime` + WeakMap association (roadmap §"RuntimeEnvironment").

## Option 2 — Override of the existing implementation

Hydration-capable components extend a different base (`HydratableElement extends BaseElement`) or the
plugin monkey-patches / swaps `BaseElement.prototype.bindHTML` (or the class) at load time.

- **How existing pieces are dealt with:** they are **not** moved. The subclass/patch overrides only the
  mount method and inherits everything else. Scheduling, reactivity, bindings, and lifecycle stay
  inline in `BaseElement`.
- **How hydration attaches:** `HydratableElement` overrides `bindHTML()` to adopt-or-mount; components
  must `extends HydratableElement` to opt in — or a global prototype patch flips every component at
  once.
- **Why it is the wrong attachment mechanism:**
  - **Splits the component base.** The whole ecosystem currently relies on the invariant "everything
    `extends BaseElement`", and `extractComponent()` in dota-wrap detects components by
    `prototype instanceof HTMLElement`. Two base classes fragment decorators, `@Component`, generated
    registration, and every `instanceof BaseElement` assumption.
  - **Prototype patching is brittle.** `bindHTML` is `private`; a plugin patching it depends on
    internal names and ordering that are free to change. It is invisible in tests and hostile to
    tree-shaking.
  - **All-or-nothing.** A global patch cannot be "present but inactive"; per-component opt-in requires
    authors to choose a base class per component, which is exactly the coupling we are trying to avoid.
  - **Poor pay-for-play boundary.** Override lives in the class graph, not behind a registration seam,
    so it is hard to guarantee zero cost when SSG is not installed.
- **Where override *is* fine:** as an escape hatch for a single bespoke component, not as the framework
  activation mechanism.

## Option 3 — A hydration runtime for the core (per-instance `ComponentRuntime`)

Each element delegates its whole lifecycle to a per-instance `ComponentRuntime` object that owns the
mount-or-hydrate decision and the full update sequence; hydration is one *mode* of that runtime.

```ts
export abstract class BaseElement extends HTMLElement {
  readonly #runtime = runtimeFor(this).createComponentRuntime(this);
  connectedCallback() { this.#runtime.connect(); }        // decides mount vs hydrate
  disconnectedCallback() { this.#runtime.disconnect(); }
  attributeChangedCallback(n, o, v) { this.#runtime.attributeChanged(n, o, v); }
}
```

- **How existing pieces are dealt with:** *all* of them move — scheduler, reactive controller, render
  root controller, render/hydration engines, binding controllers, lifecycle dispatcher. This is the
  full roadmap decomposition (roadmap §"ComponentRuntime", §"Suggested source layout").
- **How hydration attaches:** natural — `connect()` runs `mountOrHydrate`; the runtime holds an
  explicit phase machine (`mounting`/`mounted`/`hydrated`) and a `HydrationEngine`.
- **Strength:** the cleanest long-term structure; hydration, deferral, and mismatch recovery all have
  a home; `updateComplete`, commit results, and phases become first-class.
- **Cost:** it is a large refactor touching every responsibility at once — high risk to ship as the
  *first* step, and it still needs an **attachment mechanism** (`runtimeFor(this)`) — which is Option 1
  under the hood.
- **Key realization:** Option 3 is not an alternative to Option 1. It is *what gets registered* by
  Option 1. The environment can hand out a full `ComponentRuntime`, or, early on, a thin object that
  just wraps today's inline methods.

## Comparison

| Criterion | 1. Static factory registration | 2. Override / subclass | 3. Per-instance ComponentRuntime |
| --- | --- | --- | --- |
| Moves existing pieces | Incrementally, behind one seam | No (inherits inline) | Yes, all at once |
| Hydration attach | Service in the environment | Overridden method | Runtime mode |
| Single component base preserved | Yes | **No** | Yes |
| Pay-for-play when SSG absent | Strong (default env) | Weak (class graph) | Strong (default runtime) |
| Testability | Inject fake env by ctor | Patch private/prototype | Inject fake runtime |
| Fits current bootstrap/decorators | Yes (ctor identity) | Partly | Yes (via Option 1) |
| Migration risk | Low, staged | Medium, brittle | High, big-bang |
| Needs an attachment mechanism | — | — | Yes → **is Option 1** |

## Recommendation

*Conditional on choosing to build the environment at all — hydration does not require it (see the "Do
we even need a runtime environment?" section). If you do pursue the decomposition:*

**Attach via static factory registration (Option 1); let the registered thing grow from a thin object
into a full `ComponentRuntime` (Option 3) over time; do not use override (Option 2) as the activation
mechanism.**

Concretely:

1. **Mechanism = Option 1.** A `WeakMap<constructor, RuntimeEnvironment>` plus a default, registered
   once at bootstrap by the plugin. This is the pay-for-play seam, keyed by the same constructor
   identity bootstrap already uses.
2. **Contents = Option 3, incrementally.** The environment exposes services. Hydration is a
   `HydrationEngine` service; the mount step becomes `mountOrHydrate`. Early on these services can wrap
   the current inline methods (small change); later they can be the full extracted controllers without
   changing the registration seam or the element.
3. **Reject Option 2** as framework activation — it splits the base class and relies on prototype
   patching. Keep override only as a per-component escape hatch.

This also lines up with the smaller [extension seam](./module-extension-and-plugin-activation.md):
`setMountStrategy(fn)` is the **minimal form** of this environment (one service, module-global). The
`RuntimeEnvironment` is the next step up (many services, per-constructor); the `ComponentRuntime` is
the end state (per-instance, phase machine). All three share the same call site in `bindHTML`, so each
step replaces the previous without touching component code.

```text
setMountStrategy(fn)     ──▶   RuntimeEnvironment (WeakMap<ctor,env>)   ──▶   ComponentRuntime (per instance)
 one global service            many services, per constructor                full phase machine
 (extension-seam doc)          (this document)                               (dota-core roadmap)
```

## How each existing piece is dealt with under the recommendation

| Current inline piece | Moves to | Hydration difference |
| --- | --- | --- |
| `bindHTML` / `mountRender` | `env.mount(ctx, output)` = **mountOrHydrate** | markers present + version match → `hydrate(root, output)` (adopt existing nodes); else today's `mountRender` |
| shadow root via `attachShadow` | `env.resolveRoot(host, def)` | adopt existing `host.shadowRoot` (declarative shadow DOM) instead of `attachShadow()`, which would clear it |
| `requestHTMLUpdate` / `updateHTML` / `queueMicrotask` | `env.scheduler` | unchanged; the **first** post-hydration update flows through the normal patch path |
| `PropertyUtils.bindReactive` / `attributeChangedCallback` reflection | `env.reactive` | seed initial values **quietly** during hydration — no reflection writes, no scheduled render, watchers suppressed until ready |
| `bindMethods` (delegated events), `bindHostEvents`, `bindElements`, `bindEmitter`, `exposeMethods`, app-event managers | `env.bindings` (connection controllers) | **same code**, run after mount *or* hydrate; they bind over existing adopted DOM instead of freshly rendered DOM |
| `CONSTRUCTED`/`CONNECTED`/`DISCONNECTED`/`DOM_UPDATED`, `@BeforeInit`/`@AfterInit` | `env.lifecycle` | `CONNECTED` still means "view ready" for both mount and hydrate; a `hydrated` result maps to `CONNECTED` for compatibility |

The load-bearing point: **only the mount step and the reactivity seeding differ for hydration.**
Bindings and lifecycle are origin-agnostic — they do not care whether the DOM they attach to was
freshly rendered or adopted from the server. That is why hydration is "one service in the bag," not a
parallel lifecycle.

## Hydration attach sequence (within this model)

```text
custom element upgrades
  └─ BaseElement resolves env = environments.get(ctor) ?? defaultEnvironment
     └─ connect():
        1. env.reactive.seed(host)          // quiet: no reflection, no scheduled render
        2. env.resolveRoot(host, def)        // adopt host.shadowRoot if present, else light DOM
        3. output = host.render()
        4. env.mount(ctx, output):
             hydrator?.hasMarkers(root) && hydrator.versionMatches(root)
               ? hydrator.hydrate(ctx, output)   // bind parts over existing nodes, no innerHTML/clone
               : mountRender(root, output)        // today's client mount
        5. env.bindings.connect(host)        // delegated events, @Element, host/window/doc, emitters
        6. env.lifecycle.emitConnected(host) // CONNECTED / @AfterInit
```

`defaultEnvironment` has `hydrator === undefined`, so step 4 is exactly today's `mountRender` and the
whole sequence is behavior-identical when the plugin is absent.

## Incremental migration (no big-bang)

1. **Seam:** introduce `env.mount` as the module-global `setMountStrategy` slot; `bindHTML` calls it.
   Default = `mountRender`. (Extension-seam doc, Phase A.)
2. **Environment:** promote the slot to a `RuntimeEnvironment` resolved by `WeakMap<ctor,env>` with a
   default; move `scheduler` and `resolveRoot` in next. Element unchanged at the call sites.
3. **Runtime:** collapse the per-call service lookups into a per-instance `ComponentRuntime` with an
   explicit phase machine (roadmap Phases 1–2). Same registration seam.
4. **Hydration:** the plugin registers an environment whose `mount` uses a `HydrationEngine` +
   `rendering.hydrate()` + durable markers.

Each step is independently releasable and leaves every existing test green because the default path is
preserved throughout.

## Testing & guarantees

- **Pay-for-play:** assert that with no registration, `env === defaultEnvironment` and the emitted DOM
  and lifecycle order match the Phase-0 fixtures exactly.
- **Injection:** `registerRuntime(El, fakeEnv)` and assert the element called `fakeEnv.mount/scheduler`.
- **Hydration:** register a hydration env over server-marked DOM; assert zero root `innerHTML` writes
  and that the first reactive update is a part patch, not a replace.
- **Isolation:** a hydration environment registered for one constructor must not affect a sibling
  component still on the default environment (one page mixes prerendered and client-only components).

## Related

- [Module extension seams & plugin activation](./module-extension-and-plugin-activation.md) — the seam this environment sits behind; `setMountStrategy` is its minimal form.
- [SSR + hydration implementation plan](./ssr-hydration-implementation-plan.md) — where mount-or-hydrate and durable markers are sequenced.
- [dota-core rendering/hydration roadmap](../../packages/libs/dota-core/planning/dota-core-rendering-hydration-architecture-roadmap.md) — the full `RuntimeEnvironment`/`ComponentRuntime`/`HydrationEngine` decomposition this document selects an attachment mechanism for.
