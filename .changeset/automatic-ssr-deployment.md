---
"@ayu-sh-kr/dota-ssr": minor
---

Routes declared `@Route({mode: 'ssr'})` are now rendered on the server automatically, in development and in production, with no server code to write.

- `dotaSsr()` (from `@ayu-sh-kr/dota-ssr/vite`) renders `ssr` routes in `vite dev` and, on `vite build`, builds a self-contained server bundle and writes the deployment target's files: `node` (default, `node dist-server/server.mjs`), `vercel` (a function plus rewrites in `vercel.json`), `netlify` (a Functions API function), or `cloudflare-pages` (`_worker.js` and `_routes.json`). `github-pages` stays static and warns. Builds without `ssr` routes skip the server build.
- Components and routes come from the application entry: `captureApplication()` loads it and receives what `initializeApp()` declares, so nothing is listed twice. `createApplicationHandler()` turns that into a web-standard request handler that renders `ssr` routes into the built `index.html`, inside the root element, with page or route `seo` in the head.
- `createNodeServer()` from the new `@ayu-sh-kr/dota-ssr/node` entry serves built files (including prerendered pages), `ssr` routes, and the SPA fallback for client-rendered routes.
- Request handlers accept a per-request document shell, and `PageRoute.seo` supplies head metadata for pages without their own. When a page provides SEO, the shell's own title, description, social, icon, and canonical tags are replaced rather than duplicated.
- The server bundle is self-contained even when the application lists packages in `ssr.external`, and the shell is taken from the client build before SSG prerenders over `index.html`.
- `createNodeServer` answers a render error with 500 and logs it instead of serving the SPA shell, and components whose `render()` returns nothing render empty on the server as in the browser.
