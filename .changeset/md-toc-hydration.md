---
"@ayu-sh-kr/dota-md": patch
---

Prerendered Markdown now hydrates cleanly.

- A prerendered `<md-toc>` adopts its entries on hydration, so active-heading highlighting keeps working without a new `md:render` event. `TocUtils.readEntries()` rebuilds entries from rendered TOC markup.
- `<md-toc>` accepts a `container-class` attribute that replaces its default sticky column, so the host layout decides where the TOC sits.
- `<md-view>` replaces the theme classes serialized into prerendered content when another theme or color is applied, instead of leaving the old color's classes in place.
- In-place theme switching resolves each tag's classes once instead of per element.
