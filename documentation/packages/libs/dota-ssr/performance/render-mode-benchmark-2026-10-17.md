# Render-mode benchmark: SSG, SSR, and CSR on three applications — 17–18 October 2026

Three Dota applications were built four ways each: their committed **mixed** distribution of
`@Route` modes, and then every page as **ssg**, **ssr**, and **csr**. Build time, server
latency and throughput, and page loads in headless Chrome were measured for five representative
pages per application. These are the first measurements of the automatic SSR pipeline
(`dotaSsr()`, [light-DOM string rendering](../architecture/light-dom-string-rendering.md)).
The harness is [`tool-scripts/render-mode-benchmark`](../../../../../tool-scripts/render-mode-benchmark/README.md).

**Result.** When a page arrives already rendered, its content shows up 15–25 times sooner
than with client rendering. SSG and SSR reach that equally: the first heading appears at
about 65 ms with either, against 1.0–1.7 s with CSR. SSG costs build time (up to 4.4 s for
100 pages) and serves 4,000 req/s per page from static files. SSR builds in under 2 s but
costs about 1–15 ms of server time per request, depending on page size, and in this run the
server's memory grew under load. Pages whose main content is loaded by a component in the
browser (Markdown articles) keep that gap under SSR. Under SSG it closes, because the
prerenderer runs browser lifecycles.

## Method

- MacBook (Apple M4, 10 cores, 24 GB), macOS 25.5, Node 24.19, Chrome for Testing 156, Vite 8.2.
- Each project is linked to the workspace packages on branch `feat/light-dom-ssr`. Each project
  runs on its own local branch `feat/render-mode-benchmark` (uncommitted); see [project changes](#project-changes).
- Builds: `vite build -- --ssg` with the `node` deployment target, without `tsc`.
- Server: every variant is hosted by the same `createNodeServer` (`@ayu-sh-kr/dota-ssr/node`).
  For each page, one cold request is followed by a 4 s load test with 8 parallel clients on the
  same machine.
- Browser: 5 cold loads per page, medians reported. Chrome runs with 4× CPU slowdown, 40 ms
  latency, 10 Mbit/s down, a 1280×800 viewport, and third-party requests blocked. "Heading" is
  the first non-empty `<h1>` in the DOM, from navigation start.
- The `ssr` variant was rerun on 18 October after the [`/` fix](#bug-found-a-static-shell-shadowed-a-server-rendered-) below;
  its numbers come from that rerun. All other variants are from the 17 October run.
- Single machine, one run per variant, with client and server sharing the CPU. Treat the
  differences between modes as stronger evidence than the absolute numbers.

### Pages

| Kind | dota-web | webingo-frontend | ayu-sh-kr-portfolio |
| --- | --- | --- | --- |
| home | `/` | `/` | `/` |
| content page | `/docs/component-definition` | `/pricing` | `/news` |
| index | `/blogs` | `/blog` | `/blog` |
| article | `/blogs/content/Tutorial/Dota-Breadcrumb.md` | `/blog/erp-solutions-for-growing-business` | `/blog/why-use-redis-channels` |
| interactive | `/chat` | `/start` | `/design/interaction` |

Mixed distribution: home, docs, marketing, design, and legal pages are `ssg`; blog and news
indexes, articles, pricing (webingo), and community (dota-web) are `ssr`; forms, cards, chat,
demos, subscription flows, and error pages are `csr`.

## Results

### Time to first heading (ms, median)

| Page | dota-web ssg / ssr / csr | webingo ssg / ssr / csr | portfolio ssg / ssr / csr |
| --- | --- | --- | --- |
| home | 69 / 65 / 1,179 | 66 / 70 / 1,048 | 66 / 73 / 1,663 |
| content page | 82 / 1,292* / 1,282 | 63 / 68 / 1,028 | 64 / 69 / 1,694 |
| index | 1,150* / 63 / 1,157 | 65 / 70 / 1,046 | 62 / 66 / 1,698 |
| article | 68 / 66 / 1,146 | 65 / 71 / 1,051 | 62 / 68 / 1,680 |
| interactive | 65 / 67 / 1,142 | 65 / 69 / 1,021 | 63 / 67 / 1,671 |

\* The heading is rendered by a component that loads its data in the browser, in that mode.

FCP improves less than the heading time, because the stylesheet and module scripts block the
first paint in every mode. The portfolio drops from about 1,770 ms (CSR) to 1,040–1,150 ms;
webingo stays around 610–680 ms in all modes. LCP follows FCP when the page arrives rendered;
under CSR it lands at about 1,100–1,800 ms. CLS stayed at 0 except for dota-web's CSR article
(0.4) and CSR doc page (0.1).

### Content in the initial HTML (visible characters before any script)

| Page | dota-web ssg / ssr / csr | webingo ssg / ssr / csr | portfolio ssg / ssr / csr |
| --- | --- | --- | --- |
| home | 8,208 / 7,402 / 0 | 19,013 / 16,875 / 0 | 6,125 / 5,900 / 0 |
| content page | 9,368 / 747 / 0 | 4,385 / 4,374 / 0 | 16,761 / 16,536 / 0 |
| index | 1,939 / 279 / 0 | 4,442 / 4,422 / 0 | 5,058 / 4,833 / 0 |
| article | 8,736 / 279 / 0 | 14,154 / 1,547 / 0 | 19,720 / 1,770 / 0 |
| interactive | 420 / 339 / 0 | 2,572 / 2,572 / 0 | 8,376 / 8,151 / 0 |

When a page's content comes from `render()` and configuration, SSR sends the same content as
SSG. Articles and dota-web's docs and blog lists differ, because their content is fetched by
components in `connected` lifecycle hooks; see [findings](#findings).

### Server (8 parallel clients, 4 s per page)

| Page | dota-web ssg / ssr (req/s, p95 ms) | webingo ssg / ssr | portfolio ssg / ssr |
| --- | --- | --- | --- |
| home | 3,942 · 3.0 / 610 · 16.8 | 3,968 · 3.0 / 322 · 33.3 | 4,292 · 2.5 / 517 · 22.6 |
| content page | 4,082 · 2.7 / 1,430 · 8.3 | 4,212 · 2.5 / 672 · 16.8 | 4,098 · 2.8 / 193 · 57.2 |
| index | 4,282 · 2.5 / 5,170 · 2.6 | 4,202 · 2.5 / 608 · 18.6 | 4,147 · 2.6 / 508 · 20.4 |
| article | 4,099 · 2.8 / 5,337 · 2.4 | 4,073 · 2.8 / 1,081 · 12.5 | 4,159 · 2.6 / 726 · 16.4 |
| interactive | 4,231 · 2.6 / 5,105 · 2.4 | 4,520 · 2.5 / 1,103 · 11.7 | 4,114 · 2.6 / 464 · 22.7 |

CSR pages are served as the shell at about 3,500–4,200 req/s. SSR throughput scales inversely
with the size of the rendered page. In the 17 October run (before the fix) the same SSR pages
were up to about 40% faster, so run-to-run variance on this shared machine is large.

| Server memory (RSS, start → after load) | dota-web | webingo | portfolio |
| --- | --- | --- | --- |
| ssg | 59 → 198 MB | 59 → 189 MB | 59 → 197 MB |
| ssr | 75 → 339 MB | 75 → 651 MB | 81 → 767 MB |
| mixed | 75 → 324 MB | 74 → 1,335 MB | 81 → 867 MB |
| csr | 59 → 134 MB | 59 → 139 MB | 59 → 136 MB |

### Build (wall time, `vite build -- --ssg`)

| Variant | dota-web | webingo | portfolio |
| --- | --- | --- | --- |
| mixed | 2.7 s (15 pages prerendered; server 194 ms) | 2.1 s (7; 169 ms) | 3.6 s (21; 327 ms) |
| ssg | 4.5 s (36 pages, 2.9 s prerender) | 2.3 s (26, 1.4 s) | 4.4 s (100, 3.5 s) |
| ssr | 1.9 s (server bundle 1.6 MB) | 1.6 s (1.5 MB) | 2.0 s (2.4 MB) |
| csr | 1.7 s | 0.7 s | 1.0 s |

The server bundle build plus the application read take 150–330 ms. Prerendering dominates
every build that has many SSG pages.

## Findings

1. **SSG and SSR are equally fast to content; CSR is not.** With either, the first heading appears
   in about 65–75 ms on a throttled browser, against 1.0–1.7 s with CSR. Choose between SSG and SSR
   by freshness and build cost, not by first-render speed.
2. **SSR memory grows under load.** RSS rose to 650–1,335 MB in SSR builds after about 20 s of
   load, while static-only serving stayed under 200 MB. This points to state retained per request
   (for example application-event channels created per component instance, or caches keyed by
   request). It needs a heap-profile investigation before SSR is used in production.
3. **Lifecycle-loaded content is missing under SSR.** Articles whose Markdown is fetched in a
   `connected` hook carry about 10% of their SSG text. Fixing it needs `serverLoad` support in
   dota-md's `md-view` (render Markdown given on the server) and a `serverLoad` in the articles that fetches
   the source through `context.fetch`. Webingo's article sections now render their header on the
   server through a shared `serverLoad` helper.
4. **Hydration mismatches.** Webingo's server-rendered article logs 4 mismatch warnings per load.
   The portfolio logs about 1 per page in every server-rendered mode, SSG included, so that one
   predates this work. Each mismatch makes the client remount that component.
5. **SSR costs server time in proportion to page size.** A 127 KB page (portfolio `/news`) renders
   at about 190–290 req/s on one process; small pages render at about 5,000 req/s. Under real
   traffic, put a CDN or cache in front of public SSR pages, as the
   [buffered SSR plan](../planning/buffered-ssr-and-edge-cache.md) proposes.

### Bug found: a static shell shadowed a server-rendered `/`

In the first SSR run, `/` returned the 1 KB client shell with no route marker in every
project, so it measured as CSR. A client-only build writes the shell to `dist/index.html`,
and every host serves files before dynamic routes. So the request for `/` resolved to that
file and never reached the SSR handler. SSG hides this because it overwrites `index.html`
with the prerendered home page.

Fixes in `@ayu-sh-kr/dota-ssr`:

- **Node:** `createNodeServer` no longer serves a client `index.html` that is identical to the
  fallback shell, so `/` reaches the handler. A prerendered home page is still served as a file.
- **Netlify:** the function no longer sets `preferStatic`. It only claims `ssr` paths, so it
  takes precedence for exactly those, `/` included.
- **Cloudflare Pages:** already correct, since the worker runs before static assets.
- **Vercel:** files are always served before rewrites, so the build now warns when `/` is an
  `ssr` route.

After the fix, `/` carries 5,900–16,875 characters of server-rendered content, and its heading
appears at about 65–73 ms instead of 1,048–1,663 ms.

### Other issues fixed while running the benchmark

- The SSR shell was read after SSG had overwritten `index.html` with the prerendered home page,
  so its meta tags leaked into every SSR page. The shell is now captured when the client bundle
  is written.
- The shell's default `<title>`, description, social, icon, and canonical tags were duplicated
  next to page SEO. They are now replaced, matching `updateDocumentSEO` in the browser.
- An application's `ssr.external` (the portfolio externalizes `@ayu-sh-kr/dota-rest`) produced a
  server bundle that could not resolve that package; bundles are now always self-contained.
- A component `render()` returning nothing crashed the serializer; it now renders empty, as in the browser.
- `createNodeServer` answered render errors with the SPA shell and a 200 status, which hid
  failures; it now logs the error and answers 500.

## Project changes

All changes are uncommitted on the projects' local `feat/render-mode-benchmark` branches.

- `pnpm` `overrides` link every `@ayu-sh-kr/dota-*` package to the workspace (absolute `link:` paths;
  not suitable for committing as is).
- Every `@Route` declares an explicit `mode`; the legacy `ssr` flag is removed.
- `vite.config.ts` reads `DOTA_DEPLOYMENT` (default `vercel`; `node` for a local server) and
  `DOTA_BENCH_VARIANT` (which parameterized pages to prerender). The blog and news slug lists are
  exported for tools.
- Portfolio: `check-internal-links.mjs` accepts links to routes declared `ssr` or `csr`, read from
  the `@Route` decorators.
- Webingo: the article's header, notch, summary, next-post, and start-project sections resolve the
  post from `context.params.slug` in `serverLoad`.
- dota-web: route modes and the same two configuration hooks.

## Not covered

- Real platforms (Vercel, Netlify, Cloudflare): every run used the Node target on localhost.
- Warm-cache and repeat visits, and client-side navigation between pages.
- Interactivity timing (time until event handlers respond); hydration is only checked for mismatches.
- More than one server process, and a heap profile of the memory growth.

## Reproduce

```sh
pnpm -r run build
npm i --prefix /tmp/dota-bench-deps playwright-core@1.64.1
node tool-scripts/render-mode-benchmark/benchmark.mjs --runs 5 --load-seconds 4 --concurrency 8
```
