# @ayu-sh-kr/dota-wrap

## 0.0.11

### Patch Changes

- @ayu-sh-kr/dota-core@1.9.3
- @ayu-sh-kr/dota-router@0.0.24

## 0.0.10

### Patch Changes

- Updated dependencies [35c9b8a]
  - @ayu-sh-kr/dota-router@0.0.23
  - @ayu-sh-kr/dota-core@1.9.2

## 0.0.9

### Patch Changes

- Updated dependencies [9b95d48]
  - @ayu-sh-kr/dota-core@1.9.1
  - @ayu-sh-kr/dota-router@0.0.22

## 0.0.8

### Patch Changes

- Updated dependencies [4272d8d]
  - @ayu-sh-kr/dota-core@1.9.0
  - @ayu-sh-kr/dota-router@0.0.21

## 0.0.7

### Patch Changes

- Updated dependencies [0d00dc3]
  - @ayu-sh-kr/dota-core@1.8.4
  - @ayu-sh-kr/dota-router@0.0.20

## 0.0.6

### Patch Changes

- be58089: Added Plugin dota-vite-preloader to load components before hand, and restructure the project
- Updated dependencies [be58089]
  - @ayu-sh-kr/dota-router@0.0.19
  - @ayu-sh-kr/dota-core@1.8.3

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
