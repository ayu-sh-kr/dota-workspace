---
"@ayu-sh-kr/dota-wrap": minor
"@ayu-sh-kr/dota-preloader-plugin": minor
---

Pages reach first paint sooner, with no application changes.

- `dotaVitePlugins` moves remote stylesheet `@import`s, such as Google Fonts, from the built CSS into preconnected `<link>`s in the HTML head, so they download alongside the CSS bundle instead of after it. Each page gets only the imports of its own start-up CSS; stylesheets loaded only by lazy routes keep theirs. Prerendered pages and the SSR shell inherit them. Pass `remoteStylesheets: false` to keep the imports in CSS.
- With `lazyComponents`, a prerendered first route loads its components after the browser's first paint instead of competing with the requests that gate it. Client-rendered routes still load immediately.
- Client builds keep the application's start-up support modules (data, config, services) in one `app-shared` chunk instead of many small preloaded chunks. Pass `preloader: {sharedChunk: false}` to restore the default splitting.
