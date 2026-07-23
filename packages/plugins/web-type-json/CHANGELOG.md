# @ayu-sh-kr/dota-web-type-json

## 0.0.8

### Patch Changes

- Updated dependencies [00ede55]
  - @ayu-sh-kr/dota-ast-utils@0.0.3

## 0.0.7

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

- Updated dependencies [cfe30aa]
  - @ayu-sh-kr/dota-ast-utils@0.0.2
  - @ayu-sh-kr/dota-core@1.9.7

## 0.0.6

### Patch Changes

- 12ebbe3: - Improve Dota UI components with typed, per-instance style configuration across accordion, avatar, badge, button, carousel, slide, scroll deck, icon, modal, placeholder, and scaffold components. Strengthen icon loading, escape badge labels safely, and refresh generated web-types metadata.

  - Refactor `dota-modal` to use the native dialog API with synchronized state and `modalChange` events for Escape, backdrop, close-button, and programmatic dismissals. Improve popover lifecycle handling and accessibility, add reduced-motion-aware modal animation, and make carousel component exports and structure more consistent.

  - Add object-property serialization and reliable attribute synchronization in Dota Core, including support for object defaults and coverage for non-string property reflection.

  - Document Web Types plugin helpers and reorganize/add workspace guidance for component design, reusable web components, code and web-component documentation, feature documentation, blogs, dark mode, application events, scrolling, and Markdown embeds. Add the Dota Web home-page FAQ component.

- Updated dependencies [12ebbe3]
  - @ayu-sh-kr/dota-core@1.9.6

## 0.0.5

### Patch Changes

- d6a06c8: New Components, Wrap export fix and Web Types json build fix

## 0.0.4

### Patch Changes

- 62f8043: Fix the web-types were named export of components were ignored

## 0.0.3

### Patch Changes

- 1ad6816: Fix the web-types were named export of components were ignored

## 0.0.2

### Patch Changes

- 63a8619: Added new web-type-json to support IDE intellisense by generating web component metadata and further improved the ecosystem with bug fixes, tests and feature improvement
