---
"@ayu-sh-kr/dota-ssr": patch
---

Static generation reads `@Component` configuration through dota-core's metadata layer, the same place the decorator writes it. Components declared with `@Component` behave as before.
