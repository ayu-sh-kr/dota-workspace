# Deployment

Dota packages a build for one hosting platform at a time. Name the platform once, and the static pages (SSG) and the request server (SSR) are both prepared for it. The build writes the configuration files each platform needs; it does not upload or publish anything.

## Pick a platform

```ts
// vite.config.ts
import {dotaVitePlugins} from '@ayu-sh-kr/dota-wrap/vite';

export default {
  plugins: dotaVitePlugins({
    deployment: 'netlify',
    ssg: {autoDetectRoutes: true}
  })
};
```

| `deployment` | Static pages | `ssr` routes |
| --- | --- | --- |
| `node` | served by the generated server; no hosting files | `dist-server/server.mjs`, started with `node dist-server/server.mjs` |
| `vercel` | redirects added to the existing `vercel.json` | a Vercel function in `api/` |
| `netlify` | `_redirects` rules for custom outputs only | a Netlify function in `.netlify/v1/functions/` |
| `cloudflare-pages` | `_redirects` rules for custom outputs only | `_worker.js/` and `_routes.json` |
| `github-pages` | `.nojekyll` and route aliases | none: GitHub Pages is static, so `ssr` routes render in the browser |

Without a target, SSR builds the Node server and SSG writes no hosting files. Static pages are only produced by builds run with `--ssg`.

Some settings only apply to one platform, so `deployment` also takes an object:

```ts
dotaVitePlugins({
  deployment: {
    target: 'vercel',
    vercelConfigFile: '../vercel.json', // vercel: which vercel.json to update
    serverOutDir: 'dist-server',        // node: where the server is written
    trailingSlash: true                 // every platform; the default
  },
  ssg: {autoDetectRoutes: true}
});
```

## Keep one URL per page

A route is declared without a trailing slash, and `'/about/'` and `'/about'` name the same route. The public URL is decided by `trailingSlash`, which chooses the file each page is written to:

| `trailingSlash` | `/about` is written to | Canonical URL | The other form |
| --- | --- | --- | --- |
| `true` (default) | `about/index.html` | `/about/` | `/about` redirects to `/about/` |
| `false` | `about.html` | `/about` | `/about/` redirects to `/about` |

Each platform keeps that single URL in its own way:

| Platform | `trailingSlash: true` | `trailingSlash: false` |
| --- | --- | --- |
| Vercel | a permanent redirect per page in `vercel.json` | `cleanUrls: true` in `vercel.json` |
| Netlify, Cloudflare Pages, GitHub Pages | the host's own directory redirect | the host's own clean URLs |
| Node server | 308 from `/about` to `/about/` | 308 from `/about/` to `/about` |

Search engines and analytics record the canonical URL. Changing `trailingSlash` on a live site changes every page's URL: old links keep working through the redirect, but the whole site has to be indexed again. Choose it before launch and leave it alone.

## Moving to another platform

With the same `trailingSlash`, every platform writes the same files and serves them at the same URLs, so pages that are already indexed keep their addresses. Rules you wrote yourself do not move with the build. Port these to the new platform by hand:

- domain redirects, such as the bare domain to `www`;
- moved or renamed pages, such as an article that changed sections;
- the SPA fallback that sends unknown paths to `index.html`;
- cache headers.

On Netlify and Cloudflare Pages, keep those rules in `public/_redirects`, outside the block the build manages between `# BEGIN dota-ssg` and `# END dota-ssg`. GitHub Pages cannot redirect on the server, so moved pages there need another approach.

## Configure with environment variables

Every deployment setting can also come from an environment variable. A variable that is set wins over the plugin configuration, including the nested `ssg.deployment`, `ssg.trailingSlash`, and `ssr.deployment`. When it is unset or empty, the configuration applies. CI can then build one project for several platforms without editing `vite.config.ts`.

| Variable | Overrides | Values |
| --- | --- | --- |
| `DOTA_DEPLOYMENT` | `deployment` / `target` | `node`, `vercel`, `netlify`, `cloudflare-pages`, `github-pages` |
| `DOTA_TRAILING_SLASH` | `trailingSlash` | `true` or `false` |
| `DOTA_VERCEL_CONFIG_FILE` | `vercelConfigFile` | path relative to the project root |
| `DOTA_SERVER_OUT_DIR` | `serverOutDir` | path relative to the project root |

```sh
# The config says vercel; this build produces a Node server instead.
DOTA_DEPLOYMENT=node pnpm run build:ssg
```

An unsupported value, such as `DOTA_DEPLOYMENT=heroku` or `DOTA_TRAILING_SLASH=yes`, stops the build with an error rather than falling back silently.

Dota Web uses this itself. Its config names `vercel`, and the `build:node` script sets `DOTA_DEPLOYMENT=node` to build the local server described in [Server Rendering](/docs/server-rendering).
