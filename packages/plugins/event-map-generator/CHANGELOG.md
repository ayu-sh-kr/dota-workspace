# @ayu-sh-kr/dota-event-map-generator

## 0.1.0

### Minor Changes

- 44079e2: Speed up source scanning in the Dota Vite plugins. Converting SWC byte spans to source offsets no
  longer re-encodes the file from its start on every call, which made scans quadratic in file size.
  The preloader, event-map, and Web Types plugins now also share one parsed-source cache, so each file
  is read and parsed once per build instead of up to four times. On Dota Web the client build dropped
  from about 22s to 7s. Generated artifacts are unchanged.

  - `dota-ast-utils` adds `SourceFileIndex`, a parsed-source cache keyed by path and parser settings
    that reparses a file only when its modification time or size changes, and
    `AstTraversalUtils.findNodesByType()`, which collects several node types in one traversal.
  - `scanEventMapSources()` accepts a `sourceIndex` option and parses files concurrently. A read or
    parse failure still rejects the scan, but other files may already have been read.
  - The preloader reads sources relative to its configured `root`. Running Vite from a directory
    other than the project root no longer fails with `ENOENT`.
  - `dota-web-type-json` and the preloader import `dota-ast-utils` instead of bundling a copy.

### Patch Changes

- Updated dependencies [44079e2]
  - @ayu-sh-kr/dota-ast-utils@0.2.0

## 0.0.6

### Patch Changes

- Updated dependencies [ebd9613]
  - @ayu-sh-kr/dota-ast-utils@0.1.0

## 0.0.5

### Patch Changes

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-ast-utils@0.0.6

## 0.0.4

### Patch Changes

- 7cce9b6: Fixed the event map generator to resolve types of the event correctly
- Updated dependencies [7cce9b6]
  - @ayu-sh-kr/dota-ast-utils@0.0.5

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
