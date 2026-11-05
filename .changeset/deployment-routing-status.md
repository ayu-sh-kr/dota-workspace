---
"@ayu-sh-kr/dota-ssr": minor
"@ayu-sh-kr/dota-wrap": minor
---

Server-rendered pages can return a real status, SSG and SSR output share each deployment target correctly, and SSG route rules can be turned off.

- `RenderContext.setStatus(status)` sets the response status from `serverLoad`, for example `context.setStatus(404)` on a not-found page. It applies on every deployment target, in `vite dev`, and on the Node server. Statuses outside 200–599 throw.
- A page prerendered by `dotaSsg()` stays static when an `ssr` route also matches it. Netlify functions list it in `config.excludedPath`, and Cloudflare Pages `_routes.json` lists it in `exclude`. Node and Vercel already served files first.
- Cloudflare Pages `_routes.json` collapses overlapping wildcards, so nested routes such as `/tasks/:id` and `/tasks/:id/edit` deploy as `/tasks/*`. A build needing more than Cloudflare's 100 rules now fails with the counts instead of producing a deployment Cloudflare rejects.
- `deployment: {target, redirects: false}` stops SSG writing route rules on any target (the `_redirects` block, `vercel.json` redirects and `cleanUrls`, GitHub Pages aliases). In Dota Wrap, use `deployment: {target, redirects: false}` in `dotaVitePlugins()`.
- `dotaSsr()` without `deployment` now uses the target `dotaSsg()` prepared in the same build before falling back to `node`, as documented. The new `vercelConfigFile` option, which defaults to SSG's file, keeps SSR rewrites in the same `vercel.json` as SSG redirects. Dota Wrap passes its `vercelConfigFile` to both.
