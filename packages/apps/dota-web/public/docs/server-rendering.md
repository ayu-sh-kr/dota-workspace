# Server Rendering

Dota can deliver a page as HTML before its browser code runs. The route and the build decide **when** that HTML is produced; the browser then takes over navigation, events, and updates. This guide follows that complete path, from route declaration to the first interactive page.

## Choose where the first render happens

| Route mode | HTML is produced | Best fit |
| --- | --- | --- |
| `csr` | In the browser after JavaScript starts | Pages that need no prebuilt content, such as an editor or signed-in workspace |
| `ssr` | On the server for each matching request | Pages whose initial content depends on the URL or current request |
| `ssg` | Once per selected URL during the build | Pages that can be published as static files |

These modes govern the **initial document request**. Once the app is running, ordinary in-app navigation uses the browser router. Hydration is a separate browser step: it connects compatible server-produced markup to component updates and event handling.

Dota Web mixes all three. Its home page is `ssg`, `/docs/:slug` is `ssr`, and `/chat` is `csr`. The build also explicitly prerenders blog article URLs. On a Node deployment, an existing static page wins even if its route could otherwise be rendered per request. That lets a site prebuild selected URLs and render the rest when requested.

## Declare the route and the application once

The page mode is route metadata, alongside the component that the router will display:

```ts
@Route({path: '/articles/:id', mode: 'ssr'})
@Component({selector: 'article-page', shadow: false})
export class ArticlePage extends DotaPageElement {
  // Component state and render() belong here.
}
```

`initializeApp` remains the source of the component registry, routes, root, and fallbacks. The Vite integration reads those declarations for SSR; there is no second application route list to maintain. In Dota Web, the preloader supplies `virtual:dota-components` and `virtual:dota-routes` to `initializeApp`, and `dotaVitePlugins` coordinates the preloader, SSG, and SSR plugins.

```ts
// The relevant integration points from a Vite config and browser entry.
plugins: dotaVitePlugins({
  deployment: 'node',
  ssg: {
    autoDetectRoutes: true,
    routes: ['/articles/featured'],
  },
});

export const applicationReady = initializeApp({
  modules: components,
  routes: routeConfig,
  root: AppComponent,
  plugins: [dotaHydration({mismatch: 'warn'})],
});
```

The SSR Vite plugin is included by default and builds a request server only when it finds SSR routes. SSG is opt-in and runs when the build uses `--ssg`. Auto-detection selects concrete routes declared `ssg`; it cannot invent values for `/articles/:id`. List specific URLs in `ssg.routes` when they should be prebuilt, even if their declared mode is `ssr` or `csr`. `deployment` chooses generated hosting files; it does not publish them.

## What happens on an SSR request

The request server loads the application's entry and captures its `initializeApp` declarations. It caches those declarations and the prepared handler. Each matching request gets a fresh URL, route parameters, state map, and component instances. The capture step is shared; a visitor's render state is not.

For `GET /articles/42`, the handler matches `/articles/:id`, sets `context.params.id` to `42`, and asks the string adapter to render `<article-page>`. The adapter seeds incoming attributes and `@Property` fields, awaits an optional `serverLoad(context)`, calls `render()` once, then recursively renders registered descendant components. Siblings can load concurrently; the final HTML stays in document order. The result is inserted into the built HTML shell along with page SEO and the existing asset references. The complete response is buffered before it is sent.

```ts
import type {RenderContext} from '@ayu-sh-kr/dota-ssr/server';

// Method on a page with a reflected `title` property.
async serverLoad(context: RenderContext) {
  const response = await context.fetch(`/api/articles/${context.params.id}`);
  if (!response.ok) throw new Error(`Article request failed: ${response.status}`);
  this.title = (await response.json()).title;
}
```

Use `serverLoad` for data required by request-time SSR. It runs before that component's server render. `context.fetch` resolves relative URLs against the page request, but it does not create an API endpoint or automatically forward a visitor's credentials. `context.state` is shared by components in one request and is discarded afterward. Errors propagate to the host, which is responsible for its error response.

The server reflects supported `@Property` values into host attributes so the browser can recover initial component state. Plain fields and `context.state` do not transfer automatically. Keep `render()` based on prepared state, and treat reflected attributes as public HTML. The string adapter does not run `connectedCallback`, `@AfterInit`, browser events, or layout APIs. It can emit light DOM or declarative shadow markup; a component declared `mode: 'csr'` becomes an empty marked host that the browser fills later.

The same `html` template description serves the browser renderer and the server serializer. The server escapes dynamic text and quoted attribute values; it does not validate an application URL or sanitize raw HTML supplied through `unsafeHTML` or `trustedHTML`. Structured templates also carry the markers needed for later adoption. A legacy string result can produce HTML but has no structured parts for the browser to adopt, so that host mounts on the client.

This request path is built from several focused packages: Router supplies route declarations, Core supplies component and property metadata, Rendering serializes templates and markers, SSR coordinates the request, and Wrap composes their public integration. The server DOM package provides the minimal environment needed to construct components; it is not a full browser.

## What changes for SSG

SSG produces the same kind of initial HTML, but it uses a different execution path. For each selected URL, the build creates an isolated Happy DOM window, loads the normal application entry, waits for its exported `applicationReady` promise and tracked DOM/fetch work, then serializes the document to a file such as `dist/articles/featured/index.html`. Each route gets a fresh window. Parallel generation uses separate workers.

This means SSG runs normal application startup and browser-style lifecycle work; it does **not** call `serverLoad`. If a page needs data in both modes, its normal startup path must provide the SSG/browser side, and its server hook must provide the request-time SSR side. Keep their initial rendered state consistent for hydration.

An `applicationReady` promise should include work that must finish before the snapshot. The renderer also waits for supported pending DOM tasks and fetches, then checks again for work those completions start. If settling reaches its time or pass limit, it warns and writes the page as rendered so far. A successful build therefore does not prove that detached asynchronous work made it into the HTML. Relative API calls during SSG need an accessible build-time destination, such as `ssg.fetchBaseUrl`; built public files can be read locally.

## How the browser takes ownership

The server sends elements, attributes, template markers, and scripts, not live component objects. When the browser starts, Wrap installs `dotaHydration` before custom elements are registered. Core can then choose the initial mount strategy for each host.

For a marked component whose client template identity, marker version, and scope agree with the HTML, Rendering adopts its existing dynamic parts. An unmarked host mounts normally. A marked but incompatible host follows the configured mismatch policy: `warn` reports the problem and remounts that host; `throw` surfaces it. The initial root and route page also need a router handoff so startup does not replace the server page. Dota verifies its route marker, path, and page identity, preserves it for the initial transition, and lets later navigation use normal routing. Root and page rendering can be deferred until their first update; that is distinct from adopting every descendant part.

This is why the browser must be able to reproduce the initial template and state. Use serializable properties or another explicit transfer mechanism, and deploy matching HTML and JavaScript together. A client-only component is different: its server output is only an empty host, so its browser content is mounted fresh.

## Serve a mixed build

After building its workspace dependencies, run `pnpm --filter dota-web run build:node` from the workspace root. Then run `pnpm --filter dota-web run preview` to start the generated Node server. It listens on port 3000 by default: [open the local site](http://localhost:3000/) or [open this guide on the local server](http://localhost:3000/docs/server-rendering). Set `PORT` before starting preview if you need another port.

The server serves a matching built file first, asks the SSR handler for a matching request second, and otherwise serves the clean browser shell for CSR routes. It keeps the original shell separately because SSG may replace `dist/index.html` with a prerendered home page. A prerendered page has one canonical URL: with the default `trailingSlash: true`, `/articles/featured` redirects to `/articles/featured/`; with `trailingSlash: false`, the page is written to `featured.html` and `/articles/featured/` redirects to `/articles/featured`.

Vercel, Netlify, and Cloudflare Pages receive their own generated function or worker routing. GitHub Pages serves static files only, so it cannot answer request-time SSR routes. Check the generated routing for your host: its static-file precedence and fallback behavior may differ from Node's. SSR handles page HTML; your API, authentication, and cache policy remain application and hosting concerns.

For a closer look at implementation boundaries, see the [SSR architecture and maintainer reference](https://github.com/ayu-sh-kr/dota-workspace/tree/master/documentation/packages/libs/dota-ssr/architecture) and the [Dota Web Vite configuration](https://github.com/ayu-sh-kr/dota-workspace/blob/master/packages/apps/dota-web/vite.config.ts).
