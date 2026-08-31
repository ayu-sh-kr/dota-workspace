# @ayu-sh-kr/dota-wrap

## 0.0.33

### Patch Changes

- 009270c: Add configurable request interception and cancellation to `@ayu-sh-kr/dota-rest`, and make static-site generation opt-in for Dota SSR consumers.

  - Register client-wide synchronous or asynchronous request interceptors that run in order before `fetch`, can mutate or replace requests, and stop execution when they fail.
  - Supply a request-scoped `AbortController` through the fluent request builder; the same controller is available to interceptors and drives both manual and timeout cancellation.
  - Apply Dota SSR static-site generation only for builds started with the `--ssg` flag, with updated setup guidance for Dota Wrap consumers.

- Updated dependencies [009270c]
- Updated dependencies [009270c]
  - @ayu-sh-kr/dota-rest@1.2.0
  - @ayu-sh-kr/dota-ssr@0.0.7

## 0.0.32

### Patch Changes

- Updated dependencies [c5fa794]
  - @ayu-sh-kr/dota-rest@1.1.6

## 0.0.31

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
  - @ayu-sh-kr/dota-rendering@0.1.5
  - @ayu-sh-kr/dota-runtime@0.0.4
  - @ayu-sh-kr/dota-router@0.0.35
  - @ayu-sh-kr/dota-core@1.9.12
  - @ayu-sh-kr/dota-ssr@0.0.6

## 0.0.30

### Patch Changes

- fba2a36: Improve Dota's opt-in hydration handoff so nested components and the initial
  route can retain server-rendered DOM safely. This is a patch release for
  client-only applications. Applications that prerender pages must rebuild and
  deploy their static HTML together with the browser bundle because durable marker
  format version 2 is not compatible with version 1 output.

  - `@ayu-sh-kr/dota-rendering` now gives every statically rendered component a
    `data-dh-s` scope. Child, keyed, and dynamic-attribute markers include that
    scope, so a parent renderer adopts only its own markers and cannot consume
    nested component state. Structural client remounts remove the scope and the
    other build-only host markers.
  - Added `deferRender()`, which lets an integration retain already-committed DOM
    until the component receives its first client update. Once activated, it uses
    the ordinary render-session patching and disposal behavior.
  - `@ayu-sh-kr/dota-ssr` now validates the component scope alongside the template
    identity and marker version before hydrating. A stale or incomplete host still
    follows the configured mismatch policy: warn and remount that host by default,
    or throw when `mismatch: 'throw'` is selected.
  - The SSG renderer marks the settled initial route with a versioned route marker.
    Browser startup captures the root and page before custom-element upgrade,
    retains both through the matching initial route transition, applies route SEO,
    and then releases ownership for normal later navigation. Legacy template-marked
    output remains accepted during the transition.
  - `@ayu-sh-kr/dota-wrap` continues to expose these hydration capabilities through
    its existing SSR integration surface; no import migration is required.

- Updated dependencies [fba2a36]
  - @ayu-sh-kr/dota-rendering@0.1.4
  - @ayu-sh-kr/dota-ssr@0.0.5
  - @ayu-sh-kr/dota-core@1.9.11
  - @ayu-sh-kr/dota-router@0.0.34
  - @ayu-sh-kr/dota-runtime@0.0.3

## 0.0.29

### Patch Changes

- Updated dependencies [22c3f24]
  - @ayu-sh-kr/dota-rendering@0.1.3
  - @ayu-sh-kr/dota-runtime@0.0.2
  - @ayu-sh-kr/dota-ssr@0.0.4
  - @ayu-sh-kr/dota-core@1.9.10
  - @ayu-sh-kr/dota-router@0.0.33

## 0.0.28

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
  - @ayu-sh-kr/dota-runtime@0.0.1
  - @ayu-sh-kr/dota-router@0.0.32
  - @ayu-sh-kr/dota-core@1.9.9
  - @ayu-sh-kr/dota-ssr@0.0.3
  - @ayu-sh-kr/dota-rendering@0.1.2

## 0.0.27

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-rendering@0.1.1
  - @ayu-sh-kr/dota-router@0.0.31
  - @ayu-sh-kr/dota-core@1.9.8

## 0.0.26

### Patch Changes

- a40fbbe: Add optional router-instance global navigation hooks. Applications can register
  ordered `beforeEach` guards and `afterEach` observers through
  `DotaRouterService.fromComponents()` or `dota-wrap`'s `initializeApp()`; existing
  configuration behaves unchanged when the option is omitted.
- Updated dependencies [a40fbbe]
  - @ayu-sh-kr/dota-router@0.0.30

## 0.0.25

### Patch Changes

- 7cce9b6: Fixed the event map generator to resolve types of the event correctly

## 0.0.24

### Patch Changes

- 63cb5b3: Republish `@ayu-sh-kr/dota-wrap` with the latest bundled event-map generator so consumers receive
  event-name constant resolution and annotated callable payload type resolution through the
  `@ayu-sh-kr/dota-wrap/event-map-generator` entry point.

## 0.0.23

### Patch Changes

- 00ede55: This patch release adds typed application-event map generation across the Dota tooling
  stack:

  - `@ayu-sh-kr/dota-event-map-generator` adds a Vite plugin that scans configured
    TypeScript roots for `@OnEvent` listeners and `publish`, `publishAsync`, or `emit`
    calls. It generates an `ApplicationEventMap` augmentation with recoverable payload
    types, defaults to `src/event-map.d.ts`, and can optionally emit source-location JSON
    for editor and tooling navigation.
  - `@ayu-sh-kr/dota-ast-utils` adds reusable AST views and syntax-based type-resolution
    helpers for inspecting calls, objects, decorators, class methods, source offsets, and
    TypeScript annotations without creating a full TypeScript program.
  - `@ayu-sh-kr/dota-wrap` exposes the event-map generator at the
    `@ayu-sh-kr/dota-wrap/event-map-generator` subpath and bundles it with the wrapper so
    consumers can configure it alongside the other Dota Wrap plugins.

## 0.0.22

### Patch Changes

- Updated dependencies [cd53e12]
  - @ayu-sh-kr/dota-router@0.0.29

## 0.0.21

### Patch Changes

- Updated dependencies [cfe30aa]
  - @ayu-sh-kr/dota-core@1.9.7
  - @ayu-sh-kr/dota-router@0.0.28

## 0.0.20

### Patch Changes

- Updated dependencies [12ebbe3]
  - @ayu-sh-kr/dota-core@1.9.6
  - @ayu-sh-kr/dota-router@0.0.27

## 0.0.19

### Patch Changes

- f3647ff: Install stateful Dota runtimes transitively and keep them external to wrapper bundles so every subpath shares one application event bus and listener registry, while bundling build-time plugins for consistent virtual-module support.

## 0.0.18

### Patch Changes

- f2f9b57: Bundle the Dota packages re-exported by `dota-wrap` so consumers only need to install `@ayu-sh-kr/dota-wrap`.

## 0.0.17

### Patch Changes

- d6a06c8: New Components, Wrap export fix and Web Types json build fix

## 0.0.16

### Patch Changes

- be039dd: Fix the dota-wrap for re moduling and export along with declaratin

## 0.0.15

### Patch Changes

- 57f0c7c: Updated dota-wrap to support internal build for external packages, added a new component orb-background to dota-ui

## 0.0.14

### Patch Changes

- 63a8619: Added new web-type-json to support IDE intellisense by generating web component metadata and further improved the ecosystem with bug fixes, tests and feature improvement
- Updated dependencies [63a8619]
  - @ayu-sh-kr/dota-web-type-json@0.0.2

## 0.0.13

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.5
- @ayu-sh-kr/dota-router@0.0.26

## 0.0.12

### Patch Changes

- Updated dependencies [0873984]
  - @ayu-sh-kr/dota-core@1.9.4
  - @ayu-sh-kr/dota-router@0.0.25

## 0.0.11

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.3
- @ayu-sh-kr/dota-router@0.0.24

## 0.0.10

### Patch Changes

- Updated dependencies [35c9b8a]
  - @ayu-sh-kr/dota-router@0.0.23
  - @ayu-sh-kr/dota-core@1.9.2

## 0.0.9

### Patch Changes

- Updated dependencies [9b95d48]
  - @ayu-sh-kr/dota-core@1.9.1
  - @ayu-sh-kr/dota-router@0.0.22

## 0.0.8

### Patch Changes

- Updated dependencies [4272d8d]
  - @ayu-sh-kr/dota-core@1.9.0
  - @ayu-sh-kr/dota-router@0.0.21

## 0.0.7

### Patch Changes

- Updated dependencies [0d00dc3]
  - @ayu-sh-kr/dota-core@1.8.4
  - @ayu-sh-kr/dota-router@0.0.20

## 0.0.6

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project
- Updated dependencies [be58089]
  - @ayu-sh-kr/dota-router@0.0.19
  - @ayu-sh-kr/dota-core@1.8.3

## 0.0.5

### Patch Changes

- 439baa7: Improved app FCP time
- Updated dependencies [439baa7]
  - @ayu-sh-kr/dota-core@1.8.2
  - @ayu-sh-kr/dota-router@0.0.18

## 0.0.4

### Patch Changes

- Updated dependencies [e044ad8]
  - @ayu-sh-kr/dota-core@1.8.1
  - @ayu-sh-kr/dota-router@0.0.17

## 0.0.3

### Patch Changes

- Updated dependencies [a69c83b]
  - @ayu-sh-kr/dota-core@1.8.0
  - @ayu-sh-kr/dota-router@0.0.16

## 0.0.2

### Patch Changes

- 4d98eb5: Modify the dota-router to let user provide their root component instead of guessing it to be app-root

  ### Patch Changes

  - Modifies dota-router to accept a root component field in its configuration.
  - Updates dota-wrap to ensure compatibility with the new root component configuration in dota-router.

- Updated dependencies [4d98eb5]
  - @ayu-sh-kr/dota-router@0.0.15

## 0.0.1

### Patch Changes

- 2e89848: Reconfigured the project structure and bring all the projects under the common umbrella.

  ### Patch Changes

  - Updated dependencies to the latest versions.
  - Fixed minor bugs in the routing module.
  - Improved performance of the core library.
  - Enhanced REST API handling.
  - Refactored codebase for better maintainability.

  ### Changes Dota Router

  - Fix the routing algorithm to capture the routes correctly when auto-configured using the `@Route` decorator.
  - Route tree building improved to handle nested routes more efficiently.

  ### Changes Dota Core

  - No significant changes, just dependency updates and minor bug fixes.

  ### Changes Dota Rest

  - No significant changes, just dependency updates and minor bug fixes.

  ### Changes Dota Wrap

  - Added new project to encapsulate common utilities and helpers for Dota-related projects.
  - Allows for building advance web applications with Dota ecosystem.
  - Packed with useful utilities to build web component, define routes, handle rest api calls, and manage state effectively.
  - Improved overall project structure for better scalability and maintainability.

  ### Overall Improvements

  - Reorganized the project structure to have a monorepo setup.
  - Improved build and deployment processes.
  - Enhanced documentation for better developer experience.

- Updated dependencies [2e89848]
  - @ayu-sh-kr/dota-router@0.0.14
  - @ayu-sh-kr/dota-core@1.7.3
