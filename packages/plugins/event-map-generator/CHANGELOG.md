# @ayu-sh-kr/dota-event-map-generator

## 0.0.3

### Patch Changes

- f6c3a19: Generate typed application event maps and resolve callable payload return types.

  - Event payloads can be recovered from explicitly annotated function, arrow-function, and function-expression returns, including identifier-mediated calls.
  - `dota-md` and `dota-ui` now generate package-local event-map declarations during their Vite builds.
  - Unsupported inferred or dynamic calls remain safely unresolved instead of inventing payload types.

- Updated dependencies [f6c3a19]
  - @ayu-sh-kr/dota-ast-utils@0.0.4

## 0.0.2

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

- Updated dependencies [00ede55]
  - @ayu-sh-kr/dota-ast-utils@0.0.3
