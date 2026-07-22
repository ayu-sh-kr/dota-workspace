# Dota Router improvement roadmap

This document records a source-backed plan for making `@ayu-sh-kr/dota-router` more predictable, more portable, and capable of handling application-scale navigation. It is a proposal: the features below are not implemented unless explicitly stated as current behavior.

The staged implementation and compatibility strategy is documented in the
[backward-compatible router integration plan](../migration/backward-compatible-router-integration-plan.md).

## Current design and boundaries

The package provides two browser routers:

- `DomHistoryRouter` writes browser history and re-renders on `popstate`.
- `DomNavigationRouter` intercepts the experimental Navigation API and re-renders the matching route.

Both routers delegate route lookup and DOM rendering to `RouterUtils`. `DotaRouterService.fromComponents()` can create route configuration from `@Route` metadata, or consume explicit routes.

The router is deliberately browser- and custom-element-oriented. It currently renders a route by replacing the configured root element's `innerHTML` with the component selector. Keep that boundary explicit when extending the router: application state and rendering policy should remain application-owned, while path parsing, matching, transition control, and browser-history adaptation belong in the router.

## Priority 1: correctness and predictable navigation

### Introduce one URL and route-matching model

`RouterUtils.findRoute()` compares strings and uses `path.startsWith(route.path)`. This can match a segment incorrectly: `/usersettings` starts with `/users`. It also discards search parameters and fragments because both router implementations only pass `url.pathname` to `RouterUtils.render()`.

Create a small, pure matching layer—for example `RouteMatcher`—with these responsibilities:

- Normalize leading and trailing slashes once, without changing encoded URL segments.
- Match whole segments, so `/users` does not match `/usersettings`.
- Prefer the most specific static route over a parameterized or catch-all route.
- Return a named `RouteMatch` contract containing `route`, `params`, `pathname`, `searchParams`, and `hash`.
- Keep route configuration immutable during matching.

Add explicit route patterns in a backward-compatible sequence:

```ts
type RoutePath = "/users/:userId" | "/docs/*";

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

Test static precedence, parameter extraction, catch-all matching, encoded values, trailing slashes, query strings, fragments, and the `/users` versus `/usersettings` boundary.

### Make default and error behavior part of the contract

`defaultRoute` is required by the router constructors but is not read when rendering. Unknown paths route to the literal `/error`, and only that literal path receives the error component. As a result, `errorRoute.path` and `defaultRoute` do not currently control behavior.

Define the policy clearly and implement it in one place:

- Render `defaultRoute` when the normalized initial path is `/`, or remove the field if `/` is the only supported default.
- Render `errorRoute` directly for an unmatched path; avoid a second history transition to a hard-coded `/error` path.
- Pass the unmatched URL and a typed failure reason to the error route.
- Validate that the configured default and error routes have components and valid paths during router creation.

This removes the hard-coded error-path special case from `RouterUtils.render()` and makes configuration reliable.

### Stop mutating decorator metadata while building nested routes

`RouterUtils.prepareConfig()` obtains route objects from reflection metadata and `addRoute()` modifies `route.path` as it restructures the tree. It can also create `UnknownComponent` placeholders for missing parent paths. Reusing the same decorated components can therefore produce order-dependent route configuration.

Replace this with a pure compilation step:

1. Read metadata into cloned route records.
2. Validate duplicate paths, parent/child conflicts, and missing parent layouts.
3. Return a new immutable route tree or a flat compiled matcher.

Do not synthesize a component for an implicit parent. Instead, either permit a component-less layout route with an explicit `outlet` contract or reject the configuration with a useful error. Add regression tests that call `prepareConfig()` repeatedly and verify the metadata and output are unchanged.

## Priority 2: browser compatibility and lifecycle efficiency

### Select the navigation adapter at runtime

`DomNavigationRouter` accesses `window.navigation` directly. Browsers without the Navigation API fail during initialization, and `RouterUtils.getPreviousPath()` has the same dependency. `DomHistoryRouter` is already a practical fallback.

Expose a factory or adapter choice:

```ts
type RouterMode = "auto" | "navigation" | "history";

createRouter({ mode: "auto", ...config });
```

In `auto` mode, use the Navigation API only when it is available; otherwise use history. In `navigation` mode, throw a descriptive capability error if unavailable. Keep the public `route()` API consistent across adapters. Test both branches by removing and restoring `window.navigation` in a browser-like test environment.

### Add disposal and avoid duplicate listeners

Both router constructors call `init()` immediately and install anonymous event listeners. A router cannot be torn down, and recreating it can add duplicated `popstate` or `navigate` handlers.

Extend `Router` with `destroy(): void`, retain listener references, and make `init()` idempotent. `DotaRouterService` should expose the lifecycle rather than leaving `instance` public and mutable. This improves long-running development sessions, tests, embedded applications, and future router replacement.

### Centralize navigation state and history policy

The optional `NavigationOption` parameter is accepted by both static `route()` methods but is ignored. Current history entries always use `null` state and a push transition.

Replace it with a purposeful typed option contract:

```ts
type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
  scroll?: "reset" | "preserve";
};
```

Implement `replace` using `history.replaceState()` or Navigation API options where supported. Preserve and expose `history.state` in the navigation context. Define scroll restoration after a successful transition and test push, replace, state, back/forward, and failed navigation behavior.

## Priority 3: application features

### Guards, redirects, and transition outcomes

Add optional `beforeEnter` and `beforeLeave` hooks that can return `true`, `false`, or a redirect URL, and may be asynchronous. A guard needs a navigation context containing the current match, next match, signal, params, URL state, and history state.

Run guards before mutating the DOM or committing a history update. Use an `AbortController` per transition so a newer navigation cancels stale asynchronous work. Publish an outcome such as `completed`, `cancelled`, `redirected`, or `failed`; this gives applications reliable loading indicators and analytics hooks.

### Layout routes and outlets

Nested configuration currently finds a leaf route and renders only one custom element. A parent component is not retained as a layout around its child. Add an explicit outlet model before introducing more nesting features:

- A layout route renders a component containing a named outlet element.
- The child route renders into that outlet.
- Parent layouts remain mounted when navigating between siblings.

Define whether outlets are DOM selectors, web-component slots, or a small rendering interface. Avoid relying on string replacement of the root element for this feature; it would destroy every parent layout on navigation.

### Lazy route components and preload hooks

Allow a route to use `loadComponent: () => Promise<ComponentClass>` in addition to an eager `component`. Cache a successful load per router instance, surface loading errors through the error route, and allow route-level `preload()` hooks. This reduces initial bundle work and supports code-split pages.

Include cancellation checks before mounting a resolved component so late imports cannot overwrite a newer navigation.

### Link interception and active-link state

Provide a small opt-in link helper or custom element that:

- Intercepts only same-origin primary-click navigation.
- Preserves modifier keys, downloads, external links, `target`, and hash-only navigation.
- Calls the active router rather than a static global.
- Updates `aria-current="page"` for active links.

This feature should be built on the router's normalized URL model, not on ad-hoc string comparisons.

## Rendering and security hardening

`RouterUtils.render()` interpolates component selectors, `path`, and an error message directly into `innerHTML`. Component selectors come from trusted metadata, but paths and error messages can originate from URLs or application input. Direct HTML interpolation also prevents a route renderer from controlling element creation and update timing.

Introduce a renderer interface that creates elements through DOM APIs, assigns properties deliberately, and replaces only the intended container:

```ts
interface RouteRenderer {
  render(match: RouteMatch<HTMLElement>, context: NavigationContext): void | Promise<void>;
}
```

For the default renderer, use `document.createElement(selector)` and `root.replaceChildren(element)`. Pass route state as a property where possible; if an attribute is required, use `setAttribute`. This makes state flow explicit and avoids HTML-string injection.

## API and type cleanup

The public types expose implementation fields such as `_router`, `_routes`, and `instance`, while `RouterConstructor` and `ComponentClass` accept `any[]`. Move to a public configuration and read-only service contract:

```ts
interface RouterService<T extends Router<HTMLElement>> {
  readonly instance: T;
  init(): this;
  navigate(to: string | URL, options?: NavigateOptions): Promise<NavigationResult>;
  destroy(): void;
}
```

Keep any legacy aliases only through a deprecation period. Use named contracts for route metadata, navigation context, matching results, and outcomes. This makes future features additive instead of forcing another broad signature change.

## Documentation and test work

The package README currently shows an object constructor signature and static navigation options that the source does not implement. Update it alongside the API so examples are executable. Explain the browser support policy, the relationship between history and Navigation API adapters, route path syntax, nested-layout behavior, error behavior, and disposal requirements.

Add focused tests for:

- Feature detection and history fallback.
- Normalization and route precedence.
- Parameter, search, hash, and history-state delivery.
- Default/error route selection without a hard-coded `/error` path.
- Guard cancellation, redirect loops, and async race cancellation.
- Lifecycle teardown and multiple-router listener safety.
- Lazy loading success, failure, cache behavior, and stale-transition protection.
- DOM rendering without `innerHTML` interpolation.

Run the package test command after each milestone:

```bash
pnpm --filter @ayu-sh-kr/dota-router test
```

## Suggested implementation order

1. Correct the documented API and add characterization tests for the current routers.
2. Build pure URL normalization, matching, and route validation; retain legacy static routes initially.
3. Make default/error handling configuration-driven and replace string-based rendering.
4. Add adapter selection, lifecycle disposal, and typed navigation options.
5. Add guards and transition outcomes.
6. Add layouts/outlets, then lazy components and link helpers.

Each step should preserve the existing `DomHistoryRouter` and `DomNavigationRouter` exports until a documented migration path is available.

## Source references

- [`DotaRouterService.ts`](../../../../../packages/libs/dota-router/src/DotaRouterService.ts) configures router instances from components or routes.
- [`RouterUtils.ts`](../../../../../packages/libs/dota-router/src/RouterUtils.ts) currently matches routes, builds nested configurations, and writes route markup.
- [`dom-history.router.ts`](../../../../../packages/libs/dota-router/src/router/dom-history.router.ts) implements the history adapter.
- [`dom-navigation.router.ts`](../../../../../packages/libs/dota-router/src/router/dom-navigation.router.ts) implements the Navigation API adapter.
- [`Types.ts`](../../../../../packages/libs/dota-router/src/Types.ts) defines the present public contracts.
- [`README.md`](../../../../../packages/libs/dota-router/README.md) contains usage examples that should be aligned with the implementation.
