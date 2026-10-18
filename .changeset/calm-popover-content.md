---
"@ayu-sh-kr/dota-ui": patch
---

`dota-popover` now reads its trigger and panel markup when it connects instead of in its constructor, so static generation keeps its content and pages using it hydrate without a mismatch.
