# Backward-compatible router integration plan

This plan describes how to make the configured route tree, segment matcher, and
route lifecycle hooks the normal navigation path without breaking applications
that use the current `@ayu-sh-kr/dota-router` API.

The work is intentionally staged. Each stage leaves the package releasable and
keeps the existing history and Navigation API router exports available.

## What exists today

The package already has the pieces needed to begin the migration, but they do not
yet form one complete navigation lifecycle:

- `DotaRouterService.fromComponents()` collects flat decorator metadata or accepts
  explicit flat routes, then calls `configure()` once.
- `configure()` creates a segment-local tree, marks dynamic segments with `slug`,
  and preserves `render`, guard, and lifecycle callbacks.
- `matchRoute()` walks that tree with static-over-slug precedence and returns a
  `RouteConfig`. It does not yet return parameters, the matched branch, query data,
  or hash data.
- `RouterUtils.render()` uses `matchRoute()` and retains the existing custom
  `render(path)` callback, but it also owns fallback navigation and DOM mutation.
- `beforeEnter`, `beforeLeave`, `afterEnter`, and `afterLeave` are public route
  configuration fields only. No runtime code invokes them.
- `DomHistoryRouter` and `DomNavigationRouter` each listen to browser events and
  call `RouterUtils.render()` directly. There is no shared transition state.

This means configuration is centralized, while matching, navigation control,
browser history, and rendering are still coupled at the adapter level.

## Compatibility contract

The migration should preserve these behaviors until a separately documented major
release removes them:

| Existing API or behavior | Compatibility rule |
| --- | --- |
| `new DomHistoryRouter(routes, errorRoute, defaultRoute, root)` | Keep the constructor signature and automatic initial navigation. |
| `new DomNavigationRouter(routes, errorRoute, defaultRoute, root)` | Keep the constructor signature and export. Add a descriptive capability error only when this adapter is explicitly selected without Navigation API support. |
| `router.route(path): void` | Keep it as a fire-and-forget compatibility method that delegates to the new async navigation API. |
| Static `DomHistoryRouter.route()` and `DomNavigationRouter.route()` | Keep as deprecated wrappers during the migration; do not make application code change immediately. |
| `RouteConfig.component` | Continue supporting eager custom-element components. |
| `RouteConfig.render(path)` | Continue invoking the callback with the original path. Adapt it internally rather than changing its argument type. |
| Explicit flat routes and `@Route` components | Continue compiling both sources through `configure()`. |
| Static and nested paths | Preserve exact segment matching and static-over-slug precedence. |
| Existing routes without hooks | They must navigate with no new application work and the same visible result. |

New APIs should be additive. Deprecation annotations can guide consumers toward the
async API, but removals belong in a major release after at least one compatibility
release.

## Target navigation flow

Introduce one transition coordinator used by both browser adapters:

```text
route(path) compatibility wrapper
             │
             ▼
navigate(URL, options) ── create transition and AbortController
             │
             ▼
resolve URL ── match configured tree ── build RouteMatch and matched branch
             │
             ▼
beforeLeave guards ── beforeEnter guards
             │
       allow │ cancel / redirect / failure
             ▼
adapter commits browser state ── renderer updates DOM or calls legacy render(path)
             │
             ▼
afterLeave hooks ── afterEnter hooks ── publish NavigationResult
```

The coordinator owns matching, guard execution, cancellation, redirect limits,
rendering order, and the current successful match. An adapter owns only browser
event subscription and browser-history operations.

## Step 1: lock down current behavior

Before moving responsibilities, add characterization tests for the behavior that
must survive the refactor:

1. Both existing constructors initialize and render the current URL.
2. Both instance `route(path)` methods still navigate.
3. Static, nested, root, slug, missing, and custom-render routes resolve as they do
   now.
4. `render(path)` receives the complete requested pathname.
5. Routes without any lifecycle callbacks do not produce extra calls.
6. `DotaRouterService` compiles explicit flat routes and component metadata through
   the same configuration path.

These tests become the compatibility suite and should remain in place when the new
coordinator is introduced.

## Step 2: add a rich resolver without changing `matchRoute()`

`NavigationContext` requires more information than the current matcher returns.
Add a new pure function, such as `resolveRoute(url, routes, errorRoute)`, that returns
the existing `RouteMatch` contract plus the full matched branch.

The resolver should:

1. Accept `string | URL` and normalize the pathname once.
2. Decode dynamic parameter values while leaving configured route patterns intact.
3. Preserve `URLSearchParams` and `hash` in the result.
4. Return the route chain from root to leaf so parent hooks have deterministic
   lifecycle behavior.
5. Distinguish a successful match from the error fallback instead of relying on
   object identity alone.
6. Keep `matchRoute(path, routes, errorRoute)` as a compatibility wrapper that
   returns only `result.route`.

Additively extend `RouteMatch` with a read-only branch field rather than changing
the meaning of its current fields:

```ts
type RouteMatch<T extends HTMLElement> = {
  route: RouteConfig<T>;
  branch: readonly RouteConfig<T>[];
  matched: boolean;
  params: Readonly<Record<string, string>>;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
};
```

The resolver tests should cover static precedence, colon parameters, bracket
parameters, catch-all behavior, encoded values, trailing slashes, query strings,
fragments, and unmatched paths. Keep the current `matchRoute()` tests to prove the
wrapper remains compatible.

## Step 3: introduce additive navigation contracts

Add an async API while keeping `Router.route(path): void`:

```ts
type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
  scroll?: "reset" | "preserve";
};

type NavigationStatus =
  | "completed"
  | "cancelled"
  | "redirected"
  | "failed";

type NavigationResult<T extends HTMLElement> = {
  status: NavigationStatus;
  match?: RouteMatch<T>;
  redirectTo?: URL;
  error?: unknown;
};

interface Router<T extends HTMLElement> {
  navigate(to: string | URL, options?: NavigateOptions): Promise<NavigationResult<T>>;
  route(path: string): void;
}
```

`route(path)` should call `void navigate(path)` through a small compatibility error
handler. Expected guard cancellation and redirects must be represented by
`NavigationResult`, not emitted as unhandled promise rejections.

Keep `NavigationOption` as a deprecated alias while translating its current string
map into `NavigateOptions.state` where practical. Do not silently reinterpret legacy
keys as `replace` or `scroll`.

## Step 4: build the transition coordinator

Create a router-internal coordinator with no direct dependency on `popstate` or the
Navigation API. It should receive the configured routes, fallbacks, renderer, and a
small adapter interface.

For every navigation it should:

1. Abort the previous in-flight transition.
2. Resolve the destination URL and build `NavigationContext` from the last completed
   match, next match, destination parameters, URL, signal, and history state.
3. Compare the current and next branches. Routes in their common prefix remain
   active and do not run leave or enter hooks again.
4. Run `beforeLeave` from the deepest exiting route toward the root.
5. Run `beforeEnter` from the first entering parent toward the destination leaf.
6. Stop immediately on cancellation, redirect, failure, or `signal.aborted`.
7. Ask the adapter to commit the URL and history state.
8. Render the resolved route.
9. Save the successful match as current state.
10. Run `afterLeave` deepest-first, then `afterEnter` parent-first.
11. Return a typed outcome.

Initial navigation has no current match, so it runs only enter hooks. Navigating to
the same resolved branch should not rerun route lifecycle hooks unless a future
option explicitly requests a reload.

### Guard result rules

- `true` continues the transition.
- `false` returns `cancelled` without committing history or changing the DOM.
- A string resolves against the current origin and starts a new transition.
- A redirect to the same normalized URL is rejected as a redirect loop.
- Redirect chains have a small fixed maximum, such as ten transitions.
- A thrown or rejected guard returns `failed` and leaves the last successful route
  mounted.
- A newer navigation aborts older guards and prevents their later results from
  committing or rendering.

### After-hook rules

After hooks observe a completed transition and cannot cancel it. Their failures
should be reported through an error callback or result diagnostics, but must not roll
back browser history or remove a route that has already rendered. This distinction
keeps guards responsible for control and after hooks responsible for application
effects such as analytics.

## Step 5: separate rendering from navigation

Move route selection and fallback policy out of `RouterUtils.render()`. A renderer
should receive a resolved match and be responsible only for presentation:

```ts
interface RouteRenderer<T extends HTMLElement> {
  render(match: RouteMatch<T>, context: NavigationContext<T>): void | Promise<void>;
  renderError(
    errorRoute: RouteConfig<T>,
    context: NavigationContext<T>,
    reason: unknown
  ): void | Promise<void>;
}
```

The default renderer should preserve current component rendering initially. It must
also include a compatibility adapter:

```ts
if (match.route.render) {
  await match.route.render(match.pathname);
  return;
}
```

Once the coordinator is stable, replace HTML-string interpolation with
`document.createElement()`, explicit property or attribute assignment, and
`replaceChildren()`. That security change should have its own tests and should not be
mixed into the first guard release.

Unknown routes should render `errorRoute` directly. Do not initiate a second
navigation to the hard-coded `/error` path. The existing literal `/error` behavior
can remain temporarily behind the legacy `RouterUtils.render()` wrapper until both
adapters use the coordinator.

## Step 6: adapt the history router

Refactor `DomHistoryRouter` to delegate programmatic navigation to the coordinator:

1. `navigate()` resolves and runs guards before `pushState()` or `replaceState()`.
2. The adapter commits only after guards allow the transition.
3. The compatibility `route()` method delegates to `navigate()`.
4. `popstate` resolves the browser-selected entry through the same coordinator.

Back and forward navigation has already changed the active history entry before the
`popstate` listener runs. To support cancellation reliably, store a router-owned
history index inside a namespaced state field while preserving application state.
When a pop transition is cancelled, move back to the last accepted index without
running a second application transition. Entries without that index, including
entries created before router initialization, should be treated as external entries
and accepted rather than guessed.

Add tests for push, replace, state preservation, back, forward, cancelled pop,
redirected navigation, and an async guard superseded by a newer navigation.

## Step 7: adapt the Navigation API router

Keep `DomNavigationRouter` as an explicit adapter and run the coordinator inside the
intercept handler. The destination URL and `event.signal` should participate in the
transition so browser cancellation also stops application guards.

The adapter must continue ignoring events that cannot be intercepted, hash-only
changes, and downloads. It should map `NavigateOptions` to supported Navigation API
options and let the coordinator render only after guards allow the destination.

Add capability checks before reading `window.navigation`. Existing consumers that
explicitly construct this adapter receive a descriptive error in unsupported
browsers; a later `auto` factory can select `DomHistoryRouter` instead.

## Step 8: move service ownership to the shared pipeline

Update `DotaRouterService` last, after both adapters implement the same additive
contract:

1. Keep `fromComponents()` and its current explicit-route precedence.
2. Continue calling `configure()` exactly once before router construction.
3. Expose `navigate()` as a promise-returning service method.
4. Keep `route()` as its compatibility wrapper.
5. Make initialized router access read-only.
6. Add `destroy()` only after both adapters retain listener references and can remove
   them safely.

Do not make the service detect router classes with `instanceof`. The common `Router`
contract should be sufficient for both built-in and application-provided routers.

## Step 9: release and deprecation sequence

Use additive releases so consumers can migrate gradually:

1. Release the rich resolver, navigation result types, and coordinator behind tests;
   retain the old execution path.
2. Move `DomHistoryRouter` to the coordinator while retaining all wrappers.
3. Move `DomNavigationRouter` to the coordinator.
4. Move `DotaRouterService` to the shared `navigate()` contract.
5. Mark static router methods, `NavigationOption`, direct `RouterUtils.render()`, and
   `RouterUtils.findRoute()` as deprecated.
6. Update the README with the async API and a compatibility example.
7. Remove deprecated APIs only in a later major version with a migration guide.

During the compatibility period, the old and new entry points must reach the same
coordinator. Maintaining two independent match or render algorithms would allow their
behavior to drift again.

## Verification gates

Run the package command after every step:

```bash
pnpm --filter @ayu-sh-kr/dota-router test
```

Do not switch an adapter to the coordinator until these groups pass:

- Existing router, service, matcher, configurer, decorator, and `RouterUtils` tests.
- Resolver tests for full URL state and route parameters.
- Guard tests for allow, cancel, redirect, rejection, ordering, and parent/child
  branch differences.
- Race tests proving aborted async work cannot render or commit history.
- Adapter contract tests run against both browser implementations.
- Compatibility tests proving `route(path)`, legacy custom render callbacks, and
  routes without hooks retain their behavior.

## Files expected to change

| Concern | Expected source location |
| --- | --- |
| Rich route resolution | `packages/libs/dota-router/src/route-matcher.ts` or a neighboring resolver module |
| Navigation and outcome contracts | `packages/libs/dota-router/src/Types.ts` |
| Transition state and hook execution | New internal transition coordinator under `packages/libs/dota-router/src/` |
| Presentation-only rendering | A new renderer module, with `RouterUtils.render()` retained as a wrapper |
| History integration | `packages/libs/dota-router/src/dom-history.router.ts` |
| Navigation API integration | `packages/libs/dota-router/src/dom-navigation.router.ts` |
| Shared construction and public delegation | `packages/libs/dota-router/src/DotaRouterService.ts` |
| Public exports | `packages/libs/dota-router/src/main.ts` |
| Consumer migration examples | `packages/libs/dota-router/README.md` |

## Related documentation

- [Dota Router improvement roadmap](./improvement-roadmap.md)
- [Route configurer flow](./route-configurer-flow.svg)
- [Route matcher flow](./route-matcher-flow.svg)
- [Current RouterUtils matching flow](./router-utils-find-route-flow.svg)
- [Route configuration producers](./route-config-producers.svg)
- [Route resolution: flat configuration and configured tree](./route-resolution-flat-vs-tree.svg)
- [RouterUtils integration steps](./router-utils-integration-steps.md)

## Source references

- [`route-configurer.ts`](../../../packages/libs/dota-router/src/route-configurer.ts)
- [`route-matcher.ts`](../../../packages/libs/dota-router/src/route-matcher.ts)
- [`Types.ts`](../../../packages/libs/dota-router/src/Types.ts)
- [`RouterUtils.ts`](../../../packages/libs/dota-router/src/RouterUtils.ts)
- [`DotaRouterService.ts`](../../../packages/libs/dota-router/src/DotaRouterService.ts)
- [`dom-history.router.ts`](../../../packages/libs/dota-router/src/dom-history.router.ts)
- [`dom-navigation.router.ts`](../../../packages/libs/dota-router/src/dom-navigation.router.ts)
