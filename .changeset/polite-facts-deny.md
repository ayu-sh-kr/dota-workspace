---
"@ayu-sh-kr/dota-runtime": patch
"@ayu-sh-kr/dota-router": patch
"@ayu-sh-kr/dota-core": patch
"@ayu-sh-kr/dota-wrap": patch
"@ayu-sh-kr/dota-ssr": patch
"@ayu-sh-kr/dota-rendering": patch
---

This release separates Dota's runtime contracts from the application wrapper and
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
