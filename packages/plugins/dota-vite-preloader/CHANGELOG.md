# @ayu-sh-kr/dota-preloader-plugin

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
