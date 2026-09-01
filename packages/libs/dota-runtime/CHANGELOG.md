# @ayu-sh-kr/dota-runtime

## 0.0.5

### Patch Changes

- Updated dependencies [13ba8e3]
  - @ayu-sh-kr/dota-router@0.1.0

## 0.0.4

### Patch Changes

- c7afdec: Adds a coordinated initial-mount strategy boundary across the Dota rendering
  stack. Dota Core now resolves one application-wide `MountStrategy` whenever a
  component first associates its rendered output with an element or shadow root.
  The default remains the existing client-side `render()` mount, so applications
  that do not install a strategy keep their current behavior.

  The new public `MountStrategy` contract receives the component host, render
  root, and initial `RenderOutput`, then returns the normal `MountResult`. This
  allows runtime integrations such as SSR hydration to adopt existing DOM before
  the component performs its first client render. A successful adopted mount can
  return `hydrated: true`, which Dota Core uses to emit the `HYDRATED` lifecycle
  event before `CONNECTED`; ordinary mounts do not emit that event.

  The strategy slot is intentionally exclusive. Runtime composition roots can
  register their strategy through `setMountStrategy()` before components connect,
  and integrations can inspect the active policy with `resolveMountStrategy()`.
  Registering a second strategy throws an error instead of silently changing
  mount behavior based on plugin registration order. The coordinated rendering,
  runtime, router, core, wrap, and SSR package updates keep this contract and its
  hydration lifecycle behavior consistent across the public API.

- Updated dependencies [c7afdec]
  - @ayu-sh-kr/dota-router@0.0.35
  - @ayu-sh-kr/dota-core@1.9.12

## 0.0.3

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.11
- @ayu-sh-kr/dota-router@0.0.34

## 0.0.2

### Patch Changes

- 22c3f24: Update the SSR module to support fetch during build for static content download and rendering
  - @ayu-sh-kr/dota-core@1.9.10
  - @ayu-sh-kr/dota-router@0.0.33

## 0.0.1

### Patch Changes

- a0fc7fe: This release separates Dota's runtime contracts from the application wrapper and
  adds a single, typed composition surface for Dota's Vite integrations. Consumers
  can use the wrapper as the public integration package while the underlying
  libraries retain direct ownership of their runtime and type dependencies.

  - Added `@ayu-sh-kr/dota-runtime` as the neutral home for
    `DotaRuntimePlugin`, `DotaRuntimeContext`, and route-renderer wrapper
    contracts. The package contains types only and does not pull browser
    bootstrap, Vite, Node, or SSG implementation into an application runtime.
  - Updated `@ayu-sh-kr/dota-ssr` to depend directly on the Core, Router,
    Rendering, and runtime-contract packages that own the types and behavior it
    publishes. This removes its source-level dependency on `@ayu-sh-kr/dota-wrap`
    and avoids relying on transitive type resolution.
  - Added the wrapper's `ssr`, `ssg`, and `vite` subpath exports. Applications can
    consume hydration and build-time SSG/Vite integrations through
    `@ayu-sh-kr/dota-wrap` without importing the wrapper root from build-only
    code or installing `@ayu-sh-kr/dota-ssr` separately.
  - Added `dotaVitePlugins()`, which composes the Dota preloader, event-map,
    Web Types, and optional SSG plugins in a stable order. Shared `root`, scan
    roots, and logging defaults are applied centrally while each plugin keeps its
    own nested configuration.
  - Kept server-owning integrations such as Nitro explicit through the
    composition factory's `extensions` option. Nitro is not enabled implicitly,
    so applications remain responsible for choosing their server, output, and
    deployment ownership.
  - Updated the hydration and route-rendering composition so runtime plugins are
    configured before component registration and route initialization. Existing
    client-only applications continue to use the default mount and rendering
    behavior when no runtime plugin is supplied.
  - Improved the SSG integration's module resolution so wrapper consumers can
    use the wrapper Rendering surface while the SSG runner continues to execute
    through Vite's transformed application graph. Static routes remain opt-in and
    are rendered in isolated DOM realms before their HTML is written to the
    configured build output.
  - Preserved the rendering package's hydration markers, template identity, DOM
    diffing, and targeted update behavior needed for server-rendered markup to be
    adopted by the browser runtime.
  - Kept build-only dependencies and Node-facing behavior out of the wrapper's
    browser runtime entry. The SSG and Vite subpaths remain opt-in, while the
    wrapper continues to expose the ordinary Core, Router, Rendering, and event
    runtime surfaces.
  - Updated the workspace `happy-dom` catalog to `20.10.6` and raised the
    `dota-ssr` peer minimum to `^20.8.8`, the first fixed range for
    CVE-2026-33943. This prevents the SSG dependency from resolving to the
    vulnerable `20.0.7` release while retaining the existing v20 runtime line.

- Updated dependencies [a0fc7fe]
  - @ayu-sh-kr/dota-router@0.0.32
  - @ayu-sh-kr/dota-core@1.9.9
