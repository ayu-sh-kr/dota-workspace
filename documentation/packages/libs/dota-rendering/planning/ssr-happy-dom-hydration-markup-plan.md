# SSR generation and hydration-marker plan (happy-dom prerender + attribute markers)

**Status:** Proposed. No runtime SSR code is implemented yet.
**Reviewed:** 2026-08-05
**Scope:** `@ayu-sh-kr/dota-rendering` serialization + `@ayu-sh-kr/dota-core` hydration attachment.
**Depends on:** the [rendering/hydration architecture roadmap](../../dota-core/planning/dota-core-rendering-hydration-architecture-roadmap.md) Phases 6–7.

## Purpose

The roadmap already argues *why* hydration must be attachment (not replacement) and that
server and client must share one template/marker definition. This document answers the two
concrete implementation questions that roadmap leaves open:

1. **Can we use happy-dom to generate the HTML for each route at build/prerender time?**
2. **Can the hydration contract be expressed with attributes on component tags instead of
   comment markup?**

Short answers: **yes to happy-dom as the prerender engine**, and **yes to attribute markers as
the default**, with one unavoidable exception (bare dynamic text needs a range anchor).

## What the current renderer already gives us

`dota-rendering/src/renderer.ts` `TemplateInstance` is closer to hydratable output than the
roadmap assumes. During `findParts` it already:

- wraps each component render in `<!--dota-component-start-->` / `<!--dota-component-end-->`;
- stamps `data-dota-component="<local-name>"` on every custom-element host;
- stamps `data-dota-index="<n>"` on every element;
- stamps `data-dota-dynamic=""` on any element that owns a dynamic attribute or dynamic text.

Gaps that block hydration today:

- **Text-part boundaries are erased.** The `dota-value-N` tokens are replaced by *empty text
  nodes with no persistent marker* (renderer.ts:150–161). Hydration cannot find them.
- **No stable template identity.** The renderer keys reuse by `strings` object identity
  (`diff.ts`), which does not survive the Node→browser realm boundary. SSR needs a
  string/hash template id.
- **No marker-version field**, so deploy-skew mismatch cannot be detected.
- **`data-dota-index` is assigned in document order per mount**, not stable against structural
  change — usable as a debugging aid but not as the hydration binding key.

## Marker contract: attributes first, one text anchor exception

### Element-addressable parts → attributes (your proposal)

| Part kind | Serialized marker | Client bind |
| --- | --- | --- |
| Component boundary | `data-dh-c="<local-name>"` on the host | `querySelectorAll('[data-dh-c]')` |
| Template identity | `data-dh-t="counter:4c3a"` on the host | validate id + version |
| Marker version | `data-dh-v="1"` on the host | reject on mismatch |
| Attribute part | `data-dh-a="p3"` on the owning element | rebind attribute part |
| Boolean-attr part | `data-dh-b="p4"` on the owning element | rebind boolean part |
| Property part | `data-dh-p="p5"` on the owning element | reassign live property |

One element can carry several `data-dh-*` markers listing the part ids it owns
(e.g. `data-dh-a="p3 p7"`). This is fully attribute-based and needs no comment markup — exactly
the design you asked for. It is queryable with one `querySelectorAll` pass and survives HTML
serialization/parsing.

### The one exception: bare dynamic text

`html\`<p>Count: ${n}</p>\`` produces a text node with no element to hang an attribute on.
Options, in order of preference:

1. **Comment range anchor** — `Count: <!--dh:p0-->0<!--/dh:p0-->`. Minimal, invisible, no
   layout/CSS/a11y impact. **Recommended default.**
2. **Generated `<span data-dh-x="p0">`** wrapper — easy to query but changes layout, CSS, and
   accessibility. Opt-in only.
3. **Promote the parent element to a text-owner attribute** — `data-dh-x="p0"` on `<p>`, and on
   hydration treat the part as "the Nth child text node of this element." Works only when the
   dynamic text is the sole/identifiable child; ambiguous with mixed static+dynamic text.

Decision: attributes for everything element-addressable; comment anchors *only* for bare text
parts. This keeps ~all markers as attributes while staying correct where an attribute cannot
name a text boundary.

## SSR engine: happy-dom prerender

### Why happy-dom over pure view-function SSR

`BaseElement extends HTMLElement` and existing `render()` methods read instance/DOM state. A
pure browser-free serializer (roadmap Phase 7 ideal) requires migrating every `render()` to a
detachable view function first. happy-dom lets us run the real components in Node now, matching
the roadmap's permitted "build-time browser prerendering" rollout (roadmap §"Server/build
rendering is a separate entry point").

### Prerender pipeline (per route)

```text
for each route:
  1. create a fresh happy-dom Window (isolated globals per route)
  2. register the app's custom elements into that window.customElements
  3. mount the route's root markup into window.document
  4. let connectedCallback() run synchronously (rendering is sync today)
  5. await a settle point (microtasks + optional data-ready barrier)
  6. inject hydration markers (data-dh-*) into the serialized tree
  7. serialize document/outerHTML (+ declarative shadow roots if supported)
  8. write route HTML; dispose the window
```

### Constraints / risks to control

| Risk | Control |
| --- | --- |
| Global pollution / route bleed | One `Window` per route; never a shared global. Use isolated registrator, dispose after each route. |
| Non-determinism (Date/random/locale/`window.*`) | SSR guard: forbid direct `Date.now`/`Math.random` in server-rendered components, or seed them. Same rule as roadmap §deterministic guidance. |
| Async data in `render()` | Rendering is synchronous today. Data must be resolved *before* mount and passed as attributes/props; add an explicit "data-ready" barrier, do not make `render()` async. |
| Declarative Shadow DOM output | Verify happy-dom `getHTML({ serializableShadowRoots: true })` on v20.0.7. If unsupported, shadow components fall back to client-only mount (no SSR) rather than emitting broken markup. |
| happy-dom ≠ real browser parsing | Re-parse every serialized route in a real browser fixture (Playwright/WebdriverIO) before trusting it for hydration. |
| Template id must match client | Generate the id from the static `strings` at compile time (stable hash), shared by client `html` and the serializer — not from object identity. |

### Where the code lives

- Serializer + marker injection: new `@ayu-sh-kr/dota-rendering` subpath, e.g.
  `./server` (keep it out of the browser barrel so it tree-shakes).
- happy-dom is already a **catalog** dependency; keep it a `devDependency`/peer of the server
  entry, never a browser runtime import.
- Client hydration attachment: `@ayu-sh-kr/dota-core` hydration engine (roadmap Phase 6),
  consuming the same marker contract.

## Phased steps

### Step 1 — Stable template identity (unblocks everything)
- Add `templateId` (content hash of `strings`) and `markerVersion` to compiled template data.
- Cache by `strings` identity on the client; by hash on the server. Same value both sides.
- Exit: identical `html` template yields identical id in Node and browser.

### Step 2 — Persistent markers in the client renderer
- Change `findParts` to emit durable markers instead of consuming them:
  - `data-dh-a/b/p` attributes for element-owned parts;
  - `<!--dh:pN-->…<!--/dh:pN-->` anchors for bare text parts;
  - `data-dh-c/t/v` on component hosts.
- Client mount must be able to *re-read its own markers* (proves the format round-trips).
- Exit: a client-mounted tree, serialized and re-parsed, re-binds every part with zero DOM
  replacement.

### Step 3 — happy-dom serializer (`./server`)
- Implement per-route pipeline above; one Window per route; dispose after.
- Emit the Step 2 markers. Light DOM first; shadow DOM gated on the happy-dom check.
- Add SSR determinism guards + a data-ready barrier.
- Exit: a route renders to a byte-stable string containing valid markers; re-parsing in a real
  browser reproduces the same tree.

### Step 4 — Hydration attachment on the client
- On upgrade: resolve existing light DOM / declarative shadow root, validate
  `data-dh-t`/`data-dh-v`, `querySelectorAll('[data-dh-a],[data-dh-b],[data-dh-p]')` + comment
  anchors, bind parts over existing nodes — **no `innerHTML`, no clone**.
- First reactive update flows through the normal part-patch path.
- Exit: matching route hydrates with zero root replacement; first patch preserves server nodes.

### Step 5 — Mismatch policy + deploy skew
- `data-dh-v` / `data-dh-t` mismatch → `recover` (replace only that component boundary,
  report `recoveredFromMismatch`) or `throw` (dev/`required`).
- One recovery per connection generation; never replace an ancestor for a leaf mismatch.
- Exit: version-skew fixture recovers locally; `required` fails visibly in tests.

### Step 6 — Route integration + measurement
- Wire the serializer into the build/prerender step for real routes (start with a static,
  data-light route, then hero/landing).
- Measure: server root writes vs. client `innerHTML` writes, hydrated parts, mismatch count,
  LCP/CLS before/after. Compare against the roadmap benchmark table.

## Plugin architecture: SSR as opt-in capability

SSR is **two plugin surfaces sharing one contract**, not a single plugin. Core depends only on
an interface (a *port*); the SSR plugin provides the implementation. Core never imports the SSR
package, so non-SSR and legacy-string apps ship none of it (pay-for-play).

| Surface | Runs where | Nature | Fits existing convention |
| --- | --- | --- | --- |
| **A. Emitter** — happy-dom prerender, writes marked HTML | Node / build | Vite build plugin | the existing `packages/plugins/*` (all Vite plugins) |
| **B. Attacher** — reads markers, hydrates | Browser / runtime | injected runtime service | roadmap `RuntimeEnvironment.hydrator` (§lines 296–327) |
| **C. Marker contract** — template id, marker version, `data-dh-*` names | shared | plain constants/types | lives in `dota-rendering` (this package) |

A and B never import each other; they agree only on C. This is the single-definition rule the
roadmap requires to prevent server/client drift.

### Core API driven by availability (dependency inversion)

Core defines the `HydrationEngine` port and ships a **no-op default** (`hydrator: undefined`), so
`bootstrap(elements)` is unchanged. The mount decision branches on a three-level check, evaluated
**per component host**, because one page can mix prerendered and client-only components:

```ts
// inside core's mount path
const canHydrate =
  env.hydrator !== undefined &&        // 1. plugin registered at all
  env.hydrator.hasMarkers(root) &&     // 2. THIS host was prerendered
  env.hydrator.versionMatches(root);   // 3. no deploy skew

if (canHydrate)        env.hydrator.hydrate(ctx, output);  // attach; no innerHTML/clone
else if (env.hydrator) applyMismatchPolicy(component);     // markers absent/skewed
else                   clientMount(ctx, output);           // today's behavior, unchanged
```

- **Plugin absent** → straight through to the current client-mount path.
- **Plugin present, markers missing** → component's `rendering.hydration` option decides
  (`auto` client-mounts, `required` throws).
- **Plugin present, version mismatch** → `recover` replaces only that boundary; `throw` in dev.

### Package layout

```
@ayu-sh-kr/dota-rendering     # C: marker constants + template id (shared neutral ground)
@ayu-sh-kr/dota-core          # HydrationEngine PORT + no-op default + availability branch
@ayu-sh-kr/dota-ssr  (new)
  ./vite                      # A: happy-dom emitter. peer: happy-dom, vite (never in browser bundle)
  ./client                    # B: HydrationEngine adapter, registered at runtime
@ayu-sh-kr/dota-wrap          # AppConfig gains runtime?: { hydration?: HydrationEngine }
```

### Registration through the existing composition root

`dota-wrap`'s `AppConfig` / `initializeApp` is already the composition root; thread the runtime
service through it (matches roadmap §lines 324–327):

```ts
import { dotaHydration } from '@ayu-sh-kr/dota-ssr/client';

initializeApp({
  ...config,
  runtime: { hydration: dotaHydration({ mismatch: 'recover' }) },  // optional
});
```

### Narrow field now, generic plugin array later

Start with a narrow `runtime: { hydration }` field, not a general `plugins: RuntimePlugin[]`
array. Generalize to a plugin array only when a second runtime plugin (devtools, analytics, an
alternate renderer) actually exists — the roadmap's "no interface until a second implementation"
discipline.

### Why plugin, not baked into core

- **Pay-for-play**: browser bundle excludes hydration/diagnostics unless SSR is used.
- **happy-dom never reaches the browser**: it is a peer of the `./vite` entry only.
- **Core stays decoupled**: depends on the `HydrationEngine` interface, so request-time SSR or an
  alternate serializer can be added later without touching core.
- **Fits both conventions**: the emitter is a Vite plugin like the existing three; the attacher is
  the `RuntimeEnvironment` seam already designed in the roadmap.

## Open decisions to confirm before Step 3

- **Shadow SSR**: does happy-dom v20.0.7 serialize declarative shadow roots? (Verify; gates
  Step 3 shadow support.)
- **Text marker style**: comment anchors (recommended) vs. parent-attribute text ownership.
- **Marker attribute names**: `data-dh-*` (proposed, terse) vs. the roadmap's `data-dota-part`.
  Pick one and make client + server share the constant.
- **Prerender vs. request-time**: this plan targets build-time prerender first; request-time SSR
  is a later, separate entry point (roadmap non-goal for first implementation).
