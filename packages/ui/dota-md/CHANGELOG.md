# @ayu-sh-kr/dota-md

## 0.0.14

### Patch Changes

- Updated dependencies [22c3f24]
  - @ayu-sh-kr/dota-rendering@0.1.3
  - @ayu-sh-kr/dota-core@1.9.10
  - @ayu-sh-kr/dota-web-type-json@0.0.13

## 0.0.13

### Patch Changes

- Updated dependencies [a0fc7fe]
  - @ayu-sh-kr/dota-core@1.9.9
  - @ayu-sh-kr/dota-rendering@0.1.2
  - @ayu-sh-kr/dota-web-type-json@0.0.12

## 0.0.12

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-rendering@0.1.1
  - @ayu-sh-kr/dota-core@1.9.8
  - @ayu-sh-kr/dota-web-type-json@0.0.11

## 0.0.11

### Patch Changes

- 7cce9b6: Fixed the event map generator to resolve types of the event correctly
  - @ayu-sh-kr/dota-web-type-json@0.0.10

## 0.0.10

### Patch Changes

- f6c3a19: Generate typed application event maps and resolve callable payload return types.

  - Event payloads can be recovered from explicitly annotated function, arrow-function, and function-expression returns, including identifier-mediated calls.
  - `dota-md` and `dota-ui` now generate package-local event-map declarations during their Vite builds.
  - Unsupported inferred or dynamic calls remain safely unresolved instead of inventing payload types.
  - @ayu-sh-kr/dota-web-type-json@0.0.9

## 0.0.9

### Patch Changes

- @ayu-sh-kr/dota-web-type-json@0.0.8

## 0.0.8

### Patch Changes

- Updated dependencies [cfe30aa]
  - @ayu-sh-kr/dota-web-type-json@0.0.7
  - @ayu-sh-kr/dota-core@1.9.7

## 0.0.7

### Patch Changes

- Updated dependencies [12ebbe3]
  - @ayu-sh-kr/dota-core@1.9.6
  - @ayu-sh-kr/dota-web-type-json@0.0.6

## 0.0.6

### Patch Changes

- Updated dependencies [d6a06c8]
  - @ayu-sh-kr/dota-web-type-json@0.0.5

## 0.0.5

### Patch Changes

- 62f8043: Fix the web-types were named export of components were ignored
- Updated dependencies [62f8043]
  - @ayu-sh-kr/dota-web-type-json@0.0.4

## 0.0.4

### Patch Changes

- 1ad6816: Fix the web-types were named export of components were ignored
- Updated dependencies [1ad6816]
  - @ayu-sh-kr/dota-web-type-json@0.0.3

## 0.0.3

### Patch Changes

- 63a8619: Added new web-type-json to support IDE intellisense by generating web component metadata and further improved the ecosystem with bug fixes, tests and feature improvement
- Updated dependencies [63a8619]
  - @ayu-sh-kr/dota-web-type-json@0.0.2

## 0.0.2

### Patch Changes

- Updated dependencies [70aec54]
  - @ayu-sh-kr/dota-event@0.0.5
  - @ayu-sh-kr/dota-core@1.9.5

## 0.0.1

### Patch Changes

- a380210: Added new project to support rendering and theming of markdown related contents
