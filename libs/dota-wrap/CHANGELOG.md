# @ayu-sh-kr/dota-wrap

## 0.0.5

### Patch Changes

- 439baa7: Improved app FCP time
- Updated dependencies [439baa7]
  - @ayu-sh-kr/dota-core@1.8.2
  - @ayu-sh-kr/dota-router@0.0.18

## 0.0.4

### Patch Changes

- Updated dependencies [e044ad8]
  - @ayu-sh-kr/dota-core@1.8.1
  - @ayu-sh-kr/dota-router@0.0.17

## 0.0.3

### Patch Changes

- Updated dependencies [a69c83b]
  - @ayu-sh-kr/dota-core@1.8.0
  - @ayu-sh-kr/dota-router@0.0.16

## 0.0.2

### Patch Changes

- 4d98eb5: Modify the dota-router to let user provide their root component instead of guessing it to be app-root

  ### Patch Changes

  - Modifies dota-router to accept a root component field in its configuration.
  - Updates dota-wrap to ensure compatibility with the new root component configuration in dota-router.

- Updated dependencies [4d98eb5]
  - @ayu-sh-kr/dota-router@0.0.15

## 0.0.1

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
  - @ayu-sh-kr/dota-router@0.0.14
  - @ayu-sh-kr/dota-core@1.7.3
