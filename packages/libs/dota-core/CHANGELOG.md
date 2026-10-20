# @ayu-sh-kr/dota-core

## 1.12.3

### Patch Changes

- Updated dependencies [f7c8e46]
  - @ayu-sh-kr/dota-rendering@0.3.0

## 1.12.2

### Patch Changes

- Updated dependencies [fcca00d]
  - @ayu-sh-kr/dota-rendering@0.2.2

## 1.12.1

### Patch Changes

- ba59a15: Package diagnostics now use Consola with ISO timestamps, severity, and package/source-file tags. Logging defaults to `info`; set `DOTA_LOG_TYPE` globally or `DOTA_<PACKAGE>_LOG_TYPE` for one package (for example, `DOTA_SSR_LOG_TYPE=debug`). Explicit plugin `logType` settings take precedence.

  The `dotaVitePlugins` wrapper accepts a shared `logType`, per-plugin overrides, and `packageLogTypes` for preloader, event-map generation, Web Types, SSG, and SSR. `initializeApp({logging: {logType, packages}})` can also set runtime levels for all packages or individual packages. Package environment settings take precedence over shared wrap settings. The Node SSR server logs the URL it listens on, such as `http://localhost:3000`. Routine SSR and SSG timing details now appear at `debug` while `info` stays concise. During SSG, rendering diagnostics follow the SSG level unless `DOTA_RENDERING_LOG_TYPE` or a `dota-rendering` package setting overrides it.

- Updated dependencies [ba59a15]
  - @ayu-sh-kr/dota-common-utils@0.1.0
  - @ayu-sh-kr/dota-rendering@0.2.1

## 1.12.0

### Minor Changes

- d485d33: Pages can publish schema.org structured data through `SEO.jsonLd`, a JSON-LD object or array.

  - `updateDocumentSEO` (and therefore `DotaPageElement`) keeps one `<script type="application/ld+json">` in the document head in sync with it, and removes it when a page has no `jsonLd`, so structured data never carries over to the next route.
  - The managed script is marked with the new `SEO_JSON_LD_ATTRIBUTE` (`data-dota-seo`). JSON-LD scripts written by the application are left untouched, and server renderers can write the same attribute so the browser updates their script instead of adding a second one.
  - `seoHeadTags(seo)` describes every head element page SEO manages (title, meta, link, JSON-LD) in write order, with absent values marking tags to remove; `seoHeadTagSelector(tag)` identifies the element each one manages. `updateDocumentSEO` applies this list, and server renderers serialize the same one, so the head built on the server always matches the browser's.

### Patch Changes

- Updated dependencies [d485d33]
- Updated dependencies [d485d33]
  - @ayu-sh-kr/dota-rendering@0.2.0

## 1.11.0

### Minor Changes

- 87d1288: Add render modes to Dota Core. `@Component({mode: 'csr'})` keeps a component out of SSG and SSR output: during a server render its host stays empty and is marked `data-dota-csr`, and in the browser it mounts fresh instead of going through the hydration mount strategy.

  - New `RouteRenderMode` (`'ssr' | 'ssg' | 'csr'`) and `ComponentRenderMode` (`'inherit' | 'csr'`) types.
  - `resolveRouteRenderMode()` resolves `mode` first and maps the legacy `ssr: true` to `'ssg'`.
  - `resolveComponentRenderMode()`, `setServerRender()`, `isServerRender()` and `CLIENT_ONLY_ATTRIBUTE` let routers and server adapters share one contract.

## 1.10.0

### Minor Changes

- f0663f6: Component lifecycle work is cheaper, and moved elements keep their rendered DOM.

  - Connecting, disconnecting, and setting properties no longer read `reflect-metadata` on every call or define empty metadata maps on each instance. Mount and property sets are about 25% faster, and teardown about 30% faster. The new `HelperUtils.readMetadata(instance, kind)` gives the same cached, read-only lookup to other code.
  - Re-attaching a moved element updates its existing render instead of mounting it again. Input values, focus, and descendant components inside it are preserved, and state changed while it was detached is still rendered.
  - `@EventListener` now removes its window and host listeners on disconnect. Previously they leaked and kept firing on detached elements.

- f0663f6: Decorators now store component metadata in a typed metadata layer, so subclasses inherit decorated members and the decorators are ready to move to standard (TC39) decorators.

  - `Metadata.for(target)` returns a fluent, cached record for a class, prototype, instance, or standard decorator context. `MetadataKey.value()` and `MetadataKey.map()` create scoped keys, `get` and `has` resolve inheritance, and `own` reads one class only. dota-core's keys are exported as `CoreMetadata`.
  - A component that extends another component now inherits its `@Property`, `@State`, `@Watcher`, `@BindEvent`, listener, `@Emitter`, `@Param`, `@Element`, `@Expose`, and init-hook declarations. `observedAttributes` includes inherited attributes, and a subclass no longer adds its attributes to its parent's list.
  - `@BeforeInit` and `@AfterInit` run on any method name, base class first. Previously only methods named `beforeViewInit` and `afterViewInit` ran.
  - Watchers and init hooks call the instance's method, so a subclass override runs.
  - `@BindEvent` only matches elements inside the component. A matching ancestor outside it no longer triggers the handler.
  - `@EventListener` is bound by `BaseElement` and only applies to `BaseElement` subclasses.
  - `PropertyUtils.unbindWatchers` no longer removes a class's watchers for every instance. It is deprecated and does nothing.
  - `HelperUtils.fetchOrCreate` is deprecated in favour of `Metadata.for()`, but it keeps working. The appenders the decorators used (`Property`, `Bind`, `Before`, `After`, `Watcher:<name>`, and so on) return a live view of the metadata layer: reads include inherited entries, and writes reach the class. `HelperUtils.getComponentMetadata(ctor, 'Component')` still works.
  - `@Component` no longer stores a list of prototype methods or a `ClassName:shadow` metadata key.

  Lifecycle events and hooks keep their previous microtask timing.

## 1.9.13

### Patch Changes

- Updated dependencies [d5cfc3e]
  - @ayu-sh-kr/dota-rendering@0.1.6

## 1.9.12

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

## 1.9.11

### Patch Changes

- Updated dependencies [fba2a36]
  - @ayu-sh-kr/dota-rendering@0.1.4

## 1.9.10

### Patch Changes

- Updated dependencies [22c3f24]
  - @ayu-sh-kr/dota-rendering@0.1.3

## 1.9.9

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
  - @ayu-sh-kr/dota-rendering@0.1.2

## 1.9.8

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-rendering@0.1.1

## 1.9.7

### Patch Changes

- cfe30aa: Document the patch release for source documentation support in generated Web Types and Custom Elements Manifest metadata.

  The implementation described in `documentation/packages/plugins/web-type-json/planning/tsdoc-description-extraction.md` will:

  - Use existing component TSDoc as the fallback description for Web Types elements.
  - Use adjacent property TSDoc and structured class-level `@property` tags for property descriptions.
  - Preserve decorator-provided descriptions as the authoritative value.
  - Keep HTML attributes, JavaScript properties, and CEM members synchronized through the shared scan metadata.
  - Reuse the existing single source read and AST parse, with UTF-8-safe declaration anchors from `dota-ast-utils`.
  - Preserve Markdown documentation, deterministic generation, and current output behavior when documentation is absent.
  - Add coverage for multiline decorators, Unicode source text, malformed comments, description precedence, repeated generation, and Web Types/CEM propagation.
  - Treat a present HTML boolean attribute with an empty string value as `true`, while preserving explicit `true` and `false` values and rejecting invalid boolean text.

  These are patch-level DX improvements: they enrich IDE documentation and make boolean HTML attribute presence behave correctly without changing component APIs or decorator contracts.

## 1.9.6

### Patch Changes

- 12ebbe3: - Improve Dota UI components with typed, per-instance style configuration across accordion, avatar, badge, button, carousel, slide, scroll deck, icon, modal, placeholder, and scaffold components. Strengthen icon loading, escape badge labels safely, and refresh generated web-types metadata.

  - Refactor `dota-modal` to use the native dialog API with synchronized state and `modalChange` events for Escape, backdrop, close-button, and programmatic dismissals. Improve popover lifecycle handling and accessibility, add reduced-motion-aware modal animation, and make carousel component exports and structure more consistent.

  - Add object-property serialization and reliable attribute synchronization in Dota Core, including support for object defaults and coverage for non-string property reflection.

  - Document Web Types plugin helpers and reorganize/add workspace guidance for component design, reusable web components, code and web-component documentation, feature documentation, blogs, dark mode, application events, scrolling, and Markdown embeds. Add the Dota Web home-page FAQ component.

## 1.9.5

### Patch Changes

- Updated dependencies [70aec54]
  - @ayu-sh-kr/dota-event@0.0.5

## 1.9.4

### Patch Changes

- 0873984: Integrated the dota-ui to the dota-ecosystem for better support and more components integration

## 1.9.3

### Patch Changes

- Updated dependencies [5ee8e6c]
  - @ayu-sh-kr/dota-event@0.0.4

## 1.9.2

### Patch Changes

- 35c9b8a: added support for event channel which creates and manages namespaced events on global bus, add rich test for dota-core
- Updated dependencies [35c9b8a]
  - @ayu-sh-kr/dota-event@0.0.3

## 1.9.1

### Patch Changes

- 9b95d48: Added new binding manager for application which prevents binding of same method to same listener multiple time when a class is redered or called bind multiple times
- Updated dependencies [9b95d48]
  - @ayu-sh-kr/dota-event@0.0.2

## 1.9.0

### Minor Changes

- 4272d8d: Added new module/lib dota-event to handle in-app events

### Patch Changes

- Updated dependencies [4272d8d]
  - @ayu-sh-kr/dota-event@0.0.1

## 1.8.4

### Patch Changes

- 0d00dc3: Added a new DotaPageElement to help with page seo

## 1.8.3

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project

## 1.8.2

### Patch Changes

- 439baa7: Improved app FCP time

## 1.8.1

### Patch Changes

- e044ad8: Fix the event binding to be more mature and able to handle events across dom changes

## 1.8.0

### Minor Changes

- a69c83b: Updated the core rendering logic of the component itself, inorder to improve UI updates

## 1.7.3

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
