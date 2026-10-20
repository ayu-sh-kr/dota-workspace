---
"@ayu-sh-kr/dota-ssr": minor
"@ayu-sh-kr/dota-wrap": minor
---

A parameterized route can declare `@Route({path: '/docs/:slug', mode: 'ssg'})`. Static generation prerenders it through the concrete paths in the SSG `routes` option that match it, and the build fails with `Dynamic SSG route needs concrete paths in the SSG routes option` when none do. Previously any parameterized `ssg` route failed the build, so such routes had to omit `mode`.
