# @ayu-sh-kr/dota-rendering

## 0.3.1

### Patch Changes

- 05c5579: Hydration now writes attribute and text values that differ from the server markup. Previously,
  when a component's first browser render produced a different value than the prerendered HTML
  (for example, state read only in the browser, such as the current theme), the server value stayed
  on the page and later updates to that same value were skipped, because they compared against the
  browser render. Matching markup is adopted unchanged, as before.

## 0.3.0

### Minor Changes

- f7c8e46: Prerendered and server-rendered pages keep Dota UI components in place when they hydrate, instead of rebuilding them after first paint.

  - `dota-icon`, `dota-accordion`, `dota-button`, `dota-popover`, `dota-breadcrumb`, `scroll-deck`, `d-avatar`, `avatar-wrapper`, `dota-chip`, `dota-alert`, `orb-background`, and `cloud-chamber` render `html` templates, so hydration adopts their server markup.
  - `dota-button`, `dota-popover`, `scroll-deck`, `avatar-wrapper`, and `dota-chip` move their authored children into their rendered markup instead of copying them through `innerHTML`. Child elements keep their identity, listeners, and the hydration markers of the template that authored them. The public `content` string field of `dota-button`, `avatar-wrapper`, and `dota-chip` is removed; author the content as children.
  - `dota-button` applies `disabled` and `aria-label` after each render. Without an `aria-label`, the inner button has none.
  - `orb-background` applies the current theme's glow after hydration.
  - Dota Rendering exports `LIGHT_DOM_SLOT_ATTRIBUTE` (`data-dota-slot`), which marks the template element that receives a light-DOM host's authored children. Dota SSR's string adapter places a host's authored children in that element; hosts without one drop them as before.

## 0.2.2

### Patch Changes

- fcca00d: Hydration keeps more server DOM and does less work on first load.

  - Attribute parts adopted during hydration now keep updating when a nested light-DOM component re-renders the element that carries them.
  - A string-rendering component whose server markup already matches its output keeps the existing nodes instead of rewriting them.
  - Repeated mounts of the same template reuse one parse, and adoption matches attribute markers in linear time.

## 0.2.1

### Patch Changes

- ba59a15: Package diagnostics now use Consola with ISO timestamps, severity, and package/source-file tags. Logging defaults to `info`; set `DOTA_LOG_TYPE` globally or `DOTA_<PACKAGE>_LOG_TYPE` for one package (for example, `DOTA_SSR_LOG_TYPE=debug`). Explicit plugin `logType` settings take precedence.

  The `dotaVitePlugins` wrapper accepts a shared `logType`, per-plugin overrides, and `packageLogTypes` for preloader, event-map generation, Web Types, SSG, and SSR. `initializeApp({logging: {logType, packages}})` can also set runtime levels for all packages or individual packages. Package environment settings take precedence over shared wrap settings. The Node SSR server logs the URL it listens on, such as `http://localhost:3000`. Routine SSR and SSG timing details now appear at `debug` while `info` stays concise. During SSG, rendering diagnostics follow the SSG level unless `DOTA_RENDERING_LOG_TYPE` or a `dota-rendering` package setting overrides it.

- Updated dependencies [ba59a15]
  - @ayu-sh-kr/dota-common-utils@0.1.0

## 0.2.0

### Minor Changes

- d485d33: Add a DOM-free `@ayu-sh-kr/dota-rendering/server` entry that serializes `html` templates to HTML strings carrying the same durable hydration markers `hydrate()` adopts.

  - `serializeOutput(output, scope?)` renders a `TemplateResult`, a legacy string, or `nothing`; with a scope it emits element indexes, `data-dh-a` attribute tokens, and child-part and keyed-entry comments.
  - `escapeHtml(value)` escapes text and quoted attribute values.
  - `tokenizeHtml(source)`, `decodeHtmlEntities(value)`, the token types, `TEMPLATE_ELEMENT`, and `SHADOW_ROOT_MODE_ATTRIBUTE` expose the lexical HTML support that server tooling needs to read the same markup.

  The server entry imports the root entry, so both share one copy of values such as `nothing` and one set of types. The root entry and its bundled declarations are unchanged.

- d485d33: Export the durable hydration marker format so other emitters, such as Dota SSR's string renderer, produce exactly what `hydrate()` adopts.

  - `hydrationIdentity(tagName, strings, scope)` returns the four host attributes (`data-dh-c`, `data-dh-t`, `data-dh-v`, `data-dh-s`); `HYDRATION_IDENTITY_ATTRIBUTES` lists them for clearing.
  - `childPartMarkers`, `keyedEntryMarkers`, and `attributePartToken` build the comment and `data-dh-a` formats; `hydrationScope(n)` and `isHydrationScope` define the `h0`, `h1`, … scope shape.
  - The template conventions the renderer writes (`COMPONENT_START_MARKER`, `COMPONENT_END_MARKER`, `NODE_INDEX_ATTRIBUTE`, `COMPONENT_ATTRIBUTE`, `DYNAMIC_ATTRIBUTE`) are now public constants.

  The renderer itself uses these, so emitted markup is unchanged.

## 0.1.6

### Patch Changes

- d5cfc3e: Re-rendering a template whose structure changed, for example when a conditional part before a list switches to `nothing`, now applies attribute values to the newly mounted elements. Previously a node from the outgoing render that shared a part locator could receive the value, leaving list items without their attributes.

## 0.1.5

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

## 0.1.4

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

## 0.1.3

### Patch Changes

- 22c3f24: Update the SSR module to support fetch during build for static content download and rendering

## 0.1.2

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

## 0.1.1

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.
