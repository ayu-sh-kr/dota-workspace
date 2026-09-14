# @ayu-sh-kr/dota-ast-utils

## 0.1.0

### Minor Changes

- ebd9613: Improve static-site generation with concurrent rendering, configurable deployment output, and clearer build diagnostics.

  - `@ayu-sh-kr/dota-ssr` now supports explicit `deployment` targets for Vercel, Netlify, Cloudflare Pages, and GitHub Pages. Netlify and Cloudflare Pages receive managed `_redirects` rules, GitHub Pages receives route-shaped HTML aliases plus `.nojekyll`, and Vercel continues updating `vercel.json`.
  - Existing `vercel: true`, `vercel: false`, and `vercel: {configFile}` settings remain compatible. An explicit `deployment` setting takes precedence, including `deployment: false`.
  - Generated redirect blocks preserve authored rules, remove stale generated routes, respect Vite `base`, and avoid rewriting unchanged files.
  - SSG generation prepares deployment files after route output is written and still prepares platform metadata when no routes are selected.
  - `dota-web` uses a direct `deployment` setting in `vite.config.ts`; change the value to select the hosting target.
  - `@ayu-sh-kr/dota-ast-utils` now compiles its JSON import attributes with an `ESNext` module target.
  - Added coverage for deployment precedence, redirect preservation and replacement, base paths, GitHub Pages conflicts, legacy Vercel behavior, and empty-route builds.

## 0.0.6

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

## 0.0.5

### Patch Changes

- 7cce9b6: Fixed the event map generator to resolve types of the event correctly

## 0.0.4

### Patch Changes

- f6c3a19: Generate typed application event maps and resolve callable payload return types.

  - Event payloads can be recovered from explicitly annotated function, arrow-function, and function-expression returns, including identifier-mediated calls.
  - `dota-md` and `dota-ui` now generate package-local event-map declarations during their Vite builds.
  - Unsupported inferred or dynamic calls remain safely unresolved instead of inventing payload types.

## 0.0.3

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

## 0.0.2

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
