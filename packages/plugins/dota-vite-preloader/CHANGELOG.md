# @ayu-sh-kr/dota-preloader-plugin

## 0.0.18

### Patch Changes

- d5cfc3e: A `.page.ts` file that declares several routed pages is scanned once, so its routes are no longer emitted twice. Duplicate entries made SSG fail with `Duplicate SSG route`.
  - @ayu-sh-kr/dota-core@1.9.13
  - @ayu-sh-kr/dota-router@0.1.1

## 0.0.17

### Patch Changes

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

- Updated dependencies [44079e2]
  - @ayu-sh-kr/dota-ast-utils@0.2.0

## 0.0.16

### Patch Changes

- Updated dependencies [ebd9613]
  - @ayu-sh-kr/dota-ast-utils@0.1.0

## 0.0.15

### Patch Changes

- Updated dependencies [13ba8e3]
  - @ayu-sh-kr/dota-router@0.1.0

## 0.0.14

### Patch Changes

- Updated dependencies [c7afdec]
  - @ayu-sh-kr/dota-router@0.0.35
  - @ayu-sh-kr/dota-core@1.9.12

## 0.0.13

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.11
- @ayu-sh-kr/dota-router@0.0.34

## 0.0.12

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.10
- @ayu-sh-kr/dota-router@0.0.33

## 0.0.11

### Patch Changes

- Updated dependencies [a0fc7fe]
  - @ayu-sh-kr/dota-router@0.0.32
  - @ayu-sh-kr/dota-core@1.9.9

## 0.0.10

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-router@0.0.31
  - @ayu-sh-kr/dota-core@1.9.8
  - @ayu-sh-kr/dota-ast-utils@0.0.6

## 0.0.9

### Patch Changes

- Updated dependencies [a40fbbe]
  - @ayu-sh-kr/dota-router@0.0.30

## 0.0.8

### Patch Changes

- Updated dependencies [7cce9b6]
  - @ayu-sh-kr/dota-ast-utils@0.0.5

## 0.0.7

### Patch Changes

- Updated dependencies [f6c3a19]
  - @ayu-sh-kr/dota-ast-utils@0.0.4

## 0.0.6

### Patch Changes

- Updated dependencies [00ede55]
  - @ayu-sh-kr/dota-ast-utils@0.0.3

## 0.0.5

### Patch Changes

- Updated dependencies [cd53e12]
  - @ayu-sh-kr/dota-router@0.0.29

## 0.0.4

### Patch Changes

- Updated dependencies [cfe30aa]
  - @ayu-sh-kr/dota-ast-utils@0.0.2
  - @ayu-sh-kr/dota-core@1.9.7
  - @ayu-sh-kr/dota-router@0.0.28

## 0.0.3

### Patch Changes

- Updated dependencies [12ebbe3]
  - @ayu-sh-kr/dota-core@1.9.6
  - @ayu-sh-kr/dota-router@0.0.27

## 0.0.2

### Patch Changes

- 85a2de8: Added logging framework for better insight

## 0.0.1

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project
