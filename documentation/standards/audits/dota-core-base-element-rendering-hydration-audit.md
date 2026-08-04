# Audit — `BaseElement` Rendering Performance & Hydration Support

**File under audit:** `packages/libs/dota-core/src/core/elements/base-elements.ts`
**Related files:** `src/core/utils/PropertyUtils.ts`, `src/core/render/html.render.ts`
**Date:** 2026-08-03
**Focus:** (1) making rendering faster and (2) adding support for hydration.

---

## 1. The 30-second summary

`BaseElement` is the base class every dota component extends. It turns a class into
a native Web Component (`HTMLElement`). Today it works, but its rendering strategy is
the simplest one possible: **every time anything changes, it throws away all of the
component's HTML and rebuilds it from scratch as a string.**

That single decision is the root of almost every performance and hydration limitation
below. This report explains, in plain terms, where that hurts, why, and what to do
about it.

Two headline problems:

1. **Rendering is "all or nothing."** There is no diffing. A one-character text change
   re-creates the entire subtree of DOM nodes. This is slow on big components and
   silently breaks focus, scroll position, text selection, and half-typed input.
2. **There is no hydration path.** On connect, the component *always* overwrites its
   own HTML. If the markup was already there (server-rendered, or pre-rendered at build
   time), it gets destroyed and rebuilt on the client. That makes SSR/SSG effectively
   pointless and causes a visible flicker.

---

## 2. How rendering works today (the mental model)

Understanding the current flow makes every finding obvious.

```
render()            → returns a STRING of HTML (just string concatenation)
bindHTML()          → element.innerHTML = render()      // first paint
updateHTML()        → element.innerHTML = render()      // EVERY later change
```

- `render()` (via the `HTML` tagged-template in `html.render.ts`) is pure string glue —
  it concatenates static strings with interpolated values. There is no template caching,
  no node tree, no markers.
- `updateHTML()` is called on **every** reactive change:
  - A `@Property` change → `setAttribute` → `attributeChangedCallback` → `updateHTML()`
  - A `@State` change → setter → `updateHTML()`
- Each `updateHTML()` also re-runs `bindMethods()` and `bindElements()` (re-scans
  metadata, re-queries the DOM).

So the true cost of "change one value" is:
**re-run render → re-parse a full HTML string → destroy & rebuild every child node →
re-query the DOM → re-attach bindings.**

---

## 3. Performance findings

### P1 — Full `innerHTML` replacement on every change (highest impact)
**Where:** `updateHTML()` (lines 127–144), `bindHTML()` (238–253)

**Problem:** Setting `innerHTML` tells the browser to (a) discard every existing child
node and (b) parse a fresh HTML string and build a brand-new node tree. There is no
attempt to reuse the nodes that didn't change.

**Why it hurts:**
- **Cost scales with the *whole* component, not the change.** Updating one list item
  re-builds the entire list.
- **It destroys live DOM state** the browser was holding for you:
  - the currently focused element (a form loses focus mid-typing),
  - scroll position of inner scrollable areas,
  - text selection / caret position,
  - CSS transitions/animations in flight,
  - uncontrolled `<input>`/`<textarea>`/`<select>` values.
- **It re-parses HTML**, which is one of the more expensive things you can ask a browser
  to do repeatedly.

**What a fix looks like (in order of effort):**
- *Cheap win:* skip the update entirely when the newly rendered string is identical to
  what's already shown (memoize last render output; `if (next === this.__lastHTML) return;`).
- *Real fix:* introduce a lightweight diff/patch step (a minimal keyed DOM-diff, or adopt
  a small library) so only changed nodes are touched.
- *Structural fix:* move from "render returns a string" to "render returns a template
  with dynamic holes" (see P5), which is what makes targeted updates possible.

---

### P2 — No batching: one logical update triggers many full re-renders
**Where:** reactive setters in `PropertyUtils.bindReactive` (154) and `bindState` (620–637),
both calling `updateHTML()` synchronously.

**Problem:** Each property/state assignment synchronously runs a complete re-render.
Setting three values in a row:

```ts
this.title = 'Hi';     // full re-render #1
this.count = 5;        // full re-render #2
this.items = [...];    // full re-render #3
```

…does **three** complete destroy-and-rebuild cycles when the user only needed one.

**Why it hurts:** The work is multiplied by the number of fields you touch. In loops or
during initialization this can be dozens of redundant re-renders in a single tick.

**What a fix looks like:** Coalesce updates. Mark the component "dirty" and schedule a
single render on the microtask queue (`queueMicrotask`) or next animation frame
(`requestAnimationFrame`). Many synchronous mutations then collapse into one paint.
This pairs naturally with P1.

---

### P3 — `@Property` changes take an expensive double-hop through the attribute system
**Where:** `bindReactive` setter (152–156) → `setAttribute` → `attributeChangedCallback`
(158–172) → `updateHTML()`

**Problem:** Assigning a property writes to an attribute, which fires
`attributeChangedCallback`, which *also* calls `updateHTML()`. So a property change goes:
`property set → serialize to string → setAttribute → parse attribute → re-render`.

**Why it hurts:** Attribute reflection forces every value through string
serialize/deserialize, and routes the update through a second code path whose only job
is to call `updateHTML()` again. It's indirection that adds cost and makes the "when do
we re-render" story harder to reason about.

**What a fix looks like:** Separate "reflect to attribute" from "trigger render." Reflect
for interop when needed, but drive rendering from the reactive setter directly (through
the batched scheduler from P2), so a JS property change doesn't need a string round-trip
to repaint.

---

### P4 — Re-binding and re-querying on every update
**Where:** `updateHTML()` calls `bindMethods()` + `bindElements()` (134–137)

**Problem:** After each re-render, the component re-scans its `@Bind` metadata and
re-runs `querySelector` for every `@Element`.

**Why it hurts:**
- `@Element` references (`bindElements`, 650–665) point at nodes that were just destroyed
  by the `innerHTML` swap, so they must be re-queried every time — extra DOM lookups, and
  any code holding the old reference now holds a detached node.
- `bindMethods` (294–333) already uses **event delegation on a stable root** — which is
  great, because those listeners *survive* re-renders. But it's still re-invoked on every
  update (the `__delegatedBindListeners` guard prevents duplicates, so it's mostly wasted
  scanning rather than wasted listeners).

**What a fix looks like:** Once diffing (P1) keeps nodes stable, `@Element` references stay
valid and don't need re-querying. Delegated listeners already persist, so `bindMethods`
can be skipped on updates entirely (bind once on connect).

---

### P5 — `render()` is an opaque string, which blocks every smarter strategy
**Where:** `html.render.ts` (the `HTML` tagged template) and `abstract render(): string`

**Problem:** The template function just concatenates strings. The framework never learns
*which* parts of the output are static and which are dynamic — by the time it sees the
result, it's one flat string.

**Why it hurts:** You can't diff efficiently, can't update a single text node, and can't
hydrate against existing markup, because there are no stable markers tying "this value"
to "this spot in the DOM." Every optimization above is capped by this.

**What a fix looks like:** Evolve the template tag to return a structured template
(static string parts + the list of dynamic values, like `lit-html`'s approach). The
static parts are cached once per template; only the dynamic values are re-evaluated and
patched into known positions. This is the foundation that makes P1/P2 cheap *and* makes
hydration (below) possible.

---

### P6 — Minor: falsy interpolated values render as empty
**Where:** `html.render.ts` line 6 — `string + (values[i] || '')`

**Problem:** `values[i] || ''` converts `0`, `false`, and `NaN` to `''`. A component
rendering `${count}` shows nothing when `count === 0`.

**Why it matters:** It's a correctness papercut that also makes render output
unpredictable (which undermines the memoization idea in P1). Use
`values[i] ?? ''` (nullish) so only `null`/`undefined` are dropped.

---

## 4. Hydration findings

**Current state: there is no hydration support at all.** These findings are about
*adding* it, since the audit explicitly asks for extended hydration support.

### H1 — `connectedCallback` always overwrites existing markup
**Where:** `connectedCallback` → `bindHTML()` (59–64, 238–253)

**Problem:** On connect, `bindHTML()` unconditionally does `innerHTML = render()`. If the
element already contains server-rendered or build-time pre-rendered HTML, that markup is
thrown away and rebuilt on the client.

**Why it hurts:**
- **Defeats the purpose of SSR/SSG.** The whole point of sending pre-rendered HTML is that
  the client *reuses* it. Here it's discarded.
- **Causes a flash / layout shift.** The user sees server HTML, then it blanks and
  re-appears as client HTML.
- **Wastes the initial render.** You pay to render on the server *and* fully re-render on
  the client, with zero reuse.

**What a fix looks like:** Detect whether the element already has matching light-DOM
content (e.g. a `hydrate` flag or a data attribute stamped by the server). If so, **adopt**
the existing nodes instead of replacing them: skip `innerHTML = render()`, and instead
walk the existing DOM to attach bindings and reactive wiring.

---

### H2 — No separation of "render" from "attach behavior"
**Where:** `bindHTML` couples markup creation with the render, and the bind* methods
assume they run right after a fresh render.

**Problem:** Hydration needs to do the *second half* of setup (bind events, wire reactive
props, resolve `@Element` refs) **without** doing the first half (produce markup). Today
those are entangled in the `connectedCallback` sequence.

**Why it hurts:** There's no clean seam to say "the DOM already exists, just attach
behavior to it." Any hydration attempt would have to fight the existing flow.

**What a fix looks like:** Introduce a `hydrate()` path parallel to the current first-paint
path:
- **Fresh render (today):** create DOM (`innerHTML = render()`) → bind behavior.
- **Hydrate (new):** *assume* DOM exists → bind behavior only → reconcile reactive state
  against the existing attributes/text.

The already-present **event delegation** in `bindMethods` (294–333) is a real asset here:
because listeners live on a stable root and match via `composedPath`, they attach cleanly
to pre-existing server markup without needing per-node wiring. This makes H1/H2 much more
achievable than in a framework that binds listeners node-by-node.

---

### H3 — Shadow DOM: no Declarative Shadow DOM adoption
**Where:** `bindHTML` (245–249) — `attachShadow({mode:"open"})` then set `innerHTML`

**Problem:** For shadow components, the code always creates a fresh shadow root and fills
it via `innerHTML`. The browser's server-side shadow mechanism — **Declarative Shadow DOM**
(`<template shadowrootmode="open">`) — is ignored.

**Why it hurts:** Shadow-DOM components simply cannot be server-rendered/hydrated at all;
they're always client-built. This is the shadow-DOM equivalent of H1.

**What a fix looks like:** On connect, check for an already-attached declarative shadow root
(`this.shadowRoot` exists before you call `attachShadow`, or `this.internals`/DSD detection).
If present, adopt it instead of re-attaching.

---

### H4 — Reactive setup assumes it *creates* attributes rather than *reading* them
**Where:** `PropertyUtils.bindReactive` (92–176)

**Problem:** `bindReactive` already has a decent precedence model (attribute > JS value >
default) and *reads* existing attributes — which is genuinely hydration-friendly and worth
keeping. But it also *reflects* initial values back out (166–172) and the overall connect
sequence assumes a from-scratch render followed this.

**Why it matters (mildly):** During hydration you want reactive state to **match** the
server-rendered DOM without triggering a re-render on connect. The good news: the change
detection in the setters (P1/P2 area) means seeding backing fields won't repaint if values
are equal — so this file is *closer* to hydration-ready than the rest. The main work is
ensuring the initial hydrate does not call `updateHTML()` at all.

**What a fix looks like:** During hydrate, seed backing fields from existing
attributes/DOM and explicitly *suppress* the initial `updateHTML()`, so the first client
interaction — not the connect — is what triggers the first patch.

---

## 5. Prioritized recommendations

| # | Change | Solves | Effort | Payoff |
|---|--------|--------|--------|--------|
| 1 | Memoize last render string; skip `updateHTML` when output is unchanged | P1 (partial) | XS | Instant win, removes no-op re-renders |
| 2 | Batch reactive updates via microtask/rAF scheduler | P2, P3 | S | Collapses N re-renders into 1 |
| 3 | Fix falsy interpolation (`?? ''`) | P6 | XS | Correctness + reliable memoization |
| 4 | Bind delegated listeners once on connect; stop re-running `bindMethods`/`bindElements` on update | P4 | S | Less per-update work |
| 5 | Move `render()` to structured template (static parts + dynamic values) | P5 | L | Unlocks real diffing *and* hydration |
| 6 | Add DOM diff/patch on top of structured template | P1 (full) | L | Preserves focus/scroll/input; cost scales with change |
| 7 | Add a `hydrate()` path that adopts existing markup instead of overwriting | H1, H2, H4 | M–L | Real SSR/SSG; no flicker |
| 8 | Adopt Declarative Shadow DOM when present | H3 | M | Hydration for shadow components |

**Suggested sequencing:** Do 1–4 first — they're small, safe, and give immediate
performance relief without changing the public API. They also pave the way for the bigger
structural work (5–8), where the string-based `render()` is replaced by a structured
template that makes both fine-grained updates *and* hydration natural rather than bolted on.

---

## 6. What's already good (keep it)

- **Event delegation on a stable root** (`bindMethods`, 294–333) — listeners survive
  re-renders and are hydration-friendly. This is the right pattern.
- **Property precedence & change detection** (`PropertyUtils`) — reading existing
  attributes and only reacting on real changes is exactly what hydration needs.
- **Lifecycle events** (`CONSTRUCTED`/`CONNECTED`/`DOM_UPDATED`/…) give clean hook points
  to slot a `HYDRATED` event into later.

These strengths mean the gap to a fast, hydration-capable renderer is mostly about
**how `render()` output is represented** (P5) — not a rewrite of the component model.
