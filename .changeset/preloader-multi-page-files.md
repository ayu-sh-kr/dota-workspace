---
"@ayu-sh-kr/dota-preloader-plugin": patch
---

A `.page.ts` file that declares several routed pages is scanned once, so its routes are no longer emitted twice. Duplicate entries made SSG fail with `Duplicate SSG route`.
