# Dota Wrap SSR and Vite plugin composition

This document records the implemented `dota-wrap` composition boundary. It
composes Dota plugins through one Vite factory and exposes SSR/SSG through the
wrapper without pulling build-only code into the browser runtime entry.

## Why `dota-ssr` used to depend on `dota-wrap`

The dependency exists primarily because the runtime-plugin contract is currently
declared by `dota-wrap`, not because the hydration implementation needs to call
wrapper functions directly.

In [`dota-ssr/src/index.ts`](../../../../../packages/libs/dota-ssr/src/index.ts),
the following imports from `dota-wrap` are type-only:

```ts
import type {DotaRuntimePlugin, DotaRuntimeContext} from '@ayu-sh-kr/dota-wrap';
import type {
  ComponentClass,
  NavigationContext,
  RouteMatch,
  RouteRenderer
} from '@ayu-sh-kr/dota-wrap/router';
```

The implemented imports in `dota-ssr/src/index.ts` are split by ownership:

```ts
import type {
  ComponentClass,
  NavigationContext,
  RouteMatch,
  RouteRenderer
} from '@ayu-sh-kr/dota-router';
import type {
  DotaRuntimeContext,
  DotaRuntimePlugin
} from '@ayu-sh-kr/dota-runtime';
```

The neutral contract itself imports `MountStrategy` directly from
`@ayu-sh-kr/dota-core` and the route types directly from
`@ayu-sh-kr/dota-router`. That is where the Core/Router type dependency is
needed; `dota-ssr` already has a direct Core dependency for its runtime helpers
and needs a direct Router dependency for the route types in its declarations.

`@ayu-sh-kr/dota-runtime` is the small type-only package that owns the
cross-package composition contract.

The actual runtime implementation imports Dota Core metadata helpers and Dota
Rendering primitives. `dotaHydration()` returns an object that conforms to
`DotaRuntimePlugin`, and its `setup()` function uses the two sockets supplied by
`DotaRuntimeContext`:

```text
dotaHydration()
    ↓ setup(context)
context.setMountStrategy(...)
context.wrapRouteRenderer(...)
    ↓
dota-wrap.initializeApp()
```

The context implementation belongs to `dota-wrap` because it is the application
composition root. The shared *shape* of that context does not belong there: it
bridges Dota Core's mount strategy and Dota Router's route renderer. The wrapper
installs runtime plugins before components and routes are registered, which is
required for hydration to adopt existing static hosts.

Therefore `dota-ssr` needs the shared contract and the underlying Core/Router
types, but it does not need a wrapper import for hydration itself.

The package metadata previously listed `@ayu-sh-kr/dota-wrap` in
[`dota-ssr/package.json`](../../../../../packages/libs/dota-ssr/package.json),
because the published declaration files exposed those wrapper-owned types. It
now depends directly on Core, Router, Rendering, and `dota-runtime`; the direct
wrapper dependency is gone.

## Where each type belongs

| Type | Owner | Reason |
| --- | --- | --- |
| `MountStrategy` | `@ayu-sh-kr/dota-core` | It controls Core's initial component mount boundary. |
| `ComponentClass` | `@ayu-sh-kr/dota-router` | It is the router's root and route-component constructor shape. |
| `NavigationContext` | `@ayu-sh-kr/dota-router` | It describes router navigation state. |
| `RouteMatch` | `@ayu-sh-kr/dota-router` | It describes the router's resolved destination. |
| `RouteRenderer` | `@ayu-sh-kr/dota-router` | It is the router presentation callback being decorated. |
| `RouteRendererWrapper` | neutral runtime contract | It composes a Router renderer without owning Router. |
| `DotaRuntimeContext` | neutral runtime contract | It combines Core and Router sockets for runtime extensions. |
| `DotaRuntimePlugin` | neutral runtime contract | It is the shared plugin shape implemented by features and consumed by the wrapper. |
| `AppConfig` and the context implementation | `@ayu-sh-kr/dota-wrap` | They are part of the wrapper's application composition root. |

The neutral contract package contains only interfaces and type aliases. It does
not import `dota-wrap`, browser bootstrap code, Vite, Node APIs, or SSG
implementation code.

## Can a type be used without a direct dependency?

`import type` prevents a JavaScript runtime import and therefore keeps the type
out of the browser bundle. It does **not** remove the package dependency needed
to compile and consume published declarations. If `dota-ssr/dist/index.d.ts`
contains an import from `@ayu-sh-kr/dota-router` or `@ayu-sh-kr/dota-runtime`,
those packages must be declared directly by `dota-ssr` (normally in
`dependencies`, unless the package deliberately publishes them as peers).

Relying on `dota-wrap` transitively is not a valid substitute: package managers
may not expose transitive packages to TypeScript resolution, and consumers can
install `dota-ssr` without installing the wrapper. The only alternatives are to
inline the structural type into the generated declarations or bundle/rewrite
the declarations, both of which duplicate and weaken the public contract.

The practical answer is therefore: use type-only imports to avoid a runtime
dependency, but declare direct package dependencies for the packages that own
the published types. `dota-ssr` now depends directly on Core, Router, Rendering,
and `dota-runtime`, and does not depend on `dota-wrap`.

## Why the current package layout is inconvenient

Before this migration, the application installed `@ayu-sh-kr/dota-ssr` separately:

```ts
import {dotaHydration} from '@ayu-sh-kr/dota-ssr';
import dotaSsg from '@ayu-sh-kr/dota-ssr/vite';
```

At the same time, `@ayu-sh-kr/dota-wrap` already bundles and exposes the Dota
preloader, event-map generator, and Web Types plugins through wrapper subpaths.
The SSG/hydration package is the remaining Dota integration that consumers must
install independently.

This creates two separate concerns for an application:

- configuration is repeated across several Vite plugin factories;
- the application must manage a second Dota package even though the wrapper is
  intended to be the consumer-facing package.

## Implemented single Vite composition function

`dota-wrap/vite` now exports a typed `dotaVitePlugins()` factory. It returns the
ordered child-plugin array while preserving each plugin’s native configuration:

```ts
import {dotaVitePlugins} from '@ayu-sh-kr/dota-wrap/vite';

export default defineConfig({
  plugins: [
    ...dotaVitePlugins({
      root: projectRoot,
      scanRoots: [projectRoot, dotaUiRoot, dotaMdRoot],
      logType: 'info',
      preloader: {},
      eventMap: {outFile: 'src/event-map.d.ts'},
      webTypes: {
        outFile: 'web-types.json',
        customElementsManifest: {
          enabled: true,
          outFile: 'custom-elements.json',
          updatePackageJson: true
        }
      },
      ssg: {
        autoDetectRoutes: true,
        vercel: true
      },
      extensions: []
    })
  ]
});
```

The factory returns `Plugin[]`, rather than wrapping all child hooks in a new
synthetic plugin. Returning the original plugin objects preserves Vite’s
`apply`, `enforce`, hook ordering, diagnostics, and plugin-specific behavior.
The factory owns shared defaults; each nested option group remains owned by its
plugin.

`extensions` accepts explicitly supplied third-party plugins such as Nitro. Nitro
is not silently enabled by the default Dota preset because it changes the output
directory, server ownership, and deployment routing. Its integration decision
remains with the application.

## Implemented wrapper export boundary

The wrapper exposes separate runtime and build-time surfaces:

```text
@ayu-sh-kr/dota-wrap
  ├─ runtime: core, router, event, rendering
  ├─ runtime: ssr       → dotaHydration()
  ├─ build-time: vite    → dotaVitePlugins()
  ├─ build-time: ssg    → dotaSsg()
  ├─ build-time: preloader-plugin
  ├─ build-time: event-map-generator
  └─ build-time: web-type-json
```

The `ssg` export remains isolated. It imports Node filesystem APIs, Vite, and
`happy-dom`; it is not exported from the wrapper root or the browser SSR entry.
The wrapper bundles the SSG implementation but leaves `happy-dom` external and
declares it as a direct wrapper dependency so a consumer installs it through the
wrapper package. The `vite` factory keeps the standalone SSG module external and
only references it from the build-time surface.

The SSG global bridge uses an explicit browser API allowlist and leaves Node host
globals and host constructors untouched. This prevents the isolated happy-dom
realm from corrupting the Node build process while still providing the DOM APIs
that Dota application modules use during prerendering.

The consumer goal is:

```text
install @ayu-sh-kr/dota-wrap
configure Dota runtime and Vite plugins through wrapper exports
do not install @ayu-sh-kr/dota-ssr separately
```

Vite is still owned by the consuming build. The wrapper owns the SSG integration
and its `happy-dom` dependency, so the client does not need a direct
`@ayu-sh-kr/dota-ssr` installation.

## The dependency-cycle constraint

The implemented dependency graph is:

```text
dota-ssr → core/rendering/router/runtime-contract
dota-wrap → core/event/rendering/rest/router/runtime-contract/dota-ssr
```

The cycle is removed because `dota-ssr` no longer imports `dota-wrap`.
`dota-wrap` can bundle and expose SSR/SSG without creating:

```text
dota-wrap ↔ dota-ssr
```

The implemented design uses a neutral runtime contract:

`DotaRuntimePlugin`, `DotaRuntimeContext`, and the related route-renderer wrapper
contract live in `@ayu-sh-kr/dota-runtime`:

```text
neutral runtime contract
    ├─ dota-wrap implements the composition root
    └─ dota-ssr implements the hydration plugin
```

`dota-wrap` can then depend on and expose `dota-ssr` without `dota-ssr` depending
back on the wrapper package. The neutral package depends on Core and Router only
for the types used by the contract; it does not depend on the wrapper.

The wrapper does bundle the implementation into its `ssr` and `ssg` subpaths,
but the source-level contract remains neutral and the browser runtime remains
separate from Node/SSG code.

## Implementation sequence and verification

1. **Inventory and classify the public types.** `MountStrategy` is Core-
   owned; `ComponentClass`, `NavigationContext`, `RouteMatch`, and
   `RouteRenderer` are Router-owned; and `RouteRendererWrapper`,
   `DotaRuntimeContext`, and `DotaRuntimePlugin` as neutral composition
   contracts. Keep `AppConfig`, `initializeApp()`, and the actual context object
   in `dota-wrap`.
2. **Create the neutral runtime contract.** The three composition contracts were
   moved out of `dota-wrap` into `@ayu-sh-kr/dota-runtime`, which imports Core
   and Router types directly and remains free of runtime implementation, Vite,
   Node, and browser bootstrap imports.
3. **Update `dota-wrap` to consume the contract.** `dota-wrap` imports the
   neutral types, continues to create the context in `initializeApp()`, and
   re-exports the types through its compatibility barrel.
4. **Update `dota-ssr` imports and package metadata.** `dota-ssr` imports Core
   runtime helpers, Router types from `@ayu-sh-kr/dota-router`, and the runtime
   contracts from `@ayu-sh-kr/dota-runtime`. Its package metadata adds the direct
   Router/runtime dependencies and removes `@ayu-sh-kr/dota-wrap`.
5. **Verify declaration ownership.** The `dota-ssr` build emits declarations
   referencing Core, Router, and `dota-runtime`, with no `dota-wrap` reference.
6. **Add the typed `dotaVitePlugins()` factory.** The wrapper factory applies
   shared root, scan-root, and logging defaults while retaining nested plugin
   configuration. It returns original `Plugin` objects.
7. **Preserve explicit Nitro ownership.** The factory keeps Nitro and other
   server-owning integrations in explicit `extensions`; it does not enable them
   by default.
8. **Add wrapper build-time exports.** `package.json` and the wrapper build now
   publish `ssr`, `vite`, and `ssg` subpaths. The root and SSR entries contain no
   Node/SSG modules.
9. **Keep build-only modules isolated.** `ssg` is a Node entry with external
   `happy-dom`; `vite` is a build-time entry; neither is reachable from the
   browser runtime root.
10. **Migrate the client.** `dota-web` now imports hydration from
    `@ayu-sh-kr/dota-wrap/ssr` and its Vite plugins from
    `@ayu-sh-kr/dota-wrap/vite`; its direct `@ayu-sh-kr/dota-ssr` dependency was
    removed.
11. **Validate the real consumer.** `pnpm --filter dota-web test` passes, and
    `pnpm --filter dota-web build` passes with three SSG routes prerendered.
    Wrapper surface smoke tests also load `vite` and `ssg` and verify explicit
    extension composition. A packed wrapper contains all three new subpaths and
    rewrites its workspace dependencies to publishable versions.

## Related source

- [`dota-ssr/package.json`](../../../../../packages/libs/dota-ssr/package.json)
- [`dota-ssr` hydration implementation](../../../../../packages/libs/dota-ssr/src/index.ts)
- [`dota-ssr` SSG implementation](../../../../../packages/libs/dota-ssr/src/vite/index.ts)
- [`dota-ssr` SSG global bridge](../../../../../packages/libs/dota-ssr/src/vite/window-globals.ts)
- [`dota-wrap/package.json`](../../../../../packages/libs/dota-wrap/package.json)
- [`dota-wrap` composition root](../../../../../packages/libs/dota-wrap/src/index.ts)
- [`dota-wrap` runtime plugin contract](../../../../../packages/libs/dota-wrap/src/runtime-plugin.ts)
- [`dota-runtime` shared contract](../../../../../packages/libs/dota-runtime/src/index.ts)
- [`dota-wrap` Vite composition](../../../../../packages/libs/dota-wrap/src/vite/index.ts)
- [`dota-wrap` build script](../../../../../packages/libs/dota-wrap/scripts/build.mjs)
