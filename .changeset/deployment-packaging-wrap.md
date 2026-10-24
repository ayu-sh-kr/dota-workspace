---
"@ayu-sh-kr/dota-wrap": minor
---

Add `dotaPackage()` to `@ayu-sh-kr/dota-wrap/vite`, which packages SSG and SSR output for one hosting platform (`node`, `vercel`, `netlify`, `cloudflare-pages`, or `github-pages`) so the target is named once.

- `dotaVitePlugins({deployment})` now accepts the object form `{target, vercelConfigFile?, serverOutDir?}` as well as a target name.
- `deployment: 'node'` no longer needs a separate `ssg.deployment: false`; static builds for a Node server write no hosting files.
- Explicit `ssg.deployment` and `ssr.deployment` still take precedence.
