---
"@ayu-sh-kr/dota-ssr": minor
"@ayu-sh-kr/dota-wrap": minor
---

Server-rendered pages can return a real status, SSG and SSR output share each deployment target correctly, and SSG route rules can be turned off.

- `RenderContext.setStatus(status)` sets the response status from `serverLoad`, for example `context.setStatus(404)` on a not-found page. It applies on every deployment target, in `vite dev`, and on the Node server. Statuses outside 200–599 throw.
- A page prerendered by `dotaSsg()` stays static when an `ssr` route also matches it. Netlify functions list it in `config.excludedPath`, and Cloudflare Pages `_routes.json` lists it in `exclude`. Node and Vercel already served files first.
- Cloudflare Pages `_routes.json` collapses overlapping wildcards, so nested routes such as `/tasks/:id` and `/tasks/:id/edit` deploy as `/tasks/*`. Duplicate patterns are dropped too, and a build needing more than Cloudflare's 100 rules logs a warning with the include and exclude counts.
- `deployment: {target, redirects: false}` stops SSG writing route rules on any target (the `_redirects` block, `vercel.json` redirects and `cleanUrls`, GitHub Pages aliases). In Dota Wrap, use `deployment: {target, redirects: false}` in `dotaVitePlugins()`.
- Unknown paths answer 404: the Node server and the Cloudflare Pages worker send the SPA shell with status 404 for paths no declared route matches, including parents generated for nested routes such as `/products`. `ApplicationHandler.isKnownPath` and the `isKnownPath` option of `createNodeServer` expose the check; custom Node servers keep the old behaviour until they pass it.
- `ssr` pages keep one URL form: with `trailingSlash` set the other form redirects (308). `dotaSsr()` follows the `trailingSlash` of `dotaSsg()` in the same build, so SSR-only builds are unchanged unless the option is set. Cloudflare Pages and Netlify route both forms to the server so it can redirect; on Vercel, whose function sees the route path rather than the request's, the policy is not applied.
- Opt-in caching: `dotaSsr({cacheControl})` sends `Cache-Control` with 200 `ssr` pages, and the Cloudflare Pages worker then serves repeat requests from the Cache API without rendering. Without the option nothing is cached, as before.
- Server routes, `_routes.json`, and prerender exclusions understand Dota Router's `[slug]` and `[...rest]` segments as well as `:param`.
- The new `vercelConfigFile` SSR option, which defaults to the file SSG updated in the same build, keeps SSR rewrites in the same `vercel.json` as SSG redirects. Dota Wrap passes its `vercelConfigFile` to both.
