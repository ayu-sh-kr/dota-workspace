# Dota Navigation Router

A lightweight TypeScript router for web applications that leverages the Navigation API for seamless client-side routing.

## Features

- Modern routing with the Navigation API
- Configurable route matching and rendering
- Support for nested routes and child components
- Custom error handling
- Metadata-driven component registration
- History management with back/forward navigation

## Installation

```bash
npm install @ayu-sh-kr/dota-router
# or
pnpm add @ayu-sh-kr/dota-router
# or
yarn add @ayu-sh-kr/dota-router
```

## Basic Usage

```typescript
import { DomNavigationRouter, RouteConfig } from '@ayu-sh-kr/dota-router';
import { HomePage, AboutPage, NotFoundPage } from './components';

// Define your routes
const routes: RouteConfig[] = [
  { 
    path: '/', 
    component: HomePage,
    default: true
  },
  { 
    path: '/about', 
    component: AboutPage
  }
];

// Create and initialize router
const router = new DomNavigationRouter({
  routes,
  errorRoute: {
    path: '/error',
    component: NotFoundPage
  }
});
```

## Navigation

Navigate between pages using the static route method:

```typescript
// Navigate to a path
DomNavigationRouter.route('/about');

// Navigate with options
DomNavigationRouter.route('/products', {
  category: 'electronics',
  sort: 'price'
});
```

## Advanced Routing

### Navigation Hooks

Apply authorization or analytics to every transition through the router service:

```typescript
import {DotaRouterService, DomHistoryRouter} from "@ayu-sh-kr/dota-router";

const router = DotaRouterService.fromComponents({
  router: DomHistoryRouter,
  routes,
  errorRoute,
  defaultRoute,
  root: AppRoot,
  globalHooks: {
    beforeEach: [context => session.canOpen(context.url) || "/sign-in"],
    afterEach: [context => analytics.pageView(context.url)]
  }
}).init();
```

### Custom Render Functions

```typescript
const routes = [
  {
    path: '/dashboard',
    component: DashboardComponent,
    render: (path) => {
      // Custom rendering logic
      document.querySelector('#app-root').innerHTML = '<dashboard-view></dashboard-view>';
      // Initialize other resources
    }
  }
];
```

### Nested Routes

```typescript
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      {
        path: '/users',
        component: UsersComponent
      },
      {
        path: '/settings',
        component: SettingsComponent
      }
    ]
  }
];
```

## Error Handling

The router automatically redirects to the error route when a path is not found:

```typescript
// This will redirect to the error route if '/unknown' is not defined
DomNavigationRouter.route('/unknown');
```

## Utilities

The library provides utility functions for navigation:

```typescript
import { RouterUtils } from '@ayu-sh-kr/dota-router';

// Get the previous path
const previousPath = RouterUtils.getPreviousPath();

// Get the current path
const currentPath = RouterUtils.getCurrentPath();
```

## SSR / SSG output on first render

`dota-router` renders every route — including the very first one — by writing the matched
component's tag into the root element's `innerHTML`. Used standalone, this **always**
overwrites whatever markup is already inside the root, including server- or build-time
prerendered HTML.

If the root still contains marked prerendered output (`data-dh-route` or `data-dh-t`) when
the initial route renders, `dota-router` now logs a `console.warn` before overwriting it, so
the loss is visible instead of silent. It does not, on its own, preserve that output — router
package has no dependency on the hydration marker contract and stays usable outside of an
SSR/SSG setup.

To keep prerendered HTML on the initial load, wrap the app with `dota-wrap`'s
`initializeApp()` and its `dotaHydration()` plugin (see
`documentation/standards/hydration-ssr/README.md`), which intercepts the first route render
before `dota-router`'s own overwrite runs. Without that plugin, treat `dota-router` as **not
SSR-safe** for the initial paint.

## Render-time error policy

`createRouteRenderer` accepts an optional second argument to control what happens when the
root component or route component is missing decorated metadata, or the root element isn't
in the DOM:

```typescript
import { createRouteRenderer } from '@ayu-sh-kr/dota-router';

// Default: warn — log via console.error and leave existing DOM untouched.
const renderer = createRouteRenderer(AppRoot);

// Strict: throw — the failure surfaces through the coordinator's navigate() result
// instead of being swallowed, matching how bad router construction already fails hard.
const strictRenderer = createRouteRenderer(AppRoot, { onError: 'throw' });
```

The default (`warn`) preserves the router's original behavior exactly — this option is
additive and opt-in.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes using [Changesets](https://github.com/changesets/changesets)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
