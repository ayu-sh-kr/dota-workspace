# Audit — Hydration/SSR Lifecycle, API Contract & Design-Pattern Consistency

**Scope:** `dota-core`, `dota-rendering`, `dota-router`, `dota-ssr`, `dota-wrap`
**Trigger:** post-mortem on the opt-in hydration handoff patch (`.changeset/four-monkeys-type.md`, commit `28b42b1`)
**Date:** 2026-08-08 (Phases 0, 1, 2 & 3 of the roadmap applied 2026-08-08 — see status notes below)
**Method:** code-level verification against the claims in the changeset and the existing planning docs in `documentation/standards/hydration-ssr/`. Every finding below is cited to a file:line; nothing is taken from documentation on faith.

---

## 1. The 30-second summary

The patch does what it says for the **cases it was designed for**: scoped markers (`data-dh-s`) correctly stop nested components from colliding on marker IDs, `deferRender()` is a clean, well-typed extension point, and `dota-core` stays fully hydration-agnostic (all decision logic lives in `dota-ssr`, wired through one exclusive extension seam). That part is a **proper fix**, not a patch-over.

But the audit surfaces three classes of problems that the changeset doesn't mention:

1. ~~**The router's original bug — discarding server HTML on first load — is not fixed in the router.**~~ **[PATCHED, Phase 1]** `dota-router` still doesn't preserve SSR/SSG output on its own by design (it stays hydration-agnostic, matching `dota-core`'s architecture), but standalone use is no longer silent: it now warns (`console.warn`) when it detects marked prerendered output about to be overwritten on the initial render, and points at `dota-wrap`'s `dotaHydration()` plugin. See U1/U2 below.
2. ~~**Terminology and failure-handling are inconsistent across the five packages.**~~ **[PATCHED, Phase 0 & 2]** "Adopt", "hydrate", "retain", "handoff", "capture", "release" are still five different terms for the same core idea, but they're now mapped to one canonical concept in a glossary (Phase 0). Failure-handling is now a consistent, opt-in `warn`/`throw` choice at every layer that previously diverged: route-marker mismatches (S2) and router render-time errors (U3) now support the same two-value policy that component hydration (S1... see below) already had, instead of silent fallthrough or `console.error`+no-op as the only option. Defaults are unchanged everywhere — this closes the *contract* inconsistency, not the underlying default behavior.
3. ~~**A version-unchecked backward-compat fallback exists with no deprecation plan.**~~ **[PATCHED, Phase 3]** The route-level "legacy template marker" acceptance is now version-gated against a fixed sentinel (`LEGACY_ROUTE_TEMPLATE_VERSION = 2`) instead of accepting any non-null marker — a future template-version bump with no route marker is captured, fails adoption, and is reported through the mismatch policy (Phase 2's plumbing) instead of being silently absorbed. The two version counters (route vs. template) remain intentionally separate but are now explicitly cross-linked in both packages' source (S4).

There is also a documentation hygiene problem: several planning docs referenced from `documentation/standards/hydration-ssr/README.md` and `documentation/standards/bugs/dota-hydration-initial-route-bug.md` (e.g. `dota-rendering/planning/scoped-hydration-marker-ownership.md`) **do not exist in the tree**, and the bug doc itself describes as "still required" a fix that has already shipped. **[PATCHED, Phase 0]** — see §2.7.

---

## 2. Findings by package

Tags: **[PROPER]** structural fix addressing root cause · **[WORKAROUND]** patches a symptom / has an open-ended escape hatch · **[INCONSISTENCY]** same concept handled differently across packages/layers.

### 2.1 `dota-core`

| # | Finding | Evidence |
|---|---|---|
| C1 [PROPER] | `bindHTML()` has no hydrate/fresh/defer branching of its own — it delegates to a single exclusive extension point. dota-core stays hydration-agnostic. | `src/core/elements/base-elements.ts:290-313` → `resolveMountStrategy()`, `src/core/elements/render-strategy.ts:39-41` |
| C2 [PROPER] | `setMountStrategy` is single-registration and throws on a second call, which is the right shape for "exactly one hydration integration owns mounting" — but see W3 below for a composition-root risk this creates. | `render-strategy.ts:30-36` |
| C3 [PROPER] | Old audit finding H4 ("hydration seeding must not trigger an initial `updateHTML()`") is now resolved: `seedInitialValues` runs before reactive accessors are installed, so seeding is a plain field write with no render trigger. | `PropertyUtils.ts:114-121`, `base-elements.ts:85,92,326-328` |
| C4 [INCONSISTENCY] — **[PATCHED, Phase 5]** | A `HYDRATED` lifecycle event now exists and fires before `CONNECTED` when the mount strategy adopted server DOM. Fresh-mount and `deferRender` paths do not set the flag, so `CONNECTED` remains the only event for those paths and the distinction is observable. | `lifecycle-event.constants.ts` (`HYDRATED`), `base-elements.ts` (`__wasHydrated`), `dota-ssr/src/index.ts` (`{ hydrated: true as const }`) |
| C5 [PROPER] | `DOM_UPDATED` only fires from `updateHTML()`, never from any mount-strategy path — no divergence between fresh/hydrate/defer here. | `base-elements.ts:180-186` |

### 2.2 `dota-rendering`

| # | Finding | Evidence |
|---|---|---|
| R1 [PROPER] | `data-dh-s` scope is applied uniformly to all three marker kinds (child, keyed, attribute-part) and required by every parser — no marker kind is left unscoped. | `renderer.ts:395,397,571,1089`, parsers at `renderer.ts:978-1015` |
| R2 [PROPER] — **[PATCHED, Phase 0]** | This scoping is a genuine root-cause fix for the nested-component collision described in `documentation/standards/bugs/dota-hydration-initial-route-bug.md` — verified against `hydration.test.ts:167-189`. The bug doc's staleness is fixed: status now reads "Resolved" and dead links to non-existent planning docs were replaced with a link to this audit. | `renderer.ts:37,952-953,1023-1030`, bug doc now cites this evidence directly |
| R3 [PROPER] | Marker version (`MARKER_VERSION = 2`) is defined once and checked centrally — no duplicated magic numbers. | `template-id.ts:2`, `dota-ssr/src/index.ts:112-115` |
| R4 [WORKAROUND] | `hydrate()` wraps the entire render-session construction in one blanket `try/catch`. Under the default `mismatch: 'warn'`, every failure class — malformed markers, missing scope, version skew, a genuine renderer bug — collapses into the same `console.warn` + full remount. This is documented/intentional, but it means real bugs and expected version skew are indistinguishable in the logs. | `renderer.ts:1263-1289` |
| R5 [PROPER] | `deferRender()` has a clean, narrow signature and its only consumer (`dota-ssr`) calls it exactly per that contract. | `renderer.ts:1223-1245`, `dota-ssr/src/index.ts:102` |

### 2.3 `dota-router`

| # | Finding | Evidence |
|---|---|---|
| U1 [WORKAROUND] — **[PATCHED, Phase 1]** | The router's own render path still does the unconditional `rootElement.innerHTML = <tag>` overwrite on first load — that decision (router stays hydration-agnostic; `dota-ssr` intercepts from outside) was kept, not reversed. What changed: the overwrite is no longer silent. When `context.initial` is true and the root's existing child carries a `data-dh-route`/`data-dh-t` marker, `route-renderer.ts` now logs `console.warn` naming the loss and pointing at `dotaHydration()` before overwriting. | `coordinator/route-renderer.ts:56` (overwrite), now preceded by the warn check; README documents the standalone-usage risk |
| U2 [WORKAROUND] — **[PATCHED, Phase 1]** | `RouterUtils.render`'s duplicate unconditional-overwrite path has been deleted outright (along with the now-unused `RenderConfig` type and its dedicated test file) rather than left as a second, un-migrated copy. | Removed from `RouterUtils.ts`; see `route-renderer.ts` as the one remaining render path |
| U3 [INCONSISTENCY] — **[PATCHED, Phase 2]** | Missing root/component metadata during render was swallowed via `console.error` + no-op unconditionally. `createRouteRenderer`/`renderRoute` now accept an optional `{onError?: 'warn' \| 'throw'}` (default `'warn'`, identical behavior to before); `'throw'` raises so the failure surfaces through the coordinator's `navigate()` result instead of being silently swallowed, matching the fail-hard behavior already used for bad router construction. | `route-renderer.ts` (`RouteRendererOptions`, `reportRenderError`) vs `DomHistoryRouter` constructor |

**Consequence (updated):** `dota-router` deliberately remains a router that doesn't know about hydration markers — that ownership boundary was kept intentionally, matching `dota-core`'s own hydration-agnostic design (C1/C2). What's fixed is the *silence*: standalone use without `dota-ssr` now gets a `console.warn` on the initial render instead of a wordless overwrite, and the package README states plainly that `dota-router` is not SSR-safe on its own. The external-interception design (`dota-ssr`'s `createHydrationRouteRenderer` wrapping the renderer via `dota-wrap.initializeApp()`) is unchanged — see S5 for why that ownership split is still the right call architecturally.

### 2.4 `dota-ssr`

| # | Finding | Evidence |
|---|---|---|
| S1 [INCONSISTENCY] — **[PATCHED, Phase 2]** | Two independent mismatch-policy mechanisms coexist: a module-level global (`setHydrationMismatchPolicy`) that only applies when `hydrate()` is called without an explicit option, and `dota-ssr`'s per-plugin `mismatch` option, which is *always* passed explicitly. `setHydrationMismatchPolicy` is not removed (it's public API and still meaningful for direct `hydrate()` callers outside `dota-ssr`), but is now marked `@deprecated` with a JSDoc explaining exactly why it's dead code on the `dota-ssr`-plugin path. | `renderer.ts:1284-1291` (now `@deprecated`), `dota-ssr/src/index.ts:35,118` |
| S2 [INCONSISTENCY] — **[PATCHED, Phase 2]** | Component-level mismatches are observable (warn/throw per policy). Route-level marker mismatches were not — a route-marker mismatch fell through to `next()` silently. `createHydrationRouteRenderer` now reports a captured-but-unadopted route through the same `mismatch` policy passed to `dotaHydration()`: `warn` logs via `warnHydrationMismatch` before falling through, `throw` raises before `next()` is called. A route with its own custom `render` callback is explicitly excluded from this check — that's an intentional bypass, not a mismatch. | `dota-ssr/src/index.ts` (`createHydrationRouteRenderer`, `reportRouteMismatch`) |
| S3 [WORKAROUND] — **[PATCHED, Phase 3]** | Legacy template-marker acceptance at the route layer (`rootHasMarkedPage`) now checks `data-dh-v === String(LEGACY_ROUTE_TEMPLATE_VERSION)` (a fixed sentinel, currently `2`) instead of accepting any non-null legacy marker attribute. The sentinel deliberately does not track the live `MARKER_VERSION` import, so a future marker bump doesn't silently widen this fallback — `captureInitialRoute` still captures such a page (broad eligibility check), but `rootHasMarkedPage` now rejects it, and the resulting `'invalid'` state is reported through the Phase 2 mismatch policy instead of falling through unnoticed. | `dota-ssr/src/index.ts` (`LEGACY_ROUTE_TEMPLATE_VERSION`, `rootHasMarkedPage`) |
| S4 [INCONSISTENCY] — **[PATCHED, Phase 3]** | Route marker family (`data-dh-route`, `data-dh-route-version`, value `'1'`, a **string**) remains a separate, independently-versioned scheme from the template marker family (`MARKER_VERSION = 2`, a **number**) — this was a deliberate design choice (they gate different contracts: route-boundary ownership vs. template identity), not an oversight, so the counters were not merged. Both source files now carry explicit JSDoc cross-links explaining the split and pointing at this finding, so a reader hits the explanation at the point of confusion instead of nowhere. | `route-marker.ts` (file-header comment) vs `template-id.ts:1-7` |
| S5 [PROPER] | The `'captured' → 'adopted' \| 'released' \| 'invalid'` initial-route state machine is a clean, one-way lifecycle, and `captureInitialRoute` correctly runs before custom-element upgrade. | `index.ts:52-61,100-104,150-157,200-222` |

### 2.5 `dota-wrap`

| # | Finding | Evidence |
|---|---|---|
| W1 [PROPER] | `dota-wrap`'s SSR surface is a genuine barrel re-export (`export * from '@ayu-sh-kr/dota-ssr'`), not a shim over renamed internals — "no import migration required" is accurate. | `dota-wrap/src/ssr/index.ts:1` |
| W2 [PROPER] | `initializeApp` composes `dota-core` + `dota-router` + plugin hooks without reimplementing hydration logic — no parallel/duplicated hydration engine found. | `dota-wrap/src/index.ts:150-180` |
| W3 [WORKAROUND-adjacent] | Because `setMountStrategy` throws on double-registration (C2) and `initializeApp` calls every configured plugin's `setup()` unconditionally, **two hydration-capable plugins in the same `plugins` array crash the app at startup** instead of degrading gracefully or erroring with a clear message pointing at the conflict. This constraint is not documented in `AppConfig`'s JSDoc. | `render-strategy.ts:30-36`, `dota-wrap/src/index.ts:29-46,161` |

### 2.6 Cross-cutting terminology drift [INCONSISTENCY] — **[PATCHED, Phase 0]**

The same underlying idea — "let existing DOM survive instead of re-rendering it" — is named differently at every layer: `hydrate` (dota-rendering API), `deferRender` (dota-rendering API, docstring says "retain"), `mount strategy` (dota-core), `handoff` / `captured` / `adopted` / `released` / `invalid` (dota-ssr state machine). A glossary section was added to `documentation/standards/hydration-ssr/README.md` mapping every term to one canonical concept (including the marker-family split covered by S4), with a note on terms to avoid introducing further ("capture" as a hydrate synonym, "release" for anything but the handoff state). The underlying API names themselves are unchanged — this closes the *documentation* gap, not a rename.

### 2.7 Documentation hygiene — **[PATCHED, Phase 0]**

- `documentation/standards/bugs/dota-hydration-initial-route-bug.md` status now reads "Resolved," cites the same `renderer.ts`/`hydration.test.ts` evidence as R2, and its two dead links (`dota-rendering/planning/scoped-hydration-marker-ownership.md`, `dota-ssr/planning/initial-route-hydration-roadmap.md`) were replaced with links to this audit and the hydration-ssr README.
- `documentation/standards/hydration-ssr/README.md`'s links were re-checked against the tree and all resolve — the audit's original claim of dead `packages/libs/*/planning/*.md` links there did not hold; no change was needed.

---

## 3. Roadmap

Ordered by risk reduction per unit effort. Each phase is independently shippable.

**All phases (0–5) are applied (2026-08-08).**

### Phase 0 — Documentation correctness (no code change, do first) — ✅ Applied
- [x] Update `dota-hydration-initial-route-bug.md`: mark the scoped-marker fix as **resolved** (cite `renderer.ts:37,952-953` + `hydration.test.ts:167-189`), remove/replace dead links.
- [x] Fix or remove dead planning-doc links in `hydration-ssr/README.md`. *(Re-checked: no dead links found in the current tree; no change needed.)*
- [x] Add one glossary section (in the README) that maps every term in use (`hydrate`, `deferRender`/`retain`, `mount strategy`, `handoff`/`captured`/`adopted`/`released`) to a single canonical concept, or renames toward one term going forward.

### Phase 1 — Close the router gap (highest risk item) — ✅ Applied
- [x] Decide: should `dota-router` itself become hydration-aware (check for a hydration marker before overwriting on first render), or should standalone use of `dota-router` be explicitly documented as **not SSR-safe without `dota-ssr`**? *(Decided: kept hydration-agnostic, matching `dota-core`'s C1/C2 architecture; documented as not SSR-safe standalone.)*
- [x] Either way, make the current silent behavior loud: if `dota-router` detects marked SSR/SSG output in the root on first render and no hydration interceptor has claimed it, warn (`console.warn`) rather than silently overwriting.
- [x] Remove or actually delete the `@deprecated` `RouterUtils.render` duplicate overwrite path (`RouterUtils.ts:113`) instead of leaving a second copy of the bug alive.

### Phase 2 — Unify mismatch/failure handling — ✅ Applied
- [x] Pick one failure-handling contract (e.g. always `{policy: 'warn'|'throw'}`, resolved the same way regardless of layer) and apply it to: component hydration (already has it), route-marker hydration (S2 — currently silent), and router render-time errors (U3 — currently `console.error`+no-op). *(Implemented as `mismatch: 'warn'|'throw'` on `dotaHydration()` extended to route-marker mismatches, and a new `{onError: 'warn'|'throw'}` option on `createRouteRenderer`/`renderRoute` for router render-time errors. Defaults unchanged in both cases.)*
- [x] Remove or clearly deprecate the global `setHydrationMismatchPolicy` (S1) since it's dead code on the `dota-ssr`-plugin path; if kept, document that it only affects direct `hydrate()` callers who don't pass an explicit option. *(Kept — it's public API and still meaningful outside `dota-ssr` — and marked `@deprecated` with that exact explanation.)*

### Phase 3 — Version the legacy fallback instead of leaving it open-ended — ✅ Applied
- [x] Add an explicit version check (or at minimum a max-supported-legacy-version constant) to `rootHasMarkedPage`'s legacy-template acceptance (S3), so a future marker bump doesn't get silently absorbed by a fallback meant for exactly one transition (v1→v2). *(Added `LEGACY_ROUTE_TEMPLATE_VERSION = 2` as a fixed sentinel, independent of the live `MARKER_VERSION` import.)*
- [x] Unify or explicitly cross-link the route marker version (`data-dh-route-version`, string) and the template marker version (`MARKER_VERSION`, number) so "what hydration protocol version is this build" has one answer, not two (S4). *(Decided: cross-link, not unify — the two counters gate genuinely different contracts. Added explicit JSDoc cross-references in both `route-marker.ts` and `template-id.ts`.)*

### Phase 4 — Composition-root safety — ✅ Applied
- [x] Make `dota-wrap.initializeApp` detect a double `setMountStrategy` registration attempt (W3) before calling plugin `setup()`s, and throw a clear "two hydration-capable plugins configured" error naming both plugins, instead of surfacing dota-core's generic double-registration throw. *(Implemented: `runtimeContext.setMountStrategy` now tracks `mountStrategyOwner`; on a second claim it throws naming both plugins before the dota-core generic error can surface. Covered by a new test in `application-router.test.ts`.)*
- [x] Document the single-mount-strategy constraint in `AppConfig`'s JSDoc. *(Added to the `plugins` field JSDoc in `dota-wrap/src/index.ts`.)*

### Phase 5 — Observability — ✅ Applied
- [x] Add a `HYDRATED` lifecycle event (C4) distinct from `CONNECTED`, fired from the mount-strategy hydrate path, so consumers/telemetry can measure hydration success/failure rates in production — directly useful given R4's blanket try/catch collapses all failure modes into one warning today. *(Implemented: `MountResult` type added to `dota-rendering` extends `RenderInstance` with optional `hydrated?: true`. `MountStrategy` return type updated to `MountResult`. `LifecycleEventConstants.HYDRATED = 'hydrated'` added to `dota-core`. `base-elements.ts` emits `HYDRATED` before `CONNECTED` when `mountResult.hydrated === true`. `dota-ssr`'s `installMountStrategy` tags the successful `hydrate()` result with `{ hydrated: true as const }`; fresh-mount and `deferRender` paths remain untagged. Covered by a new test in `hydration-plugin.test.ts` verifying the flag is present for adoption and absent for fresh mounts and mismatches.)*

---

## 4. What's already good (keep it)

- `dota-core` staying fully hydration-agnostic behind one exclusive extension seam (`setMountStrategy`) — this is the right architectural boundary and should not be compromised when implementing the roadmap above.
- Scoped markers (`data-dh-s`) as the fix for nested-component collisions — this is a real, verified root-cause fix, not a workaround.
- `deferRender()`'s narrow, single-purpose contract and its one clean consumer.
- The `dota-wrap` barrel-export pattern for `dota-ssr` — genuine stability, not a shim.
