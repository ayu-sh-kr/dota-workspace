# @ayu-sh-kr/dota-ui

## 0.0.18

### Patch Changes

- 12ebbe3: - Improve Dota UI components with typed, per-instance style configuration across accordion, avatar, badge, button, carousel, slide, scroll deck, icon, modal, placeholder, and scaffold components. Strengthen icon loading, escape badge labels safely, and refresh generated web-types metadata.

  - Refactor `dota-modal` to use the native dialog API with synchronized state and `modalChange` events for Escape, backdrop, close-button, and programmatic dismissals. Improve popover lifecycle handling and accessibility, add reduced-motion-aware modal animation, and make carousel component exports and structure more consistent.

  - Add object-property serialization and reliable attribute synchronization in Dota Core, including support for object defaults and coverage for non-string property reflection.

  - Document Web Types plugin helpers and reorganize/add workspace guidance for component design, reusable web components, code and web-component documentation, feature documentation, blogs, dark mode, application events, scrolling, and Markdown embeds. Add the Dota Web home-page FAQ component.

- Updated dependencies [12ebbe3]
  - @ayu-sh-kr/dota-core@1.9.6
  - @ayu-sh-kr/dota-web-type-json@0.0.6

## 0.0.17

### Patch Changes

- d6a06c8: New Components, Wrap export fix and Web Types json build fix
- Updated dependencies [d6a06c8]
  - @ayu-sh-kr/dota-web-type-json@0.0.5

## 0.0.16

### Patch Changes

- 62f8043: Fix the web-types were named export of components were ignored
- Updated dependencies [62f8043]
  - @ayu-sh-kr/dota-web-type-json@0.0.4

## 0.0.15

### Patch Changes

- 1ad6816: Fix the web-types were named export of components were ignored
- Updated dependencies [1ad6816]
  - @ayu-sh-kr/dota-web-type-json@0.0.3

## 0.0.14

### Patch Changes

- be039dd: Fix the dota-wrap for re moduling and export along with declaratin

## 0.0.13

### Patch Changes

- 57f0c7c: Updated dota-wrap to support internal build for external packages, added a new component orb-background to dota-ui

## 0.0.12

### Patch Changes

- 63a8619: Added new web-type-json to support IDE intellisense by generating web component metadata and further improved the ecosystem with bug fixes, tests and feature improvement
- Updated dependencies [63a8619]
  - @ayu-sh-kr/dota-web-type-json@0.0.2

## 0.0.11

### Patch Changes

- 84ebb1f: Added carousel component

## 0.0.10

### Patch Changes

- Updated dependencies [70aec54]
  - @ayu-sh-kr/dota-event@0.0.5
  - @ayu-sh-kr/dota-core@1.9.5

## 0.0.9

### Patch Changes

- ee06014: added improved popover component using floating-ui dom

## 0.0.8

### Patch Changes

- bfffbf1: Fix the release config

## 0.0.8

### Patch Changes

- 0873984: Integrated the dota-ui to the dota-ecosystem for better support and more components integration
- Updated dependencies [0873984]
  - @ayu-sh-kr/dota-core@1.9.4

## 0.0.7

### Patch Changes

- 60f9fa8: Fix the avatar component

## 0.0.6

### Patch Changes

- 5cc347f: Update codebase and added docs for the components

## 0.0.5

### Patch Changes

- 573e8c6: Code structuring and configuration fixes for commonjs and esm

## 0.0.4

### Patch Changes

- 216acee: Library restructuring and fix style build issue

## 0.0.3

### Patch Changes

- 4eaeef9: New bundle release

## 0.0.2

### Patch Changes

- f9e1f0a: Added changset
