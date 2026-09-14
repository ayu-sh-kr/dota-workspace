---
"@ayu-sh-kr/dota-ast-utils": minor
"@ayu-sh-kr/dota-wrap": minor
"@ayu-sh-kr/dota-ssr": minor
"@ayu-sh-kr/dota-ui": minor
---

Improve static-site generation with concurrent rendering, configurable deployment output, and clearer build diagnostics.

- `@ayu-sh-kr/dota-ssr` now supports explicit `deployment` targets for Vercel, Netlify, Cloudflare Pages, and GitHub Pages. Netlify and Cloudflare Pages receive managed `_redirects` rules, GitHub Pages receives route-shaped HTML aliases plus `.nojekyll`, and Vercel continues updating `vercel.json`.
- Existing `vercel: true`, `vercel: false`, and `vercel: {configFile}` settings remain compatible. An explicit `deployment` setting takes precedence, including `deployment: false`.
- Generated redirect blocks preserve authored rules, remove stale generated routes, respect Vite `base`, and avoid rewriting unchanged files.
- SSG generation prepares deployment files after route output is written and still prepares platform metadata when no routes are selected.
- `dota-web` uses a direct `deployment` setting in `vite.config.ts`; change the value to select the hosting target.
- `@ayu-sh-kr/dota-ast-utils` now compiles its JSON import attributes with an `ESNext` module target.
- Added coverage for deployment precedence, redirect preservation and replacement, base paths, GitHub Pages conflicts, legacy Vercel behavior, and empty-route builds.
