# Lazy components

`initializeApp({lazyComponents})` defines components when a route or the document needs them,
so each route downloads, parses, and upgrades only the code it renders instead of every
component in the application.

## Context and intent

Dota templates reference child components by tag name only (`<app-header>`), never through
imports, so the bundler cannot see which components a page needs. The eager
`virtual:dota-components` module therefore imports every component into the entry chunk, and
every route pays to evaluate and define all of them during startup. On a mid-range phone that
single startup task is the main source of Total Blocking Time.

Lazy components restore the missing dependency graph at build time and load it per route at
run time. Eager registration through `modules` and `externalComponents` keeps working
unchanged; applications opt in.

## Behavior

1. **Build time.** The preloader plugin serves `virtual:dota-component-registry`. For every
   `@Component` it emits a loader (`() => import('./file.ts').then(m => m.Class)`) and the tags
   its file renders, found by scanning the source for opening tags and quoted known selectors.
   Each dynamic import becomes its own chunk, and Vite hoists shared code automatically.
2. **Start-up.** `initializeApp` registers `modules` and `externalComponents` as before, then
   starts the router. The lazy route renderer wraps every plugin renderer (hydration included),
   so a page's code is always defined before anything presents it. When the document arrived
   with the first route already rendered (SSG or SSR), its components load after the browser's
   first contentful paint, because the server HTML is readable without them and their requests
   would otherwise compete with the stylesheets that gate first paint. A hidden tab, a browser
   without the Paint Timing API, or a 3 s timeout ends that wait.
3. **Navigation.** Before each render, `LazyComponentLoader.ensure([pageSelector])` walks the
   page's dependency closure, loads every missing component in parallel, and defines them
   parents first. Definitions run in batches of about 40 ms and yield to the browser between
   batches, because defining an element upgrades and hydrates every instance synchronously.
4. **Fallback.** After the first render the loader observes the document and defines any
   registry tag that appears later, for example tags built at runtime or rendered by library
   components. The observer disconnects once every registry tag is defined.
5. **Readiness.** With `lazyComponents`, the promise returned by `initializeApp` resolves after
   the first route has rendered. Each load is also reported through `trackPendingWork` from
   `@ayu-sh-kr/dota-ssr`, so static generation serializes a page only after late components
   are defined too.

## Build output

Two build steps keep the start-up requests few, without application configuration:

- The preloader groups the application's start-up support modules (modules under `src` on the
  entry's static import chain that are not components, pages, or the entry itself) into one
  `app-shared` chunk. Otherwise each module shared between the entry and a component chunk
  becomes a tiny preloaded chunk. `preloader: {sharedChunk: false}` turns this off.
- `dotaVitePlugins` moves remote stylesheet `@import`s (web fonts) from the built CSS into
  preconnected `<link>`s in the HTML head, so they no longer wait for the CSS bundle.
  `remoteStylesheets: false` turns this off.

## Configuration or usage

```ts
import {componentRegistry} from 'virtual:dota-component-registry';
import {defineComponentLoaders, initializeApp} from '@ayu-sh-kr/dota-wrap';

const libraryComponents = defineComponentLoaders({
  'dota-icon': () => import('@ayu-sh-kr/dota-ui').then(m => m.IconsComponent),
  'md-view': () => import('@ayu-sh-kr/dota-md').then(m => m.MdViewComponent),
});

export const applicationReady = initializeApp({
  modules: [AppComponent],            // eager: the root, at minimum
  lazyComponents: [componentRegistry, libraryComponents],
  routes: routeConfig,                // required with lazyComponents
  errorRoute, defaultRoute, root: AppComponent,
});
```

- Declare the virtual module for TypeScript with `ComponentRegistry` from `@ayu-sh-kr/dota-wrap`.
- Library tags need an explicit loader because library packages do not publish class names for
  their tags. A loader may configure the library before returning the constructor, as Dota Web
  does to set `IconsComponent.baseUrl`.
- Configure a library at the module that depends on it, not in the entry. Dota Web imports a
  pre-configured `MDService` from `configs/markdown.config.ts`, so highlight.js loads only with
  routes that render Markdown.
- `initializeApp` returns `componentLoader`; `componentLoader.ensure(tags)` prefetches a tree,
  for example on link hover.

## Constraints and edge cases

- `routes` must be explicit; decorator-based route discovery needs every page class registered.
- Page classes stay in the entry through `virtual:dota-routes`, so route matching and SEO work
  before any chunk loads. Their child components are what load lazily.
- A tag that is only built in a non-component helper file is not in the build-time graph and is
  defined by the observer one render later.
- A failed loader is logged, and the next `ensure` for that tag retries it.
- If a guard cancels the initial navigation, `initializeApp` resolves when the next route renders.
- A loader created in one window stops defining components once that window is no longer
  global, so work that outlives a prerendered route cannot touch the next route's document.

## Related documentation

- [Route-level code splitting for mobile TBT](../../../apps/dota-web/performance/mobile-tbt-route-splitting.md)
