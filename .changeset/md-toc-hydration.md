---
"@ayu-sh-kr/dota-md": patch
---

A prerendered `<md-toc>` now adopts its entries on hydration, so active-heading highlighting keeps working without a new `md:render` event. `TocUtils.readEntries()` rebuilds entries from rendered TOC markup. In-place theme switching resolves each tag's classes once instead of per element.
