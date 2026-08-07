# @ayu-sh-kr/dota-wrap

`@ayu-sh-kr/dota-wrap` is the consumer-facing composition package for Dota
applications. It gathers Core, Rendering, Event, Router, REST, SSR, and the
development-time Vite integrations behind one consistent import family.

Use the root package to initialize an application, then use subpaths when you
want a focused API such as `@ayu-sh-kr/dota-wrap/core` or
`@ayu-sh-kr/dota-wrap/rendering`. Consumers should install this package rather
than separately managing its internal Dota runtime packages.

## Installation

```sh
pnpm add @ayu-sh-kr/dota-wrap
```

For an application that uses the Vite helpers, Vite remains an application
dependency and should be installed according to the application's build setup.

## Initialize an application

`initializeApp()` performs the composition steps in a predictable order:

1. Configure opt-in runtime plugins.
2. Resolve and register application and external component constructors.
3. Build the router from those registered components and route configuration.
4. Initialize the router and return the registered components and router service.

```ts
import {initializeApp} from '@ayu-sh-kr/dota-wrap';
import {dotaHydration} from '@ayu-sh-kr/dota-wrap/ssr';
import {MdViewComponent} from '@ayu-sh-kr/dota-md';
import components from 'virtual:dota-components';
import {AppRoot, ErrorPage, HomePage} from './pages';

export const applicationReady = initializeApp({
  // A Vite-generated module map may contain eager exports or lazy import functions.
  modules: components,
  routes: [
    {path: '/', component: HomePage, default: true},
    {path: '/error', component: ErrorPage}
  ],
  defaultRoute: {path: '/', component: HomePage},
  errorRoute: {path: '/error', component: ErrorPage},
  root: AppRoot,
  externalComponents: [MdViewComponent],
  plugins: [dotaHydration({mismatch: 'warn'})]
});
```

`modules` can also be an array of already resolved constructors. Non-component
exports in a module map are ignored, so generated modules can expose metadata or
helpers without affecting registration. Runtime plugin setup runs before custom
elements are defined, which is important for hydration and other initial-mount
policies.

## Use the public subpaths

The wrapper keeps related APIs discoverable and lets application code state
which part of Dota it is using.

| Import | Use |
| --- | --- |
| `@ayu-sh-kr/dota-wrap/core` | Components, decorators, properties, lifecycle, and Core utilities. |
| `@ayu-sh-kr/dota-wrap/rendering` | `html()`, `render()`, `update()`, keyed ranges, and hydration primitives. |
| `@ayu-sh-kr/dota-wrap/event` | Application event publishers, listeners, and event decorators. |
| `@ayu-sh-kr/dota-wrap/router` | Route declarations, router services, and navigation types. |
| `@ayu-sh-kr/dota-wrap/rest` | REST client APIs. |
| `@ayu-sh-kr/dota-wrap/ssr` | Browser hydration through `dotaHydration()`. |
| `@ayu-sh-kr/dota-wrap/ssg` | Build-time SSG types, route resolvers, and `dotaSsg()`. |
| `@ayu-sh-kr/dota-wrap/vite` | Composed Vite plugins for application development and builds. |

For example, a component can use structured rendering without importing the
underlying rendering package:

```ts
import {BaseElement, Component} from '@ayu-sh-kr/dota-wrap/core';
import {html} from '@ayu-sh-kr/dota-wrap/rendering';
import {Route} from '@ayu-sh-kr/dota-wrap/router';

@Route({path: '/'})
@Component({selector: 'home-page', shadow: false})
export class HomePage extends BaseElement {
  count = 0;

  render() {
    return html`
      <button type="button" aria-label="Increase count">
        Count: ${this.count}
      </button>
    `;
  }
}
```

## Compose Vite integrations

`dotaVitePlugins()` applies shared `root`, `scanRoots`, and `logType` values
while retaining each integration's native options. By default it includes the
preloader, event-map generator, and Web Types generator. SSG is opt-in.

```ts
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dotaVitePlugins} from '@ayu-sh-kr/dota-wrap/vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const blogRoutes = blogPosts.map(post =>
  `/blogs/content/${encodeURIComponent(post.category)}/${encodeURIComponent(post.path)}`
);

export default {
  plugins: dotaVitePlugins({
    root: projectRoot,
    scanRoots: [projectRoot, resolve(projectRoot, '../ui/dota-ui')],
    eventMap: {outFile: 'src/event-map.d.ts'},
    webTypes: {
      outFile: 'web-types.json',
      customElementsManifest: {enabled: true, outFile: 'custom-elements.json'}
    },
    ssg: {
      entry: '/src/main.ts',
      autoDetectRoutes: true,
      routes: blogRoutes,
      vercel: true
    }
  })
};
```

Disable an integration with `false`, and append application-specific plugins
with `extensions`:

```ts
dotaVitePlugins({
  eventMap: false,
  webTypes: false,
  ssg: false,
  extensions: [myServerPlugin]
});
```

The returned plugins keep their native Vite lifecycle and ordering. The wrapper
bundles its build-time plugin helpers so an application does not need to add
the internal preloader, event-map, or Web Types packages as direct dependencies.

## Static generation and hydration

For static HTML routes, combine the wrapper's browser plugin with its Vite
composition helper:

```ts
// src/main.ts
import {initializeApp} from '@ayu-sh-kr/dota-wrap';
import {dotaHydration} from '@ayu-sh-kr/dota-wrap/ssr';

export const applicationReady = initializeApp({
  ...config,
  plugins: [dotaHydration({mismatch: 'warn'})]
});
```

```ts
// vite.config.ts
import {dotaVitePlugins} from '@ayu-sh-kr/dota-wrap/vite';

export default {
  plugins: [
    ...dotaVitePlugins({
      ssg: {
        autoDetectRoutes: true,
        routes: ['/docs/getting-started']
      }
    })
  ]
};
```

`dotaSsg()` is available directly from `@ayu-sh-kr/dota-wrap/ssg` when an
application needs only the SSG plugin. The wrapper points its rendering bridge
at `@ayu-sh-kr/dota-wrap/rendering`, keeping all application imports within the
wrapper surface.

## Extending application setup

Runtime plugins implement the small contract exported by the root package. They
can observe or decorate route presentation and can replace the initial mount
strategy when a feature needs to adopt existing DOM.

```ts
import type {DotaRuntimePlugin} from '@ayu-sh-kr/dota-wrap';

const analytics: DotaRuntimePlugin = {
  name: 'analytics',
  setup(context) {
    context.wrapRouteRenderer((next) => async (match, navigation) => {
      await next(match, navigation);
      analytics.track('route-view', {path: navigation.url.pathname});
    });
  }
};
```

Keep the renderer returned by the wrapper as the fallback. This allows multiple
runtime extensions to compose and leaves route-specific custom renderers under
Router's control.

## Package boundary

The public contract is the `@ayu-sh-kr/dota-wrap` package and its documented
subpaths. Core, Event, Router, REST, Rendering, Runtime, and SSR packages are
wired as internal runtime dependencies; build-time plugin helpers are included
behind wrapper Vite surfaces. This preserves shared runtime instances and keeps
consumer installation and imports stable.

When a feature belongs to one underlying library, read that package's README
for its detailed behavior:

- [Rendering README](../dota-rendering/README.md)
- [SSR README](../dota-ssr/README.md)
- [Runtime README](../dota-runtime/README.md)
