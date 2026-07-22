# RouterUtils integration steps

This document describes the first refactor needed to connect the configured route
tree and rich route resolver to the future guard and transition APIs while keeping
the current router adapters and `RouterUtils.render()` callers working.

## Current boundary

`RouterUtils.render()` currently resolves a path, handles the literal `/error` case,
invokes a custom `render(path)` callback, creates component markup, and mutates the
root element. `DomHistoryRouter` and `DomNavigationRouter` call it directly.

That makes it a useful compatibility boundary, but not a suitable transition
coordinator. Guards must run before browser history or DOM mutation, while rendering
should happen only after the destination has been accepted.

## Target boundary

Keep `RouterUtils.render(config)` as a legacy wrapper with the same signature. Move
new navigation callers toward this separation:

```text
legacy RouterUtils.render(config)
          │
          ▼
resolveRoute(url, routes, errorRoute)
          │
          ▼
renderRoute(match, context, router)
```

The future transition coordinator calls the same `resolveRoute()` and
`renderRoute()` functions, but places guards and browser-state commits around them:

```text
resolve → before hooks → adapter commit → renderRoute → after hooks
```

`RouterUtils` should not execute guards, start redirect navigations, or own transition
state.

## Implementation steps

1. Keep `RouterUtils.findRoute()` and `RouterUtils.render()` unchanged while adding
   characterization tests for current callers.
2. Use `resolveRoute()` as the single rich resolver. Keep `matchRoute()` as a wrapper
   returning `RouteMatch.route` for existing callers.
3. Extract component creation, custom `render(path)`, and error-component rendering
   into a renderer function that accepts a resolved `RouteMatch`.
4. Change `RouterUtils.render()` into a compatibility wrapper that resolves the path
   and delegates to that renderer.
5. Move unmatched-route policy out of the renderer. A coordinator should render the
   error match directly instead of navigating to a hard-coded `/error` path.
6. Update both router adapters to call the coordinator, while retaining their current
   constructors and browser-specific history behavior.
7. Deprecate direct `RouterUtils.render()` and `findRoute()` only after both adapters
   use the coordinator and the compatibility tests pass.

## Resolver contract

`resolveRoute()` accepts a pathname or URL and returns a `RouteMatch` containing:

- the selected route;
- the complete root-to-leaf branch;
- decoded slug parameters;
- normalized pathname;
- query parameters;
- hash;
- an explicit `matched` flag.

An unmatched path returns the supplied error route with `matched: false` and an empty
branch. This avoids relying on route object identity and prevents a second navigation
just to display an error page.

## Compatibility rules

- Existing `RouterUtils.render({path, routes, options, router})` callers remain valid.
- Existing `route.render(path)` callbacks receive the same pathname.
- Existing `matchRoute()` callers continue receiving `RouteConfig`.
- Existing routes without hooks behave as before.
- `DomHistoryRouter` and `DomNavigationRouter` remain independently selectable.
- The new resolver is pure: it does not mutate route configuration, browser history,
  or the DOM.

## Verification

Run the focused package suite after each step:

```bash
pnpm --filter @ayu-sh-kr/dota-router test
```

The resolver tests should cover literal precedence, nested branches, parameters,
catch-all slugs, query and hash preservation, trailing slashes, and explicit error
matches. Existing matcher, renderer, adapter, and service tests remain the
backward-compatibility gate.

## Related documentation

- [Backward-compatible router integration plan](./backward-compatible-router-integration-plan.md)
- [Route matcher flow](./route-matcher-flow.svg)
- [Current RouterUtils matching flow](./router-utils-find-route-flow.svg)

