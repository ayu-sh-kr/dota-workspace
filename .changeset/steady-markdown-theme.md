---
"@ayu-sh-kr/dota-md": patch
---

`applyMarkdownThemeToElement` only adds or removes the classes that differ, so hydrating a prerendered `md-view` no longer rewrites every element's `class` and restyles the article.
