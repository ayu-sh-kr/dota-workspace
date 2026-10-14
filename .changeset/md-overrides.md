---
"@ayu-sh-kr/dota-md": minor
---

`dota-md` can now be customised without subclassing `<md-view>` or replacing the renderer by hand.

- `MDService.configure({ options, highlight, plugins })` and `createMarkdown(setup)` change markdown-it options, replace highlight.js with any highlighter (or disable it with `highlight: false`), and add plugins. `MDService.setMd()` now accepts any markdown-it instance.
- TOC entries are read from the rendered heading ids, so TOC links always resolve, including headings with punctuation. The `markdown-it-toc-done-right` dependency is removed.
- `registerTheme`, `resolveTheme`, and `extendTheme` register custom themes and derive them from a built-in theme by overriding single tags and color tokens. Theme color maps accept app-specific keys such as `primary` (`ColorKey`).
- `<md-view>` gains a `content-class` attribute for its wrapper, `renderMarkdown(markdown)` to render into one view without broadcasting `md:render`, and a bubbling `md-rendered` DOM event (`MD_RENDERED_EVENT`) carrying the mounted container and render result for post-processing. It adopts prerendered content instead of nesting it, mounts Markdown received before initialisation, and lazy-loads images.
- `applyMarkdownTheme` extends existing `class` attributes instead of duplicating them and no longer writes empty `class=""` attributes.

Existing subclasses of `MdViewComponent` keep working; composition through the new attribute, method, and event is the recommended replacement. An unknown `theme` now falls back to `flat` rather than `material`.
