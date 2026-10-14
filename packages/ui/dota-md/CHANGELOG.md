# @ayu-sh-kr/dota-md

## 0.1.0

### Minor Changes

- d5cfc3e: `dota-md` can now be customised without subclassing `<md-view>` or replacing the renderer by hand.

  - `MDService.configure({ options, highlight, plugins })` and `createMarkdown(setup)` change markdown-it options, replace highlight.js with any highlighter (or disable it with `highlight: false`), and add plugins. `MDService.setMd()` now accepts any markdown-it instance.
  - TOC entries are read from the rendered heading ids, so TOC links always resolve, including headings with punctuation. The `markdown-it-toc-done-right` dependency is removed.
  - `registerTheme`, `resolveTheme`, and `extendTheme` register custom themes and derive them from a built-in theme by overriding single tags and color tokens. Theme color maps accept app-specific keys such as `primary` (`ColorKey`).
  - `<md-view>` gains a `content-class` attribute for its wrapper, `renderMarkdown(markdown)` to render into one view without broadcasting `md:render`, and a bubbling `md-rendered` DOM event (`MD_RENDERED_EVENT`) carrying the mounted container and render result for post-processing. It adopts prerendered content instead of nesting it, mounts Markdown received before initialisation, and lazy-loads images.
  - `applyMarkdownTheme` extends existing `class` attributes instead of duplicating them and no longer writes empty `class=""` attributes.

  Existing subclasses of `MdViewComponent` keep working; composition through the new attribute, method, and event is the recommended replacement. An unknown `theme` now falls back to `flat` rather than `material`.

### Patch Changes

- d5cfc3e: Prerendered Markdown now hydrates cleanly.

  - A prerendered `<md-toc>` adopts its entries on hydration, so active-heading highlighting keeps working without a new `md:render` event. `TocUtils.readEntries()` rebuilds entries from rendered TOC markup.
  - `<md-toc>` accepts a `container-class` attribute that replaces its default sticky column, so the host layout decides where the TOC sits.
  - `<md-view>` replaces the theme classes serialized into prerendered content when another theme or color is applied, instead of leaving the old color's classes in place.
  - In-place theme switching resolves each tag's classes once instead of per element.

- Updated dependencies [d5cfc3e]
  - @ayu-sh-kr/dota-rendering@0.1.6
  - @ayu-sh-kr/dota-core@1.9.13
  - @ayu-sh-kr/dota-web-type-json@0.0.18

## 0.0.18

### Patch Changes

- Updated dependencies [44079e2]
  - @ayu-sh-kr/dota-web-type-json@0.0.17

## 0.0.17

### Patch Changes

- @ayu-sh-kr/dota-web-type-json@0.0.16

## 0.0.16

### Patch Changes

- Updated dependencies [c7afdec]
  - @ayu-sh-kr/dota-rendering@0.1.5
  - @ayu-sh-kr/dota-core@1.9.12
  - @ayu-sh-kr/dota-web-type-json@0.0.15

## 0.0.15

### Patch Changes

- Updated dependencies [fba2a36]
  - @ayu-sh-kr/dota-rendering@0.1.4
  - @ayu-sh-kr/dota-core@1.9.11
  - @ayu-sh-kr/dota-web-type-json@0.0.14

## 0.0.14

### Patch Changes

- Updated dependencies [22c3f24]
  - @ayu-sh-kr/dota-rendering@0.1.3
  - @ayu-sh-kr/dota-core@1.9.10
  - @ayu-sh-kr/dota-web-type-json@0.0.13

## 0.0.13

### Patch Changes

- Updated dependencies [a0fc7fe]
  - @ayu-sh-kr/dota-core@1.9.9
  - @ayu-sh-kr/dota-rendering@0.1.2
  - @ayu-sh-kr/dota-web-type-json@0.0.12

## 0.0.12

### Patch Changes

- 9bcf04a: Introduce opt-in static site generation and hydration for Dota applications, backed by a new rendering package with structured templates and targeted DOM updates.

  - `@ayu-sh-kr/dota-rendering` now provides template rendering, DOM diffing and patching, template identity markers, hydration support, and configurable rendering diagnostics.
  - `@ayu-sh-kr/dota-ssr` adds the `dotaSsg` Vite plugin for prerendering configured or decorated routes, plus the `dotaHydration` runtime plugin for safely adopting matching server-rendered markup. Hydration mismatches warn and remount the affected host by default, with a strict throw mode available for development.
  - Dota Core, Router, Wrap, and the Vite preloader now expose the compatible mount-strategy, runtime-plugin, route metadata, and initial-navigation hooks required for this opt-in SSR/SSG workflow. Existing client-only rendering remains the default.

- Updated dependencies [9bcf04a]
  - @ayu-sh-kr/dota-rendering@0.1.1
  - @ayu-sh-kr/dota-core@1.9.8
  - @ayu-sh-kr/dota-web-type-json@0.0.11

## 0.0.11

### Patch Changes

- 7cce9b6: Fixed the event map generator to resolve types of the event correctly
  - @ayu-sh-kr/dota-web-type-json@0.0.10

## 0.0.10

### Patch Changes

- f6c3a19: Generate typed application event maps and resolve callable payload return types.

  - Event payloads can be recovered from explicitly annotated function, arrow-function, and function-expression returns, including identifier-mediated calls.
  - `dota-md` and `dota-ui` now generate package-local event-map declarations during their Vite builds.
  - Unsupported inferred or dynamic calls remain safely unresolved instead of inventing payload types.
  - @ayu-sh-kr/dota-web-type-json@0.0.9

## 0.0.9

### Patch Changes

- @ayu-sh-kr/dota-web-type-json@0.0.8

## 0.0.8

### Patch Changes

- Updated dependencies [cfe30aa]
  - @ayu-sh-kr/dota-web-type-json@0.0.7
  - @ayu-sh-kr/dota-core@1.9.7

## 0.0.7

### Patch Changes

- Updated dependencies [12ebbe3]
  - @ayu-sh-kr/dota-core@1.9.6
  - @ayu-sh-kr/dota-web-type-json@0.0.6

## 0.0.6

### Patch Changes

- Updated dependencies [d6a06c8]
  - @ayu-sh-kr/dota-web-type-json@0.0.5

## 0.0.5

### Patch Changes

- 62f8043: Fix the web-types were named export of components were ignored
- Updated dependencies [62f8043]
  - @ayu-sh-kr/dota-web-type-json@0.0.4

## 0.0.4

### Patch Changes

- 1ad6816: Fix the web-types were named export of components were ignored
- Updated dependencies [1ad6816]
  - @ayu-sh-kr/dota-web-type-json@0.0.3

## 0.0.3

### Patch Changes

- 63a8619: Added new web-type-json to support IDE intellisense by generating web component metadata and further improved the ecosystem with bug fixes, tests and feature improvement
- Updated dependencies [63a8619]
  - @ayu-sh-kr/dota-web-type-json@0.0.2

## 0.0.2

### Patch Changes

- Updated dependencies [70aec54]
  - @ayu-sh-kr/dota-event@0.0.5
  - @ayu-sh-kr/dota-core@1.9.5

## 0.0.1

### Patch Changes

- a380210: Added new project to support rendering and theming of markdown related contents
