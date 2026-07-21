# @ayu-sh-kr/dota-core

## 1.9.6

### Patch Changes

- 12ebbe3: - Improve Dota UI components with typed, per-instance style configuration across accordion, avatar, badge, button, carousel, slide, scroll deck, icon, modal, placeholder, and scaffold components. Strengthen icon loading, escape badge labels safely, and refresh generated web-types metadata.

  - Refactor `dota-modal` to use the native dialog API with synchronized state and `modalChange` events for Escape, backdrop, close-button, and programmatic dismissals. Improve popover lifecycle handling and accessibility, add reduced-motion-aware modal animation, and make carousel component exports and structure more consistent.

  - Add object-property serialization and reliable attribute synchronization in Dota Core, including support for object defaults and coverage for non-string property reflection.

  - Document Web Types plugin helpers and reorganize/add workspace guidance for component design, reusable web components, code and web-component documentation, feature documentation, blogs, dark mode, application events, scrolling, and Markdown embeds. Add the Dota Web home-page FAQ component.

## 1.9.5

### Patch Changes

- Updated dependencies [70aec54]
  - @ayu-sh-kr/dota-event@0.0.5

## 1.9.4

### Patch Changes

- 0873984: Integrated the dota-ui to the dota-ecosystem for better support and more components integration

## 1.9.3

### Patch Changes

- Updated dependencies [5ee8e6c]
  - @ayu-sh-kr/dota-event@0.0.4

## 1.9.2

### Patch Changes

- 35c9b8a: added support for event channel which creates and manages namespaced events on global bus, add rich test for dota-core
- Updated dependencies [35c9b8a]
  - @ayu-sh-kr/dota-event@0.0.3

## 1.9.1

### Patch Changes

- 9b95d48: Added new binding manager for application which prevents binding of same method to same listener multiple time when a class is redered or called bind multiple times
- Updated dependencies [9b95d48]
  - @ayu-sh-kr/dota-event@0.0.2

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
