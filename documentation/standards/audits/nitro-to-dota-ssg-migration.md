# Nitro and `dotaSsg` integration audit

> Version note (2026-08-07): this audit describes the integration boundary
> before Nitro v3's native Vite multi-environment plugin. Its output ownership,
> nested-config, routing, and build-time API warnings still apply to the current
> `dotaSsg()` implementation. The proposed v3-aware one-build integration and
> the Dota changes it requires are documented in the
> [Dota full-stack API preset proposal](../planning/dota-full-stack-api-preset.md).

## Finding

The client’s architecture is valid: Nitro can serve the frontend and expose
backend APIs from one server deployment. The risk is that Nitro and the current
`dotaSsg` implementation do not share a deployment contract automatically.

The current application is static-only. It has no Nitro dependency, server entry,
or `server/api` directory. Its build is:

```text
Vite + dotaSsg → dist/ and prerendered route HTML
Vercel → static deployment
```

If the client adds Nitro, the project must deliberately change to one of these
architectures:

1. Nitro-only server delivery: Nitro serves the SPA shell and APIs; Dota SSG is
   disabled, so there is no route-specific static HTML.
2. Hybrid Nitro delivery: `dotaSsg` generates HTML first, Nitro imports that
   output as public assets, and Nitro alone owns the server deployment and APIs.
3. Separate deployments: Vercel serves the static Dota site and a different
   backend serves APIs.

The client’s likely requirement is option 2. It is feasible, but simply adding a
Nitro Vite plugin beside `dotaSsg` is unsafe.

There is also an independent current working-tree defect: the broad
`happy-dom` global bridge replaces Node’s `Reflect` and causes
`Reflect.getOwnMetadata is not a function` during prerendering. That must be fixed
before evaluating the hybrid build; it is not caused by Nitro.

## What `dotaSsg` currently does

`dotaSsg` is a post-build Vite plugin. Its `closeBundle()` hook:

1. Reads the client `index.html` from Vite’s configured `build.outDir`.
2. Creates a middleware-mode Vite server using the application `configFile`.
3. Creates a fresh `happy-dom` window for each selected route.
4. Loads the application with `ssrLoadModule()`.
5. Waits for `applicationReady` and pending DOM work.
6. Writes route documents such as `blogs/index.html` below the Vite output.
7. Optionally edits the nearest `vercel.json` to add route redirects.

See [`dotaSsg`](../../../packages/libs/dota-ssr/src/vite/index.ts:59) and its
[options](../../../packages/libs/dota-ssr/src/vite/types.ts:43).

The important boundary is that this is a build-time Vite runner, not a running
Nitro HTTP server. It does not call Nitro APIs, and it does not automatically
hand its generated files to another build system.

Nitro's Vite integration has its own build model. The Nitro Vite plugin creates
client/server build environments and directs the client environment toward
Nitro's configured public output directory. Nitro then copies public assets into
its production output and builds the Nitro server. That is useful for a
Nitro-owned application, but it changes the assumptions that `dotaSsg` currently
makes about Vite's `build.outDir` and about when `closeBundle()` is complete.

## Problems that adding Nitro could create

### 1. Two build systems can produce competing output

`dotaSsg` writes static HTML under Vite’s resolved `build.outDir`. Nitro builds a
server runtime and, for a Vercel server deployment, produces its own deployment
output. Nitro will not automatically discover route HTML that another plugin
wrote to an unrelated directory. Nitro supports additional public asset
directories, but that handoff must be configured explicitly.

Possible symptoms:

- Nitro deploys APIs but serves only its own fallback shell;
- prerendered pages disappear from the final deployment;
- assets exist in `dist/` but are absent from Nitro’s public asset directory;
- Vercel deploys the wrong output directory or ignores the server functions.

Adding the Nitro Vite plugin can make this worse because Nitro may change the
resolved client output directory from `dist/` to Nitro's public output directory.
`dotaSsg` reads and writes whichever directory Vite resolves, while Nitro's own
copy/build steps may run before or after that write. The two plugins therefore
need a tested ordering and a single staging directory, not just two entries in
one `plugins` array.

The fix is a clear handoff: generate the complete static site into a staging
directory, then configure Nitro to publish that directory as public assets before
Nitro creates its final deployment output.

### 2. The internal SSG runner can load the Nitro plugin

The SSG runner creates Vite with the application `configFile`, so it retains the
application’s configured plugins. If Nitro is added to that same configuration,
the internal middleware-mode runner may initialize Nitro’s Vite integration while
the SSG plugin is trying to render one isolated route.

That can cause:

- Nitro build hooks or manifests to run during a static render;
- server output or deployment finalization to happen at the wrong time;
- Nitro virtual modules or aliases to affect the client/SSG module graph;
- listeners, file watchers, or server lifecycle state to leak into the build;
- recursive or duplicate Vite/Nitro build work.

The current `DotaSsgOptions` has no `excludePlugins` or internal-runner
configuration hook. Therefore the safe first integration is separate Vite/Nitro
build phases, or a dedicated SSG Vite config that does not register Nitro. A
phase marker and a documented Nitro no-op mode can be added later if one shared
config is required.

### 3. The static Vercel rewrite can bypass Nitro routes

The current root [`vercel.json`](../../../vercel.json) is designed for static SPA
hosting. Its broad rewrite sends unmatched requests to `/index.html`, while its
redirects canonicalize generated route directories.

In a Nitro deployment, this configuration can compete with Nitro’s route table:

- `/api/*` can be treated as a frontend fallback instead of an API route;
- generated HTML can be bypassed by the SPA shell;
- Nitro’s Vercel output and the repository’s static rewrite can disagree about
  route precedence;
- `/blogs` and `/community` may lose their static-directory redirects.

In hybrid mode, Nitro must own the final Vercel route configuration. The static
SPA rewrite must not remain the authority for the Nitro deployment. API routes,
generated HTML, static assets, and the client fallback need an explicit order.

### 4. `vercel: true` has the wrong owner in hybrid mode

When enabled, `dotaSsg({vercel: true})` edits `vercel.json` after prerendering.
That is appropriate for the current static deployment, but in hybrid mode Nitro
should own the final Vercel configuration and `.vercel/output` contract.

Leaving both systems active can produce configuration churn or a deployment that
contains Dota redirects but not Nitro’s server routes. Hybrid mode should disable
the Dota Vercel writer and express redirects in Nitro’s final route/deployment
configuration.

### 5. Build-time frontend API calls will not reach Nitro

During prerendering, Dota runs inside a synthetic `happy-dom` origin and no Nitro
HTTP server is listening. A component that calls a relative endpoint such as
`/api/subscription` from its initialization path will not reach the eventual
Nitro API during the build.

Possible symptoms are failed builds, unresolved data, incomplete HTML, or a build
that accidentally depends on a locally running server. Prerendered data must be
loaded from a build-time source, supplied through the SSG `settle` hook, or
explicitly excluded from prerendering. Runtime-only API calls belong in browser
hydration after Nitro is deployed.

The API source layout also needs to be checked against the selected Nitro version
and deployment provider. Current Nitro Vercel documentation says that Nitro's
`/api` directory is not compatible with Vercel and points standalone usage toward
`routes/api/`. The client must pin the Nitro version and follow that version's
route-discovery/provider contract; the audit must not assume that an API example
from another Nitro target works on Vercel.

### 6. Server and browser environments can be mixed accidentally

Nitro introduces server-only runtime configuration and secrets. Those values must
not cross into the Vite client graph or prerendered HTML unintentionally. A shared
module imported by both Nitro handlers and `src/` can expose server assumptions to
the `happy-dom` renderer or leak credentials into browser assets.

Keep Nitro handlers, server utilities, and secrets on the server side. Expose
only public API contracts to the Dota application, and verify that all
prerendered routes can execute without Nitro request context, server-only globals,
or private environment variables.

### 7. Static HTML and hydrated markup can diverge

If Nitro serves a different shell, asset version, or route fallback than the one
used by `dotaSsg`, Dota hydration can see a different template identity. The
current hydration plugin may warn and remount the affected host, which hides the
server-rendering benefit and can cause visible flicker.

The final Nitro deployment must serve the exact generated HTML and matching Vite
assets from the same build. Do not copy only the HTML after a separate client
build or allow Nitro to replace the shell with another `index.html`.

### 8. Redirect and trailing-slash behavior changes

The static deployment currently maps `/blogs` to `/blogs/` and serves
`blogs/index.html`. Nitro does not automatically inherit those Vercel redirects
when it becomes the server owner. The equivalent canonical redirects must be
implemented in Nitro or in its generated deployment configuration, and tested
against API paths so they do not redirect `/api/*` into the frontend.

## Recommended hybrid architecture

Use an explicit two-stage pipeline:

```text
Stage 1: Vite + dotaSsg
    ↓
static staging directory containing assets and prerendered HTML
    ↓
Stage 2: Nitro
    ├─ serves staging directory as public assets
    ├─ registers Nitro API handlers
    ├─ owns page fallback and route precedence
    └─ emits the only Vercel/server deployment artifact
```

The stages should have these ownership rules:

| Concern | Owner in hybrid mode |
| --- | --- |
| Client bundle and prerendered HTML | Vite + `dotaSsg` |
| Static asset publication | Nitro public-assets configuration |
| `/api/*` handlers | Nitro |
| Server fallback and route precedence | Nitro |
| Final Vercel/server output | Nitro only |
| Static `vercel.json` redirect writer | Disabled |

## Hybrid integration steps

### 1. Confirm the client requirement

Ask whether they need:

- Nitro APIs only, with no SEO/static route HTML;
- Nitro APIs plus route-specific prerendered HTML; or
- a separately deployed backend.

If they only need APIs, Nitro-only delivery is simpler and `dotaSsg` should not
be forced into the same build. If they need both APIs and prerendered pages, use
the hybrid sequence below.

### 2. Fix the current SSG realm bug first

Update [`window-globals.ts`](../../../packages/libs/dota-ssr/src/vite/window-globals.ts:27)
to allowlist browser globals or preserve host objects such as `Reflect`,
`globalThis`, `process`, `Buffer`, and timer/microtask primitives. Add tests that
`reflect-metadata` remains callable while a `happy-dom` route is installed.

This is required regardless of Nitro and must not be hidden by starting a server
during prerendering.

### 3. Separate the build phases

Do not initially add Nitro to the same Vite config that `dotaSsg` reloads for its
internal renderer. Choose one of these boundaries:

1. A dedicated SSG/client Vite config generates the staging directory, followed
   by a Nitro build.
2. A single outer build invokes Vite SSG first and Nitro consumes its completed
   output in a later command.

If a shared config becomes necessary, add a documented prerender marker and make
the Nitro plugin explicitly inert in the internal SSG runner. The marker must not
disable Nitro in the outer server build.

The Nitro Vite plugin is designed to coordinate Vite client/server environments,
so treating it as an ordinary post-build plugin beside `dotaSsg` is not a safe
assumption. Verify the resolved `build.outDir`, plugin hook order, and which
environment invokes `dotaSsg.closeBundle()` in the pinned Nitro/Vite versions.

### 4. Hand the static output to Nitro

Configure Nitro to publish the staging directory as public assets. Verify that
the final Nitro output contains:

- the Vite assets;
- `index.html`;
- every generated route document;
- the public images, documents, and other static files.

Do not assume that writing files to `dist/` makes them visible to Nitro.

### 5. Move route ownership to Nitro

Define and test the precedence explicitly:

1. `/api/*` goes to Nitro API handlers;
2. exact static assets and generated HTML are served from the SSG output;
3. canonical redirects such as `/blogs` → `/blogs/` run where required;
4. the SPA fallback handles only routes without generated HTML.

Disable `dotaSsg({vercel: true})` in this mode and remove the broad static
rewrite from the Nitro deployment configuration. Nitro must emit the only final
Vercel route/deployment configuration.

For Vercel specifically, verify the API handler directory and generated function
mapping against the pinned Nitro provider. Do not copy an API directory layout from
another Nitro target without checking that it becomes a deployed Vercel function.

### 6. Make prerendered data build-safe

Audit every route marked `ssr: true` for relative API calls, browser-only APIs,
server-only imports, timers, storage, and observer setup. Decide for each data
source whether it is:

- available synchronously at build time;
- loaded through an explicit build-time barrier;
- runtime-only and excluded from prerendering; or
- provided by a separate public data service during the build.

### 7. Validate the deployed hybrid output

The acceptance test should run against the final Nitro build, not only the Vite
staging directory:

- `GET /` and each generated route returns the expected static HTML;
- `/api/*` reaches Nitro and returns API responses, not `index.html`;
- client assets resolve from the same build as the HTML;
- canonical redirects preserve route behavior and do not affect APIs;
- browser hydration adopts the generated markup without remounting it;
- server-only configuration is absent from client bundles and prerendered HTML;
- the final Vercel artifact contains Nitro functions and the SSG public assets.

## Current repository evidence

The current app registers `dotaSsg` in
[`packages/apps/dota-web/vite.config.ts`](../../../packages/apps/dota-web/vite.config.ts:51)
and opts into concrete SSG routes `/`, `/blogs`, and `/community`. The root
[`vercel.json`](../../../vercel.json) is static-oriented and contains a broad
`/(.*)` → `/index.html` rewrite.

The current working tree passes TypeScript and package tests, but the full app
prerender currently fails with `Reflect.getOwnMetadata is not a function` because
of the broad global bridge described above. That defect should be resolved before
using a hybrid build as evidence.

## Related source

- [`@ayu-sh-kr/dota-ssr` README](../../../packages/libs/dota-ssr/README.md)
- [`dotaSsg` implementation](../../../packages/libs/dota-ssr/src/vite/index.ts)
- [`dotaSsg` options](../../../packages/libs/dota-ssr/src/vite/types.ts)
- [`dotaSsg` route resolver](../../../packages/libs/dota-ssr/src/vite/route-output.ts)
- [`dotaSsg` Vercel integration](../../../packages/libs/dota-ssr/src/vite/vercel-config.ts)
- [Dota Web Vite configuration](../../../packages/apps/dota-web/vite.config.ts)
