# @ayu-sh-kr/dota-web-type-json

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
