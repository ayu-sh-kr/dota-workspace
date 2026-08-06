# @ayu-sh-kr/dota-core

## 1.9.8

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-rendering@0.1.1

## 1.9.7

### Patch Changes

- cfe30aa: Document the patch release for source documentation support in generated Web Types and Custom Elements Manifest metadata.

  The implementation described in `documentation/packages/plugins/web-type-json/planning/tsdoc-description-extraction.md` will:

  - Use existing component TSDoc as the fallback description for Web Types elements.
  - Use adjacent property TSDoc and structured class-level `@property` tags for property descriptions.
  - Preserve decorator-provided descriptions as the authoritative value.
  - Keep HTML attributes, JavaScript properties, and CEM members synchronized through the shared scan metadata.
  - Reuse the existing single source read and AST parse, with UTF-8-safe declaration anchors from `dota-ast-utils`.
  - Preserve Markdown documentation, deterministic generation, and current output behavior when documentation is absent.
  - Add coverage for multiline decorators, Unicode source text, malformed comments, description precedence, repeated generation, and Web Types/CEM propagation.
  - Treat a present HTML boolean attribute with an empty string value as `true`, while preserving explicit `true` and `false` values and rejecting invalid boolean text.

  These are patch-level DX improvements: they enrich IDE documentation and make boolean HTML attribute presence behave correctly without changing component APIs or decorator contracts.

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
