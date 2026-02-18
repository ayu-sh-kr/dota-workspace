# @ayu-sh-kr/dota-core

## 1.9.0

### Minor Changes

- 4272d8d: Added new module/lib dota-event to handle in-app events

### Patch Changes

- Updated dependencies [4272d8d]
  - @ayu-sh-kr/dota-event@0.0.1

## 1.8.4

### Patch Changes

- 0d00dc3: Added a new DotaPageElement to help with page seo

## 1.8.3

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project

## 1.8.2

### Patch Changes

- 439baa7: Improved app FCP time

## 1.8.1

### Patch Changes

- e044ad8: Fix the event binding to be more mature and able to handle events across dom changes

## 1.8.0

### Minor Changes

- a69c83b: Updated the core rendering logic of the component itself, inorder to improve UI updates

## 1.7.3

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
