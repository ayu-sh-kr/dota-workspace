# Initial route hydration roadmap

Fix direct loads of prerendered routes so browser startup adopts the existing route tree instead of removing it during the application root's first mount and recreating it during the router's initial transition.

## Outcome

After this roadmap is complete, a document generated for `/blog/:slug` will retain the same route-host node from static HTML through client startup. String-rendered routes will follow an explicit supported contract, and only later navigation or a verified mismatch will transfer ownership back to normal client rendering.

Nested template-rendered descendants must not be considered reliable until Dota
Rendering implements [scoped hydration marker ownership](../../dota-rendering/planning/scoped-hydration-marker-ownership.md). The current local `pN` markers collide across nested component boundaries.

This is primarily owned by `@ayu-sh-kr/dota-ssr`. Small supporting changes may be needed in Dota Rendering for a deferred `RenderInstance` and in Dota Wrap for capture timing. The router already exposes the renderer and `NavigationContext.initial` seams needed for the route half of the handoff.

## Verified current behavior

The startup order in the current implementation is:

1. `initializeApp()` installs runtime plugins and composes the route renderer.
2. `registerComponents()` calls Dota Core's `bootstrap()`.
3. `customElements.define()` synchronously upgrades the existing application root.
4. `BaseElement.connectedCallback()` invokes the installed mount strategy with the root's render output.
5. The portfolio `AppComponent` returns an empty `TemplateResult`, so ordinary hydration or mismatch recovery can remove the route element that SSG placed under `<app-root>`.
6. Only after component registration does Dota Wrap construct the router.
7. The router starts a navigation for `window.location.href`; the coordinator marks it `initial` because it has no current match.
8. The hydration route wrapper skips injection only if it can still find a marked route element whose selector and `path` match the resolved route.

This makes the current route wrapper necessary but insufficient: it runs after the root upgrade, while the route must be protected before that upgrade.

The existing hydration test named `preserves both the marked outlet and page through the complete initial handoff` does not exercise this order. It calls the mount strategy for the root and page directly, then calls the route wrapper. A regression test must instead define the root custom element around an already populated document and allow the real upgrade and router initialization sequence to run.

## Contract decisions

Resolve these contracts before implementation so the mount strategy, route renderer, and emitted HTML use the same rules.

### Nested marker ownership

Before claiming nested template hydration as complete, upgrade durable rendering
markers from local `pN` identifiers to a unique component-instance scope plus
part identifier. Marker emission and adoption are owned by Dota Rendering; SSR
must regenerate static output and reject the previous marker version safely.

### Route identity

Introduce an SSR route marker independent of `data-dh-t`. It must identify a route host even when the component renders a plain string and therefore has no template identity. The captured snapshot must contain:

- the application root element and route-host element references;
- root and route component selectors;
- the normalized route pathname;
- the route marker/version needed to distinguish Dota SSG output from unrelated static children;
- whether template hydration metadata is present for descendant hydration.

Use the router's normalized matched pathname as the canonical comparison value. Define trailing-slash behavior once and share it between marker emission, snapshot capture, and initial transition validation. Do not compare raw URLs in one phase and normalized match paths in another.

### String-rendered routes

Support string output because it remains part of the public `RenderOutput` contract. The route host can be adopted through the route marker even though its content cannot be fine-grained hydrated. Its first state-driven update must create an ordinary renderer and replace or patch from that point forward.

### Ownership transfer

Root preservation is a one-time startup state, not a permanent exception. The state machine should have explicit `captured`, `adopted`, `released`, and `invalid` outcomes:

- `captured` protects only the matching root's first mount;
- `adopted` is reached only after the initial router transition validates the same host and route;
- `released` transfers future root updates and navigations to ordinary rendering;
- `invalid` immediately delegates to ordinary rendering after a mismatch, missing node, custom route renderer, or failed initial transition.

The state must not remain armed after the initial navigation completes or fails.

## Implementation roadmap

### Phase 1: Add failing end-to-end runtime coverage

Create an integration fixture in `packages/libs/dota-ssr/test` that begins with serialized SSG markup, installs `dotaHydration()`, and then executes the real Dota Wrap/Core startup path.

Cover these baseline assertions:

- defining/upgrading the application root does not disconnect or replace the captured route host;
- the initial router transition does not inject a second host;
- a dynamic article loader runs once rather than once during SSG markup creation and again during client startup;
- a later client navigation replaces the adopted route through the ordinary renderer;
- popstate/back/forward transitions continue through the coordinator;
- the test fails against the current implementation for the root-upgrade reason, not merely because a marker is absent.

Keep focused unit tests for mismatch branches, but do not use manually ordered mount-strategy calls as proof of the complete startup handoff.

### Phase 2: Emit and parse route-level hydration metadata

Add named route-marker constants to `@ayu-sh-kr/dota-ssr`. During prerendering, stamp the default-rendered route host with the marker version and normalized pathname. Do not stamp routes with a custom `route.render`, because their DOM ownership remains application-defined.

Add a parser that returns either a validated immutable snapshot or a reason for rejection. Reject ambiguous output such as multiple marked route hosts under the configured root. Keep template marker validation separate: the route marker establishes route-host adoption eligibility, while `data-dh-t` continues to establish fine-grained template hydration eligibility.

Add serialization tests for both `TemplateResult` and string-rendered pages.

### Phase 3: Capture before custom-element upgrade

Create one initial-route handoff object inside `dotaHydration().setup()`. Capture the snapshot synchronously while the application root is still unupgraded and before `registerComponents()` calls `bootstrap()`.

The capture API should receive the configured root component from the runtime context rather than rediscovering ownership later. If the current wrapper callback is the only place where the root constructor is available, perform capture when the wrapper is composed; Dota Wrap currently invokes that composition before component registration.

Document this timing as part of the Dota Runtime/Dota Wrap plugin contract and protect it with a composition-order test. If future module loading can delay plugin setup until after upgrade, promote capture to an explicit pre-bootstrap runtime hook rather than relying on incidental call order.

### Phase 4: Preserve the root's first mount

Extend the hydration mount strategy with a root-only branch. When the host is the captured application root and the snapshot still matches the live document:

- leave all existing child nodes in place;
- return a valid deferred `RenderInstance` so BaseElement retains normal update and dispose semantics;
- on its first update, create the ordinary renderer with the new output, release the snapshot, and delegate all later updates;
- on dispose, release captured references without clearing committed DOM.

Do not send the root through ordinary `hydrate()` merely because it has template markers: the serialized root template describes the shell render, not the route node appended later by the router. All non-root marked hosts must continue through the existing template-ID/version validation and `hydrate()` path.

Prefer implementing the deferred instance as a small rendering primitive with explicit tests instead of returning an ad hoc object from the SSR package. This preserves the `RenderInstance` contract and makes update/disposal behavior independently verifiable.

### Phase 5: Complete the router handoff

Change the hydration route wrapper to consume the same snapshot used by the mount strategy. Skip the ordinary route renderer only when all conditions hold:

- `context.initial` is true;
- the route uses the default renderer;
- the captured root and route host remain connected with the same parent/descendant relationship;
- the route selector matches the resolved component selector;
- the normalized captured pathname matches both `match.pathname` and `context.url.pathname` under the chosen normalization rule;
- the route marker/version is valid and the snapshot has not already been consumed.

After a successful skip, mark the handoff adopted and disarm the initial-only branch. On any disagreement, invalidate the snapshot and call `next(match, context)`. Every non-initial navigation must call `next` unconditionally.

Ensure SEO updates are not lost when injection is skipped. The default router currently applies route SEO inside `renderRoute()`, so either move SEO application before the hydration wrapper seam or explicitly perform the same router-owned presentation prelude before adopting. Prefer a router-level prelude so renderer wrappers cannot accidentally suppress metadata updates.

### Phase 6: Validate recovery and lifecycle behavior

Add integration and unit coverage for:

- marked `TemplateResult` descendants hydrating without node replacement;
- string-rendered route adoption followed by an ordinary first update;
- missing, stale, malformed, or duplicated route markers;
- root selector, page selector, pathname, and marker-version mismatches;
- route hosts moved outside the configured root before the initial transition;
- custom route renderers always delegating;
- initial guard cancellation, redirect, or render failure releasing the snapshot;
- query/hash-only URL differences following the router's documented route identity rules;
- trailing-slash variants never adopting content for a different route;
- `mismatch: 'warn'` recovering locally and `mismatch: 'throw'` failing without leaving a permanently deferred root;
- SEO being correct after an adopted initial route;
- later navigation and reconnect/disconnect cycles disposing the deferred instance safely.

Run focused tests for Dota SSR, Rendering, Router, Core, and Wrap, then build the portfolio and verify a generated dynamic blog route in a real browser. The browser check must confirm stable route-node identity and no second Markdown request.

### Phase 7: Release and remove application workarounds

Release the packages whose public or runtime contracts changed, update `@ayu-sh-kr/dota-wrap` to expose the fixed SSR version, and document the route marker and string-rendering behavior in the Dota SSR README.

After the fixed package is consumed by Dota Web:

1. configure only `plugins: [dotaHydration(...)]` for the hydration behavior;
2. remove any application-owned initial-static-route preservation utility that still exists on the consuming branch;
3. rebuild all configured SSG routes so they contain the new route marker;
4. verify direct loads, hydration mismatch recovery, forward/back navigation, SEO, and duplicate network requests;
5. retain the browser regression in CI so the issue cannot regress behind unit-level mock ordering.

## Package impact

| Package | Planned responsibility |
| --- | --- |
| `@ayu-sh-kr/dota-ssr` | Own snapshot capture, route metadata, hydration decisions, validation, and most regression tests. |
| `@ayu-sh-kr/dota-rendering` | Provide or validate the deferred render-instance primitive used for one-time DOM adoption. |
| `@ayu-sh-kr/dota-wrap` | Preserve the pre-bootstrap plugin setup/capture ordering and expose the updated SSR package. |
| `@ayu-sh-kr/dota-router` | Preserve initial-transition semantics and ensure SEO/presentation prelude is not skipped by adoption. |
| `@ayu-sh-kr/dota-core` | No intended behavioral change; its real custom-element upgrade lifecycle must be exercised by integration tests. |
| `dota-web` | Serve as the dynamic-route/browser acceptance fixture and remove any temporary workaround after release. |

## Completion criteria

The fix is complete only when all of the following are demonstrated:

- direct loading a generated dynamic route preserves the exact route-host node;
- hydratable descendants preserve their server nodes and bind client updates;
- supported string routes are adopted without requiring `data-dh-t`;
- no duplicate content fetch occurs during startup;
- initial guards, route SEO, mismatch policy, custom renderers, and later navigation retain their existing behavior;
- stale or unrelated DOM cannot suppress normal route rendering;
- the behavior is covered through the real pre-upgrade-to-initial-navigation sequence;
- generated sites are rebuilt with the new route-level marker before the application workaround is removed.

## Related documentation

- [Initial hydration bug report](../../../../standards/bugs/dota-hydration-initial-route-bug.md)
- [SSG build streamlining plan](./streamlining-ssg-build.md)
- [Dota Wrap SSR and Vite plugin composition](../../dota-wrap/configuration/ssr-and-vite-plugin-composition.md)
