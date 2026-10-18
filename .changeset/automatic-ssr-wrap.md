---
"@ayu-sh-kr/dota-wrap": minor
---

`dotaVitePlugins()` now includes request-time rendering for `@Route({mode: 'ssr'})` routes. It does nothing for applications without such routes, and `ssr: false` removes it. A top-level `deployment` option sets the hosting platform for both SSG and SSR output; SSR otherwise follows the SSG deployment target, then defaults to `node`.

When Dota SSR loads the application entry on a server, `initializeApp()` reports its components and routes instead of starting, and its returned promise never settles there, so startup code chained on it only runs in the browser.
