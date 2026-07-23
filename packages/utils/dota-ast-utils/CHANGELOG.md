# @ayu-sh-kr/dota-ast-utils

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
