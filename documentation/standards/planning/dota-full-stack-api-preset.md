# Dota full-stack API preset proposal

> Status: proposal. No API described here is implemented yet.

## Recommendation

Dota should support a frontend and API in one project through a thin,
opt-in Nitro integration. Dota should not build its own HTTP server, request
abstraction, runtime polyfills, or deployment adapters.

The proposed public entry is:

```ts
import {dotaNitroPlugins} from '@ayu-sh-kr/dota-wrap/nitro';
```

It should compose the existing Dota Vite plugins with Nitro v3's native Vite
plugin, make Dota SSG aware of Nitro's client environment, and leave all Nitro
configuration and handler APIs available to the application.

This gives downstream applications:

- one project containing `src/`, `server/`, and optional shared contracts;
- one origin in development, so browser code can call relative `/api/*` URLs;
- one `vite build` command;
- one `.output/` deployment artifact containing static assets and the API
  server;
- direct access to Nitro routes, middleware, storage, cache, database, modules,
  deployment presets, and third-party HTTP frameworks;
- an unchanged static-only Dota path when server support is not installed.

Nitro v3 is currently a public beta. The integration should remain
experimental and pin a tested Nitro version until Nitro v3 becomes stable.
This proposal was checked against `nitro@3.0.260610-beta` on 2026-08-07.

## Why Dota should integrate instead of becoming a server framework

The earlier frontend-server study identifies the useful server capabilities:
request routing, a portable runtime contract, output packaging, and deployment
adapters. Those capabilities are expensive to reproduce and are not specific to
Dota components.

Nitro v3 already supplies them and now provides a first-class Vite plugin. Its
current Vite integration directs client output to `.output/public`, bundles the
server, and makes `vite build` produce the final client and server artifact.
Nitro handlers use Web Standard `Request` and `Response` primitives, while the
Nitro configuration remains available for platform-specific extensions.

Dota's unique responsibility is narrower:

1. compose the existing Dota plugins with Nitro in a known order;
2. make Dota's SSG lifecycle safe in Vite's multi-environment build;
3. define route ownership so APIs, generated HTML, assets, and the SPA fallback
   do not compete;
4. provide a small, documented project convention downstream users can adopt.

Owning only this seam avoids a second server ecosystem while still presenting a
coherent Dota full-stack experience.

## Proposed downstream experience

### Installation

Full-stack applications install Nitro explicitly beside Dota Wrap:

```bash
pnpm add @ayu-sh-kr/dota-wrap nitro
```

`nitro` should be an optional peer of `@ayu-sh-kr/dota-wrap`, not a normal
dependency of its browser surface. A static-only Dota application need not
install server code, and an application importing Nitro handlers must have
Nitro as its own resolvable dependency in pnpm's strict dependency model.

### Project layout

Use Nitro's native layout rather than introducing Dota-specific API decorators:

```text
index.html
src/
  main.ts
  api/
    status.ts
server/
  routes/
    api/
      status.get.ts
  middleware/
  plugins/
shared/
  status.ts
vite.config.ts
```

The default API convention should be `server/routes/api/`, not
`server/api/`. Both map naturally to `/api/*` in Nitro, but Nitro's current
Vercel documentation requires `routes/api/` for standalone applications. Using
the portable directory from the beginning prevents a provider-specific source
migration later.

### Vite configuration

The common case should require one factory and no Dota CLI:

```ts
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import {dotaNitroPlugins} from '@ayu-sh-kr/dota-wrap/nitro';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    ...dotaNitroPlugins({
      root: projectRoot,
      scanRoots: [projectRoot],
      ssg: {
        autoDetectRoutes: true
      },
      nitro: {
        serverDir: './server'
      }
    })
  ],
  resolve: {
    alias: {
      '@dota': resolve(projectRoot, 'src')
    }
  }
});
```

The factory should default `serverDir` to `./server`, so most applications can
omit the `nitro` object. The nested object must accept Nitro's native plugin
configuration without renaming or narrowing its options.

Applications continue to use familiar commands:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

`vite preview` should preview the built Nitro application through Nitro's Vite
preview integration. Deployment targets the generated `.output/` artifact or
uses Nitro's provider integration. Dota should not add a second deployment
command.

### API and client code

Server handlers use Nitro directly:

```ts
// shared/status.ts
export interface StatusResponse {
  status: 'ok';
  version: string;
}
```

```ts
// server/routes/api/status.get.ts
import {defineHandler} from 'nitro';
import type {StatusResponse} from '../../../shared/status';

export default defineHandler((): StatusResponse => ({
  status: 'ok',
  version: '1'
}));
```

Browser code uses a same-origin URL and a standard client:

```ts
// src/api/status.ts
import type {StatusResponse} from '../../shared/status';

export async function getStatus(): Promise<StatusResponse> {
  const response = await fetch('/api/status');
  if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
  return response.json() as Promise<StatusResponse>;
}
```

This deliberately does not introduce a Dota request or response type. A project
can use native `fetch`, `@ayu-sh-kr/dota-rest`, an OpenAPI client, tRPC, or
another transport without changing the deployment integration. Shared
TypeScript types improve authoring but do not replace runtime input validation;
applications remain free to choose Zod, Valibot, or another schema library.

## Public integration contract

The proposed factory should be a thin composition API:

```ts
interface DotaNitroPluginsOptions extends DotaVitePluginsOptions {
  nitro?: NitroPluginConfig;
}

function dotaNitroPlugins(options?: DotaNitroPluginsOptions): Plugin[];
```

The real implementation may omit or reshape conflicting properties, but the
ownership rules should remain:

| Configuration | Owner |
| --- | --- |
| Component, event, Web Types, and SSG options | Dota |
| Server directory, runtime config, route rules, modules, and presets | Nitro |
| Business handlers, middleware, validation, and authentication | Application |
| Provider credentials and environment variables | Deployment platform/application |

The subpath should import `nitro/vite` only when a full-stack consumer imports
it. The root `@ayu-sh-kr/dota-wrap` browser entry and the existing
`@ayu-sh-kr/dota-wrap/vite` entry remain usable without Nitro.

The factory should return the original child plugin objects. It must not proxy
every Vite or Nitro hook through one synthetic plugin. This preserves native
plugin ordering, diagnostics, environment behavior, and downstream extension
points.

## Build and request ownership

The intended production sequence is:

```text
vite build
  -> Nitro prepares .output/
  -> Vite builds the client into .output/public/
  -> Dota SSG optionally adds route HTML to .output/public/
  -> Nitro indexes public assets and builds the server
  -> .output/ becomes the only deployment artifact
```

Runtime request priority is:

```text
/api/* and explicit server routes
  -> exact public assets and generated route index.html files
  -> Nitro's index.html renderer as the SPA fallback
```

Nitro's static handler already checks both an exact public path and its
`index.html`, so a generated `blogs/index.html` can serve `/blogs` and
`/blogs/`. Provider redirects are unnecessary for basic directory-index
delivery. An application can still add canonical redirects through Nitro route
rules when SEO policy requires one URL form.

In full-stack mode, Nitro is the only deployment owner:

- `dotaSsg({vercel: true})` must be rejected with a clear diagnostic;
- the broad static `/(.*) -> /index.html` Vercel rewrite must not be generated;
- provider route rules and final output belong to Nitro;
- Dota must never separately publish `dist/`.

## Dota SSG changes required for safe composition

The previous integration audit correctly identifies hazards in placing the old
Nitro integration beside `dotaSsg()`. Nitro v3 changes the preferred build from
two separate stages to one Vite multi-environment build, but it does not make
the current Dota SSG plugin automatically environment-safe.

Three focused changes are required.

### 1. Run SSG only for the client environment

`dotaSsg()` currently uses the top-level resolved `config.build.outDir` and a
`closeBundle()` hook. In a Nitro v3 build, Nitro configures the client
environment's output as `.output/public` while also building server
environments.

The plugin must:

- run exactly once for the environment whose consumer is `client`;
- read the output directory from that environment's resolved build config;
- never execute for Nitro or another server environment;
- keep its post-client timing so hashed asset URLs already exist in the HTML
  shell.

This makes the generated HTML part of Nitro's public output before the Nitro
server bundle creates its asset manifest.

### 2. Keep Nitro out of the internal SSG module runner

The SSG plugin reloads the application's Vite config in a middleware-mode Vite
server to execute each route in `happy-dom`. Reloading a config containing the
Nitro Vite plugin can otherwise create a nested Nitro application.

The integrated preset should use an internal, process-local SSG phase marker:

1. `dotaSsg()` sets and restores the marker around creation of its internal
   Vite server;
2. `dotaNitroPlugins()` sees the marker while that config is re-evaluated and
   omits Nitro plugins;
3. normal Dota transforms and route metadata remain available to the SSG
   runner.

The marker is an implementation detail, not a documented environment variable
for applications. Restoration must occur in a `finally` path so a failed
prerender cannot affect later builds in the same process.

### 3. Make deployment mode explicit

The preset should validate these combinations early:

| Mode | Result |
| --- | --- |
| Dota plugins without Nitro | Existing `dist/` static or SPA build |
| Nitro with `ssg` omitted | API plus SPA renderer in `.output/` |
| Nitro with Dota `ssg` enabled | APIs, generated HTML, and SPA fallback in `.output/` |
| Nitro with Dota `ssg.vercel` enabled | Configuration error; Nitro owns deployment |

These checks are more valuable than silently changing output or ignoring the
old Vercel option.

## Build-time API calls

The first release should not make relative `/api` calls magically work during
`happy-dom` prerendering. Hidden request interception could execute writes,
depend on secrets, or make a supposedly deterministic build depend on runtime
infrastructure.

The initial rule should be explicit:

- API requests made after browser hydration work normally;
- prerendered content uses data already available at build time or the existing
  `settle` callback;
- a route that requires runtime-only data remains client-rendered.

A later opt-in may expose Nitro's in-process `nitro.fetch()` to an SSG data
loader, but only with a named configuration switch and a documented rule that
prerender loaders must be read-only and deterministic. It should not replace
the safe default.

## Extension model

Adoptability comes from good defaults. Extensibility comes from leaving the
native seams open.

### Server extensions

- The `nitro` option is passed through without a reduced Dota schema.
- Applications can add Nitro middleware, plugins, route rules, storage, cache,
  database connections, tasks, and provider configuration.
- Advanced applications can use Nitro's `server.ts` entry with H3, Hono,
  Elysia, or another fetch-compatible framework.
- Nitro modules supplied by ordinary Vite plugins continue to receive Nitro's
  native setup hook.

Dota should implement only Nitro first. A generic `ServerAdapter` interface
would be premature until a second runtime demonstrates a real shared contract.
The package subpath names the integration honestly and does not promise that
all server engines have interchangeable semantics.

### Client extensions

- Same-origin `/api` paths work with `fetch` and avoid a mandatory CORS or base
  URL layer.
- `@ayu-sh-kr/dota-rest` remains an optional fluent client rather than a required
  full-stack dependency.
- Shared DTO modules can be imported by handlers and browser services when they
  contain no secrets or server-only imports.
- OpenAPI generation, generated clients, and tRPC can be added by applications
  or later optional packages; none belongs in the minimal preset.
- Authentication is expressed through normal cookies, headers, Nitro
  middleware, and a client-supplied fetch wrapper. Dota should not invent an
  authentication protocol.

### Build extensions

The preset should keep the existing `extensions` escape hatch and preserve
child plugin objects. It should document the final order and add integration
tests for plugins that contribute a Nitro module, rather than hard-coding a
closed list of supported extensions.

## Deployment support

The first supported targets should be those covered by Nitro's tested presets,
with acceptance coverage focused on:

1. the standard Node output;
2. Vercel, because the current Dota application deploys there;
3. one Web Standard edge target such as Cloudflare after the Node/Vercel path is
   stable.

The framework should not claim every Nitro target is supported merely because
Nitro has an adapter. Dota's compatibility statement should list the Nitro
version, Vite version, Node minimum, tested deployment presets, and known SSG
limitations.

For the current Nitro v3 beta, the baseline is Vite 8 compatibility and Node 20
or newer. The workspace currently uses Vite 8, so it is aligned with the new
integration model, but a beta server dependency should not enter the default
`dotaVitePlugins()` preset.

## Rollout plan

### Phase 1: API plus SPA, experimental

- Add the isolated `@ayu-sh-kr/dota-wrap/nitro` build entry.
- Declare Nitro as an optional peer and pin the tested beta in workspace tests.
- Compose Nitro with Dota scanning plugins while keeping SSG disabled.
- Verify same-origin API development, `vite build`, `vite preview`, Node output,
  and Vercel output.

This phase delivers useful full-stack support without changing Dota SSG.

### Phase 2: API plus Dota SSG

- Make `dotaSsg()` client-environment aware.
- Add the internal-render phase marker.
- Write generated HTML into Nitro's resolved public output.
- Reject multiple deployment owners and remove static Vercel rewrites in this
  mode;
- test API precedence, generated directory indexes, SPA fallback, matching
  client assets, and hydration.

### Phase 3: optional client contracts

Only after real applications establish demand, evaluate one of:

- a small `@ayu-sh-kr/dota-rest` same-origin preset;
- OpenAPI-based type generation;
- an opt-in typed RPC adapter;
- an explicit in-process SSG data loader.

These should remain separate from the server preset so a basic API does not
acquire schema generation or RPC complexity.

## Non-goals

The first version should not:

- implement a Dota HTTP router or runtime adapter;
- wrap Nitro's event, request, response, error, storage, or database APIs;
- support multiple server engines through a speculative common interface;
- auto-install databases, authentication, validation, or RPC;
- enable server mode from the existing static Dota preset;
- execute browser API calls during prerender without an explicit policy;
- generate or edit provider configuration when Nitro owns the final artifact.

## Acceptance criteria

The proposal is ready to graduate from experimental when a fixture application
proves all of the following:

- `vite` serves the Dota client and `/api/status` from one origin;
- editing a server handler reloads without corrupting client HMR;
- `vite build` creates one `.output/` containing client assets, API server code,
  and all selected Dota SSG route documents;
- `vite preview` serves APIs before the SPA fallback;
- `/`, generated routes, and non-generated client routes resolve correctly;
- generated HTML references assets from the same build and hydrates without a
  remount;
- a failed API returns an API error rather than `index.html`;
- the client bundle and generated HTML contain no server-only environment
  values;
- Node and Vercel fixtures pass against the pinned Nitro version;
- static-only consumers can build without installing Nitro.

## Related documentation and sources

- [Frontend server architecture study](../features/frontend-server-setup.md)
- [Nitro and Dota SSG integration audit](../audits/nitro-to-dota-ssg-migration.md)
- [Dota Wrap Vite composition](../../packages/libs/dota-wrap/configuration/ssr-and-vite-plugin-composition.md)
- [Dota SSG build planning](../../packages/libs/dota-ssr/planning/streamlining-ssg-build.md)
- [`dotaVitePlugins()` implementation](../../../packages/libs/dota-wrap/src/vite/index.ts)
- [`dotaSsg()` implementation](../../../packages/libs/dota-ssr/src/vite/index.ts)
- [Nitro v3 introduction and Vite integration](https://nitro.build/docs)
- [Nitro Vite quick start](https://nitro.build/docs/quick-start)
- [Nitro routing](https://nitro.build/docs/routing)
- [Nitro public assets](https://nitro.build/docs/assets)
- [Nitro renderer](https://nitro.build/docs/renderer)
- [Nitro Vercel deployment](https://nitro.build/deploy/providers/vercel)
