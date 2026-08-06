# @ayu-sh-kr/dota-router

## 0.0.31

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-core@1.9.8

## 0.0.30

### Patch Changes

- a40fbbe: Add optional router-instance global navigation hooks. Applications can register
  ordered `beforeEach` guards and `afterEach` observers through
  `DotaRouterService.fromComponents()` or `dota-wrap`'s `initializeApp()`; existing
  configuration behaves unchanged when the option is omitted.

## 0.0.29

### Patch Changes

- cd53e12: Introduce a coordinator-driven routing pipeline while preserving the existing router service entry point.

  - Configure flat route declarations into nested segment trees with static, slug, root, and fallback matching.
  - Route History API and Navigation API adapters through dedicated coordinators that run guards, rendering, and lifecycle hooks in transition order.
  - Add a shared DOM renderer, typed route matches and navigation results, redirect and cancellation handling, and abort-aware precommit behavior.
  - Retain legacy `RouterUtils` APIs for compatibility while marking coordinator-replaced helpers as deprecated.

## 0.0.28

### Patch Changes

- Updated dependencies [cfe30aa]
  - @ayu-sh-kr/dota-core@1.9.7

## 0.0.27

### Patch Changes

- Updated dependencies [12ebbe3]
  - @ayu-sh-kr/dota-core@1.9.6

## 0.0.26

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.5

## 0.0.25

### Patch Changes

- Updated dependencies [0873984]
  - @ayu-sh-kr/dota-core@1.9.4

## 0.0.24

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.3

## 0.0.23

### Patch Changes

- 35c9b8a: added support for event channel which creates and manages namespaced events on global bus, add rich test for dota-core
- Updated dependencies [35c9b8a]
  - @ayu-sh-kr/dota-core@1.9.2

## 0.0.22

### Patch Changes

- Updated dependencies [9b95d48]
  - @ayu-sh-kr/dota-core@1.9.1

## 0.0.21

### Patch Changes

- Updated dependencies [4272d8d]
  - @ayu-sh-kr/dota-core@1.9.0

## 0.0.20

### Patch Changes

- Updated dependencies [0d00dc3]
  - @ayu-sh-kr/dota-core@1.8.4

## 0.0.19

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project
- Updated dependencies [be58089]
  - @ayu-sh-kr/dota-core@1.8.3

## 0.0.18

### Patch Changes

- Updated dependencies [439baa7]
  - @ayu-sh-kr/dota-core@1.8.2

## 0.0.17

### Patch Changes

- Updated dependencies [e044ad8]
  - @ayu-sh-kr/dota-core@1.8.1

## 0.0.16

### Patch Changes

- Updated dependencies [a69c83b]
  - @ayu-sh-kr/dota-core@1.8.0

## 0.0.15

### Patch Changes

- 4d98eb5: Modify the dota-router to let user provide their root component instead of guessing it to be app-root

  ### Patch Changes

  - Modifies dota-router to accept a root component field in its configuration.
  - Updates dota-wrap to ensure compatibility with the new root component configuration in dota-router.

## 0.0.14

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

- Updated dependencies [2e89848]
  - @ayu-sh-kr/dota-core@1.7.3
