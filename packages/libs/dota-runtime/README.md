# @ayu-sh-kr/dota-runtime

Shared contracts for connecting opt-in runtime extensions to a Dota application.
The package deliberately contains types only: it does not register custom
elements, render DOM, start a router, run Vite, or perform SSG itself.

Runtime extensions use these contracts to add behavior at the two places where
an application composition root must make a decision:

1. `setMountStrategy()` chooses how a component's first output is associated
   with its existing root.
2. `wrapRouteRenderer()` decorates the router's presentation step while keeping
   the current renderer available as the fallback.

This keeps extensions such as hydration independent from Dota Wrap while still
giving `initializeApp()` a small, stable integration surface.

## Installation

```sh
pnpm add @ayu-sh-kr/dota-runtime
```

Most application developers consume these contracts indirectly through
`@ayu-sh-kr/dota-wrap`. Install this package directly when authoring a runtime
plugin or another composition root.

## The runtime plugin contract

`DotaRuntimePlugin` has a diagnostic `name` and an optional `setup()` hook. Dota
Wrap calls `setup()` before it defines the application's custom elements. That
ordering matters: a plugin can configure the first-mount policy before a
component connects and tries to render.

```ts
import type {DotaRuntimePlugin} from '@ayu-sh-kr/dota-runtime';

export const navigationDiagnostics: DotaRuntimePlugin = {
  name: 'navigation-diagnostics',
  setup(context) {
    context.wrapRouteRenderer((next) => async (match, navigation) => {
      const startedAt = performance.now();

      try {
        await next(match, navigation);
      } finally {
        console.debug('[navigation]', {
          path: navigation.url.pathname,
          route: match.route.path,
          durationMs: performance.now() - startedAt
        });
      }
    });
  }
};
```

The wrapper receives the current `RouteRenderer` and the root component. It
must call the received renderer for normal route transitions unless it has a
specific reason to take ownership of that transition. Keeping the fallback is
what allows several extensions to compose without replacing one another.

## Mount strategies

`MountStrategy` is the initial component-render boundary from Dota Core. A
strategy receives the component host, its `Element` or `ShadowRoot`, and the
component's first `RenderOutput`; it returns the normal `RenderInstance` used
for later updates.

An extension can use this socket to adopt a compatible representation that is
already in the DOM. The hydration package uses exactly this pattern: it checks
the serialized template identity and marker version, calls `hydrate()` when
they match, and falls back to ordinary `render()` when they do not.

```ts
import {render} from '@ayu-sh-kr/dota-rendering';
import type {DotaRuntimePlugin} from '@ayu-sh-kr/dota-runtime';

export const loggingMounts: DotaRuntimePlugin = {
  name: 'logging-mounts',
  setup(context) {
    context.setMountStrategy((host, root, output) => {
      console.debug('[mount]', host.localName);
      return render(root, output);
    });
  }
};
```

The example above preserves the default behavior while observing mounts. A
real replacement strategy should always define its mismatch and recovery
behavior explicitly. A plugin that claims the mount socket also becomes the
owner of that initial decision, so applications should install only one plugin
for a given mount policy.

## Composing extensions with Dota Wrap

```ts
import {initializeApp} from '@ayu-sh-kr/dota-wrap';
import {dotaHydration} from '@ayu-sh-kr/dota-wrap/ssr';
import {navigationDiagnostics} from './navigation-diagnostics';

export const applicationReady = initializeApp({
  modules: componentModules,
  routes,
  root: AppRoot,
  defaultRoute: {path: '/', component: HomePage},
  errorRoute: {path: '/error', component: ErrorPage},
  plugins: [dotaHydration({mismatch: 'warn'}), navigationDiagnostics]
});
```

Plugins are configured in array order. Setup happens before component
registration, while route initialization happens afterwards. This gives
extensions a predictable place to configure shared runtime sockets without
coupling the application to Core or Router internals.

## Public types

| Type | Use |
| --- | --- |
| `DotaRuntimePlugin` | Describes an opt-in extension installed by the composition root. |
| `DotaRuntimeContext` | Provides the mount and route-renderer sockets. |
| `RouteRendererWrapper` | Types a decorator that preserves a route renderer fallback. |

## Boundaries and related packages

- Use `@ayu-sh-kr/dota-core` for component lifecycle and the default mount
  implementation.
- Use `@ayu-sh-kr/dota-router` for route matching, navigation, and route
  renderer contracts.
- Use `@ayu-sh-kr/dota-rendering` for `render()`, `hydrate()`, and DOM commits.
- Use `@ayu-sh-kr/dota-ssr` for the ready-made hydration and SSG extension.
- Use `@ayu-sh-kr/dota-wrap` when building an application composition root.

`@ayu-sh-kr/dota-runtime` is intentionally the narrow bridge between those
packages. It should not grow application services or concrete browser policy.
