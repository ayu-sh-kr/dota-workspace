# BaseElement startup rendering and viewport deferral plan

**Status:** Runtime analysis and proposed implementation; no deferral code is implemented  
**Reviewed:** 2026-08-05  
**Primary source:** [`BaseElement`](../../../../../packages/libs/dota-core/src/core/elements/base-elements.ts)

## Summary

The landing-page component tree does not render in parallel. After the router writes the
route element into `app-root`, registered custom elements connect on the JavaScript main
thread in a synchronous, depth-first cascade. In the current home page, the first section
fully renders its nested components before the next sibling section starts. No browser
paint can occur in the middle of that call stack.

A Microsoft Edge 151 trace of the current development landing page recorded:

| Observation | Result |
| --- | ---: |
| Registered custom-element definitions | 92 |
| Custom-host `innerHTML` writes during the complete load | 90 |
| Writes in the routed `app-root` → `home-page` cascade | 86 |
| Maximum nested `innerHTML` depth | 5 |
| Routed cascade duration over five local samples | 3.6–4.8 ms |
| Direct home sections intersecting a 1280 × 720 viewport | 1 of 11 (`app-hero`) |

The duration is a local, instrumented development measurement and is not a production or
low-end-device claim. The stable finding is the operation count: all 10 direct children
below the hero, including the footer, were constructed outside the initial viewport.

Most of these writes are initial renders, not reactive re-renders. The startup problem is
therefore an eager-mount problem. The P2 microtask scheduler reduces updates after mount;
it does not change initial `connectedCallback()` rendering.

## Current document-load behavior

### Stage 1: the HTML parser creates unregistered hosts

The application document initially contains `app-root`, `notification-holder`, and
`loader-section`. At this point they can exist as unknown elements because the module
script has not finished registering their constructors.

### Stage 2: component modules load, then definitions are registered sequentially

`initializeApp()` obtains all generated component modules through `Promise.all`. Their
loads can be initiated together, but JavaScript evaluation and rendering still run on the
main thread. Once extraction finishes, `bootstrap()` calls `customElements.define()` in a
normal `forEach`, one selector at a time.

Defining a selector upgrades matching unknown elements that are already connected. This
means the three top-level hosts from `index.html` do not necessarily connect in document
position order; they connect when their respective definitions are registered. A browser
probe with two pre-existing unknown siblings, defining the second selector first, produced
`second → first` connection order.

In the application trace, defining `app-root` upgrades the existing host and immediately
runs its `connectedCallback()`. `AppComponent.render()` returns an empty string, so
`bindHTML()` performs a redundant initial `app-root.innerHTML = ""` write.

### Stage 3: the router mounts the route after registration

The router is initialized only after component registration. Its route renderer then
writes this shape into the root host:

```html
<home-page path="/"></home-page>
```

That is the second `app-root.innerHTML` write. Since `home-page` is already registered, it
constructs and connects while the root setter is still executing.

### Stage 4: each connected component synchronously builds its subtree

`BaseElement.connectedCallback()` calls `bindHTML()` before its promise collection.
`bindHTML()` immediately calls `render()` and assigns the result to `innerHTML`. If that
HTML contains registered custom elements, their constructors and callbacks execute before
the parent's `innerHTML` assignment returns.

The observed landing sequence has this shape:

```text
app-root writes <home-page>
  home-page writes its page shell
    app-header writes its view
      github-button writes its view
        dota-icon writes its view
      dark-mode-button writes its view
        dota-icon writes its view
      ...header descendants finish...
    app-hero writes its view
      orb-background writes its view
      get-started-button writes its view
    app-feature writes its view
      ...feature descendants finish...
    code-section writes its view
    ...remaining siblings continue in markup order...
    app-footer writes its view
  home-page innerHTML setter returns
app-root innerHTML setter returns
```

For this specific registered-element insertion path, the first sibling finishes its
nested connection work before the next sibling begins. The browser is not running the
sections concurrently. The HTML standard describes custom-element reactions as appearing
synchronous for most operations—processed just before returning to user script—but warns
that complex mutations do not have one global cross-element ordering guarantee. See the
[WHATWG custom-element reaction requirements](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-reactions).

The `async` binding methods in `BaseElement` do not defer their bodies because they contain
no `await`. They finish synchronously and return resolved promises. Only the later
`Promise.all(...).then(...)` lifecycle notification crosses a microtask boundary, after
the eager DOM cascade has already completed.

## Why an observer alone does not fix startup rendering

Adding an `IntersectionObserver` in `AfterInit` or after the existing
`connectedCallback()` is too late. The initial `bindHTML()` assignment and every nested
component render have already happened before the observer can deliver its asynchronous
first notification.

Similarly, applying `content-visibility: auto` does not prevent `render()`, HTML parsing,
custom-element construction, or DOM allocation. The content remains in the DOM; the
browser may skip its layout and paint while it is offscreen. This is still valuable, but
it addresses a different portion of startup cost. See the
[content-visibility behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility).

Reducing initial Dota DOM construction requires one of these boundaries before
`bindHTML()`:

1. The component host connects, but an opt-in `BaseElement` policy postpones its first
   view mount.
2. The component definition or module import is postponed, leaving an inert, sized custom
   element host until it approaches the viewport.
3. Existing server/build markup is adopted through hydration instead of being rebuilt.

## Proposed rendering policies

Keep eager rendering as the default. Deferral changes lifecycle timing, DOM availability,
search behavior, and accessibility, so it must be explicit per component or route section.

The configuration could evolve toward a contract like this:

```ts
type InitialRenderPolicy =
  | {mode: "eager"}
  | {
      mode: "viewport";
      rootMargin?: string;
      intrinsicBlockSize: string;
    }
  | {mode: "outlet"};
```

The exact public type needs a separate API review. Its intended behavior is:

- `eager`: preserve all current component semantics;
- `viewport`: wire the host, reserve its layout space, and mount the view once the host is
  inside a preload margin;
- `outlet`: never render host-owned HTML because another subsystem, such as the router,
  owns the host's children.

`app-root` is the first candidate for `outlet`. It currently renders `""`, while the
router owns its actual content. This avoids the redundant first write and creates a clean
future seam for preserving a server-rendered route shell.

## Viewport-first mount design

### Separate host connection from view mounting

The current `__initialized` boolean combines several states. Viewport deferral needs an
explicit state machine:

```text
disconnected
  -> connected-unmounted
  -> mounting
  -> mounted
  -> disconnected
```

Split the lifecycle into two responsibilities:

1. **Connect host:** establish property/state storage, reflection, observer registration,
   cancellation state, and any listener required before the view exists.
2. **Mount view:** call `render()`, commit `innerHTML`, bind `@Element` references and
   delegated view behavior, mark the view initialized, then publish view-ready lifecycle
   notifications.

Property and state mutations received while `connected-unmounted` should update their
latest backing values and set a dirty flag without scheduling a DOM update. The first
mount renders that final state once.

### Preserve lifecycle meaning

Today, `CONNECTED` and `AfterInit` imply that the component's rendered DOM is available.
Emitting them as soon as an empty deferred host connects would break consumers that query
the view.

The compatibility-first option is:

- keep `BeforeInit` at host connection;
- delay `AfterInit`, `CONNECTED`, and the first `DOM_UPDATED`-style notification until the
  view mounts;
- add a separate `HOST_CONNECTED` event only if consumers need the native connection
  moment;
- document that viewport components can be physically connected before their framework
  `CONNECTED` event.

Watchers require an explicit decision. A watcher can currently assume normal synchronous
property semantics but may also touch rendered nodes. The safest first version should
queue watcher invocations that occur before first mount and run each affected watcher once
against the final value, or reject viewport mode for components whose watchers require
per-mutation effects. This behavior must be tested and documented rather than inferred.

### Use a shared viewport coordinator

Do not allocate one `IntersectionObserver` per component. Introduce a narrow
`ViewportRenderCoordinator` that owns shared observers grouped by configuration such as
`root`, `rootMargin`, and `threshold`.

For a viewport component:

1. Apply a block-size placeholder before observing it.
2. Observe with `threshold: 0` and a positive `rootMargin`, initially around one viewport
   or a measured pixel distance.
3. When `isIntersecting` becomes true, verify that the element is still connected and the
   observation generation is current.
4. Unobserve it before mounting so nested layout changes cannot request a second mount.
5. Mount the view and clear the temporary placeholder constraint.

`rootMargin` allows the component to mount before it is visible, rather than making the
user wait at the viewport edge. Intersection Observer is asynchronous and widely
available for this application-logic use case. See the
[Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
and [`rootMargin`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin).

### Reserve layout space

An empty custom-element host normally has no useful block height. Without a placeholder,
all deferred siblings can collapse to the same location, appear intersecting together,
and mount immediately—the opposite of the desired result.

Viewport mode therefore requires:

- a block formatting role for the host;
- a required or component-defined estimated block size;
- `contain-intrinsic-size` when `content-visibility` is also enabled;
- layout-shift measurement at phone, tablet, and desktop breakpoints.

The estimate may be responsive. `ResizeObserver` can record the actual post-mount size for
diagnostics or improve an in-session estimate, but it must not be the initial visibility
trigger and must not write sizes in a feedback loop. See the
[Resize Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API).

## Use each browser observation API for one job

| API or signal | Recommended Dota role | What it does not solve |
| --- | --- | --- |
| `IntersectionObserver` | Trigger opt-in initial mount, data fetch, or module import shortly before a host reaches the viewport | Cannot undo a view already rendered by `connectedCallback`; requires a sized host |
| `content-visibility: auto` | Let the browser skip layout/paint for already-created, self-contained below-fold DOM | Does not reduce `render()`, `innerHTML`, constructors, or DOM node count |
| `contentvisibilityautostatechange` | Pause/resume canvas, animation, polling, or explicitly visual update work in step with the browser's rendering relevance | Must not suppress significant semantic DOM updates merely because content is skipped |
| `ResizeObserver` | Measure mounted size and validate placeholder estimates | Is not a viewport signal; careless size writes can create observer loops |
| Page Visibility API | Pause nonessential rendering and warming while the entire document is in a background tab | Does not identify which section is onscreen |
| `PerformanceObserver` | Measure long tasks, paint/LCP, layout shifts, and interaction regressions | Observes results; it does not schedule rendering |
| `MutationObserver` | Optional discovery of externally inserted lazy hosts when no framework insertion hook exists | Is not a visibility API; a global subtree observer can add traversal work during the same DOM cascade |
| `requestIdleCallback` | Optional best-effort warming after critical content, behind feature detection and a timeout | Has limited availability and must not be required for correctness |

For already-mounted visual workloads, `contentvisibilityautostatechange` is closer to the
browser's rendering decision than exact viewport intersection. The browser can prepare
content before it becomes visible. Its event is documented by MDN under
[`contentvisibilityautostatechange`](https://developer.mozilla.org/en-US/docs/Web/API/Element/contentvisibilityautostatechange_event).

The Page Visibility API can prevent background-tab warming and pause nonessential tasks;
see the [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
`requestIdleCallback` should remain optional because it is not Baseline and required work
can otherwise be delayed for seconds; see [`requestIdleCallback`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback).

## Content-visibility rollout before JavaScript mount deferral

A CSS-only experiment is the lowest-risk first step. Apply `content-visibility: auto` and
`contain-intrinsic-size` to large, self-contained sections known to begin below the initial
fold. Do not apply it to `app-header` or `app-hero`.

Initial home-page candidates are:

- `app-feature` through `faq-section`;
- `app-footer`;
- especially `our-tools`, whose current measured host height was about 19,152 px at the
  1280 px trace viewport.

This phase should improve style, layout, and paint work but is expected to leave the 86
startup `innerHTML` writes unchanged. That unchanged operation count is an important test:
it prevents presenting browser paint containment as Dota render deferral.

Each candidate needs an intrinsic-size estimate. The modern guidance used for this review
also requires keyboard-navigation verification and warns against applying
`content-visibility: auto` indiscriminately above the fold.

## Deferring initial DOM construction

After the CSS-only baseline, add viewport mount as an opt-in `BaseElement` policy.

For the home route:

- keep `app-header` and `app-hero` eager;
- begin with one large, isolated below-fold candidate such as `our-tools`;
- use a preload margin so its mount completes before the user reaches it;
- expand to other sections only after layout-shift, accessibility, and interaction tests
  pass.

Do not initially defer text that must be available to search engines, browser find-in-page,
assistive technology, hash navigation, or immediate keyboard navigation. An unmounted view
does not exist in the semantic DOM. For meaningful content, prefer `content-visibility`
until SSR/build output can be preserved through hydration.

Hash navigation needs a route-level escape hatch: if `location.hash` targets content
inside a deferred section, mount the owning section before scrolling or focusing. Native
find-in-page cannot discover content that has not been created, so searchable sections
must remain eager, use `hidden="until-found"` for a compatible disclosure use case, or be
provided through SSR/hydration.

## Optional module-registration deferral

The generated `virtual:dota-components` module currently leads `initializeApp()` to load
all component modules before `bootstrap()` registers them. A later plugin/wrapper phase
could emit a selector-to-loader manifest instead:

```ts
type ComponentLoaderManifest = Record<string, () => Promise<CustomElementConstructor>>;
```

Critical root, route, header, hero, and shared UI selectors would register eagerly.
Unknown below-fold hosts would remain inert and sized until the viewport coordinator
imports and defines their selectors.

This can reduce module download, evaluation, registration, and view construction, but it
has important boundaries:

- defining a selector upgrades all matching connected hosts for that selector;
- common elements such as `dota-icon` cannot be deferred per instance once the selector
  is needed above the fold;
- parent-section deferral remains useful because its nested common elements do not exist
  until that parent mounts;
- route metadata must remain available without importing every route component, requiring
  generated route descriptors separate from constructors.

This work belongs to `dota-vite-preloader`/`dota-wrap`, not solely to `BaseElement`, and
should follow the core lifecycle policy rather than be coupled into it.

## Offscreen updates after first mount

Initial mount deferral and update deferral are separate policies. After a component has
mounted, a future opt-in policy may keep the latest state dirty while browser rendering is
skipped, then flush once when the component becomes relevant again.

This is appropriate for visual-only components such as animations, canvases, previews,
and rapidly changing dashboards. It is unsafe as a general default because offscreen DOM
can remain relevant to accessibility, form state, programmatic queries, and application
logic.

If implemented:

- attributes and property backing values continue updating immediately;
- watchers with nonvisual side effects continue according to their contract;
- only the DOM commit is held;
- the component flushes one final render when it becomes relevant;
- explicit `updateHTML()` remains an immediate compatibility escape hatch;
- disconnect cancels pending observer and update generations.

This extends the current microtask **Unit of Work** with a visibility gate. The observer is
the eligibility signal; the existing scheduler still coalesces mutations once eligible.

## Design principles and patterns

| Principle or pattern | Application |
| --- | --- |
| Strategy | `eager`, `viewport`, and `outlet` select initial-render behavior without branching through every component |
| State | Explicit connection/mount states replace one overloaded `__initialized` boolean |
| Observer | Browser observations notify a shared coordinator; components do not poll layout |
| Unit of Work | Pre-mount and offscreen mutations settle into one render of the latest state |
| Single Responsibility | Host connection, view mounting, scheduling, and visibility coordination have separate owners |
| Open/Closed | New render policies can be added without changing eager component behavior |
| Progressive Enhancement | Unsupported containment features fall back to eager browser rendering; correctness does not depend on them |
| Pay for Play | Eager components allocate no viewport observer state; only opted-in components pay for deferral |

## Implementation phases

### Phase 0 — Add reproducible startup evidence

1. Add a browser benchmark that instruments custom-host `innerHTML` writes, maximum nested
   depth, DOM node count, FCP/LCP, layout shifts, and long tasks.
2. Run production builds on desktop and a throttled/mobile profile; retain operation counts
   separately from wall-clock timing.
3. Add a nested custom-element ordering fixture so lifecycle refactors do not silently
   change parent/child readiness.

Use `PerformanceObserver` for supported paint, layout-shift, and long-task entries; see
[Performance data entry types](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data).

### Phase 1 — Remove startup work with no semantic value

1. Add an outlet/no-view mode and apply it to `app-root`.
2. Align synchronous lifecycle helper contracts and remove synthetic promise allocation as
   described in the performance follow-up.
3. Avoid an initial write when eager `render()` output is identical to committed content,
   with hydration behavior kept as a separate decision.

### Phase 2 — Measure CSS containment

1. Apply `content-visibility: auto` plus responsive intrinsic sizes to one below-fold home
   section.
2. Verify that `innerHTML` counts remain constant while style/layout/paint metrics improve.
3. Test keyboard traversal, focus, hash navigation, scrollbar stability, and find-in-page.
4. Expand only to sections with measurable benefit.

### Phase 3 — Introduce opt-in viewport mount

1. Extend component metadata with an internal render-policy contract.
2. Split host connection from first view mount.
3. Add the shared viewport coordinator and generation-based cancellation.
4. Preserve eager behavior byte-for-byte at the public lifecycle boundary.
5. Pilot one noncritical section, then compare startup DOM writes, nodes, memory, and LCP.

### Phase 4 — Gate visual-only offscreen updates

1. Add an opt-in update policy using `contentvisibilityautostatechange` with an
   `IntersectionObserver` fallback where the browser-support policy requires it.
2. Accumulate dirty state without accumulating render callbacks.
3. Flush once when relevant and verify watcher/lifecycle ordering.

### Phase 5 — Defer module registration

1. Generate selector and route loader manifests.
2. Define critical selectors eagerly and viewport selectors on demand.
3. Ensure routes, error handling, external components, and hot reload remain deterministic.
4. Measure transfer, evaluation, registration, and mount improvements independently.

### Phase 6 — Integrate structured templates and hydration

Use the renderer strategy proposed in the related performance plan so semantic server or
build markup can be present immediately and adopted rather than rebuilt. Hydration is the
long-term way to combine discoverable initial content with reduced client construction.

## Required tests and acceptance gates

The implementation must cover:

1. Eager components keep current synchronous initial DOM availability.
2. Viewport components do not call `render()` before eligibility.
3. Several pre-mount mutations produce one first render with final values.
4. A component disconnected before observer delivery never mounts.
5. A stale callback from an earlier connection cannot mount after reconnection.
6. A component already inside the preload margin mounts once.
7. Nested components mount only after their deferred parent mounts.
8. Shadow and light DOM follow the same policy.
9. `@Element`, delegated events, attributes, watchers, `AfterInit`, and lifecycle events
   follow the documented mount ordering.
10. Hash/focus requests force the relevant section to mount before navigation completes.
11. Unsupported observer or containment APIs fall back to eager correctness.
12. No layout shift exceeds the agreed budget at supported breakpoints.

Before broad rollout, require:

- a lower initial custom-host write count and DOM node count for the selected route;
- no regression in above-fold LCP or interaction readiness;
- no new long task attributable to mounting several sections at one observer callback;
- staged mounting when several targets become eligible together, bounded by a per-frame
  work budget if measurements show a burst;
- no accessibility, keyboard, find-in-page, SEO, or hash-navigation regression in the
  chosen sections;
- all Dota Core, Dota UI, router, wrapper, and application builds/tests green.

## Related documentation and source

- [Rendering, hydration, and patching architecture roadmap](./dota-core-rendering-hydration-architecture-roadmap.md)
- [P2–P6 rendering implementation report](./base-element-p2-p6-rendering-improvement-plan.md)
- [BaseElement performance follow-up](./base-element-performance-follow-up.md)
- [Original rendering and hydration audit](../../../../standards/audits/dota-core-base-element-rendering-hydration-audit.md)
- [Application initialization](../../../../../packages/libs/dota-wrap/src/index.ts)
- [Component registration](../../../../../packages/libs/dota-core/src/core/helper/bootstrap.ts)
- [Route mounting](../../../../../packages/libs/dota-router/src/coordinator/route-renderer.ts)
- [Dota Web application root](../../../../../packages/apps/dota-web/src/app.component.ts)
- [Dota Web home component tree](../../../../../packages/apps/dota-web/src/pages/home.page.ts)
