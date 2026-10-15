# Dota Web build and Web Vitals benchmark — 14 October 2026

Measures `master` at `b85f3a6` (after #132): workspace and Dota Web build times, static generation,
and lab FCP, LCP, CLS, and TBT for the generated site. It also records the experiment that cut the
client bundle by 57% without changing any generated page. That change is now implemented by moving
highlight.js out of `dota-md` and into the application, and it was verified in a second application,
Webingo (see [Implemented change](#implemented-change-the-application-provides-the-highlighter)).

Static generation already roughly halves mobile FCP compared with the client-rendered build. The
remaining cost is mostly after first paint: a 497 KB (gzip) bundle, about 60% of which is
highlight.js, delays hydration and causes 1–2 s of main-thread blocking on a throttled phone.

## Environment and method

- Linux x64 shared cloud container, Node.js 22.22.0 (CI uses Node 24), pnpm 11.9.0.
- Builds: three runs each of `pnpm run build` and `pnpm run build:ssg` in `packages/apps/dota-web`,
  after one cold `pnpm -r run build`. Absolute times vary by about 10% between runs.
- Web Vitals: Chromium 141 (Playwright) against `dist/` served by a local gzip static server, cache
  disabled, five runs per page and profile; tables show medians.
  - Mobile: 412×823 viewport, 4× CPU slowdown, 150 ms latency, 1.6 Mbps down.
  - Desktop: 1350×940 viewport, no CPU slowdown, 40 ms latency, 10 Mbps down.
  - FCP and LCP from paint and LCP entries; CLS sums layout shifts; TBT sums long-task time over
    50 ms after FCP; "Ready" is when the app logs `Application initialized`.
- Google Fonts were fetched live. `api.iconify.design` is blocked from this container, so icon
  requests were answered with a placeholder SVG after two round trips, and the generated HTML
  contains empty icon slots. Production SSG fetches icons during the build, so its build is slower
  and its HTML larger than measured here.
- Lab numbers on a local server: TTFB is about 10 ms. Use them to compare variants, not as field
  data.

## Build times

| Step | Runs (s) | Median (s) |
| --- | --- | ---: |
| `pnpm -r run build`, whole workspace, cold | 119.9 | 119.9 |
| Dota Web `build` (`tsc` ≈ 4.1 s + `vite build`) | 12.3, 13.7, 13.5 | 13.5 |
| Dota Web `build:ssg`, end to end | 34.3, 30.8, 33.6 | 33.6 |
| SSG phase only, 33 routes, `concurrency: 1` | 20.2, 17.4, 19.4 | 19.4 |

In the workspace build, most package builds take 7–14 s; `vite-plugin-dts` declaration generation
accounts for most of that time.

Within the SSG phase, the first route (`/`) takes 3.9–4.7 s because it pays the one-time Vite
transforms. The other 32 routes take 0.32–0.85 s each. The slowest are documentation pages with
many code blocks (`/docs/life-cycle`, `/docs/rest-client`). #124 measured 7.8 s for 19 routes;
the docs rebuild in #128 brought the site to 33 routes.

Client output: JS 1,666 KB (496.5 KB gzip), CSS 379.5 KB (54.5 KB gzip), one chunk each.

## Web Vitals

### SSG build (`build:ssg`, what Vercel serves)

| Page | Profile | FCP | LCP | CLS | TBT | Ready | Transfer |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 2,556 | 2,556 | **0.118** | 1,489 | 5,822 | 821 KB |
| `/docs/core/` | mobile | 1,744 | 1,744 | 0.001 | 1,012 | 4,673 | 662 KB |
| `/blogs/content/Tutorial/AES.md/` | mobile | 1,944 | **5,780** | 0 | 1,998 | 5,580 | 669 KB |
| `/blogs/` | mobile | 1,700 | 1,700 | 0 | 1,176 | 4,627 | 623 KB |
| `/` | desktop | 1,064 | 1,064 | 0.004 | 217 | 1,176 | 821 KB |
| `/docs/core/` | desktop | 720 | 720 | 0 | 0 | 859 | 662 KB |
| `/blogs/content/Tutorial/AES.md/` | desktop | 716 | 716 | 0 | 0 | 942 | 669 KB |
| `/blogs/` | desktop | 1,344 | 1,344 | 0.001 | 909 | 855 | 623 KB |

Times are milliseconds.

### Client-rendered build (`build`), for comparison

| Page | Profile | FCP | LCP | CLS | TBT | Ready |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 5,020 | 5,020 | 0.118 | 224 | 3,928 |
| `/docs/core/` | mobile | 4,308 | 4,992 | 0.230 | 107 | 4,004 |
| `/blogs/content/Tutorial/AES.md/` | mobile | 4,276 | 4,924 | 0.621 | 556 | 3,894 |
| `/blogs/` | mobile | 4,456 | 4,456 | 0 | 74 | 3,926 |
| `/` | desktop | 1,256 | 1,256 | 0.004 | 193 | 816 |
| `/docs/core/` | desktop | 888 | 1,084 | 0.067 | 0 | 804 |
| `/blogs/content/Tutorial/AES.md/` | desktop | 964 | 964 | 0.454 | 0 | 777 |
| `/blogs/` | desktop | 1,440 | 1,440 | 0 | 444 | 757 |

SSG cuts mobile FCP by 49–62% and removes the content-loading layout shifts on documentation and blog
pages. Its higher TBT is the same startup and hydration work, now occurring after first paint
instead of before it. With SSG, the app becomes ready 0.7–1.7 s later on mobile. The prerendered
HTML is 88–141 KB, and the bundle download still determines when the app is ready.

## Findings

1. **highlight.js accounts for about 60% of the bundle.** `dota-md` uses `markdown-it-highlightjs`,
   which imports all of `highlight.js` (~190 grammars). `dota-md`'s published build also inlines
   markdown-it and highlight.js (`dist/dota-md.mjs` is 1.77 MB), so applications cannot tree-shake
   or deduplicate them. Every SSG route evaluates this code again. The site's Markdown uses about 11
   languages: `typescript`/`ts`, `html`, `bash`/`shell`, `javascript`, `python`, `kotlin`, `json`,
   `css`, `lua`, and `text`. With `auto: true`, highlight.js also runs automatic language detection
   on the 197 code blocks that have no language label.
2. **`page-wrapper` hydrates by rebuilding its content.** It stores `this.innerHTML` in its
   constructor and returns a string from `render()`. In Happy DOM the constructor sees no children,
   so the generated HTML contains an empty `<section>` with `<blog-view>` placed after it. In the
   browser, the constructor captures that server HTML and wraps it again, producing nested sections,
   and recreates the 169 KB `blog-view` subtree. The recreated blog text becomes a second LCP
   candidate: 5.2–5.8 s on mobile for the AES post, compared with a 1.9–2.1 s first paint. No
   hydration-mismatch warning is logged, because string renders take the plain `mountRender` path.
   `app-header` and `app-footer` also return `HTML` strings, so their DOM is replaced on every
   initial load.
3. **The Google Fonts chain blocks rendering and causes the home page layout shift.** `font.css`
   loads Google Fonts with `@import` inside the main stylesheet. The browser discovers the font CSS
   only after the 54 KB stylesheet arrives, then discovers the font files after that. With Google
   Fonts blocked, the home page has no layout shift (CLS 0.118 → 0) and LCP drops from 2,556 to
   2,128 ms. This is an upper bound on the saving, because blocking fonts also removes the font
   download.
4. **Icons are fetched at runtime from a third party.** `dota-icon` requests every SVG from
   `api.iconify.design` (about 30 names per page) when it connects, even when the generated HTML
   already contains the SVG. During SSG, the module-level `SVG_CACHE` is created again for each route,
   so production builds fetch each icon once per route. This could not be measured here because the
   host is blocked.
5. **Each page uses 15–19% of the CSS.** About 136 KB of the 371 KB stylesheet is `dark:` variants,
   largely from `dota-md`'s theme × accent class tables, which must all exist for the runtime pickers.
   Tailwind scans both `src` and `dist` of `dota-ui` and `dota-md`; the `dist` scan also reads
   highlight.js's bundled strings.
6. The SSG output drops the template's `<link rel="icon">`. This does not affect performance, but it
   can be checked in the same SEO/head code.

## Experiment: highlight.js core with the site's languages

This is the throwaway experiment that motivated the change. The implemented version follows it.

`dota-md` was temporarily built with `highlight.js` aliased to `highlight.js/lib/core` and the 11
languages above registered. `markdown-it-highlightjs` options were unchanged. Dota Web was then
rebuilt with SSG and measured with the same method. The experiment was reverted and is not part of
this change.

| Metric | `master` | Experiment |
| --- | ---: | ---: |
| `dota-md.mjs` (unminified) | 1,770 KB | 578 KB |
| Dota Web JS | 1,666 KB / 496.5 KB gzip | 812 KB / 211.9 KB gzip |
| `build:ssg` end to end (one run) | 33.6 s median | 24.8 s |
| SSG phase, 33 routes | 19.4 s median | 12.1 s |

| Page (mobile) | FCP | LCP | TBT | Ready |
| --- | --- | --- | --- | --- |
| `/` | 2,556 → 2,548 | 2,556 → 2,548 | 1,489 → **124** | 5,822 → **3,717** |
| `/docs/core/` | 1,744 → 1,764 | 1,744 → 1,764 | 1,012 → **85** | 4,673 → **2,375** |
| `/blogs/content/Tutorial/AES.md/` | 1,944 → 1,856 | 5,780 → **1,856** | 1,998 → **58** | 5,580 → **2,942** |
| `/blogs/` | 1,700 → 1,720 | 1,700 → 1,720 | 1,176 → 661 | 4,627 → **2,610** |

On mobile, FCP does not change because the CSS and font chain determines it.

On desktop, the smaller bundle made FCP **worse**: 20–170 ms later on all four pages, across three
separate rounds of measurements. On a fast connection the bundle now arrives before first paint, so
module evaluation and hydration (a 150–300 ms task) run first and delay the paint. With the large
bundle, the page painted while the JS was still downloading. Wait one frame before importing the
entry: keep `<link rel="modulepreload">` so the download still starts immediately, then run
`await new Promise(r => requestAnimationFrame(() => setTimeout(r)))` before `import()`. With this
wait, desktop FCP was the same as or better than `master` (two rounds of five runs):

| Page (desktop) | `master` FCP | Experiment FCP | Experiment + wait FCP |
| --- | ---: | ---: | ---: |
| `/` | 892–1,064 | 1,064–1,208 | 900–992 |
| `/docs/core/` | 720–740 | 740–800 | 668–676 |
| `/blogs/content/Tutorial/AES.md/` | 716–816 | 880–920 | 680–712 |
| `/blogs/` | 1,228–1,344 | 1,248–1,364 | 1,208–1,264 |

On mobile, the wait preserved the experiment's gains: FCP 1,688–2,620 ms and ready time
2,393–3,760 ms. TBT varied more between runs (88–646 ms) because the threshold decides whether one
task counts as long. The wait was tested by editing the generated HTML, not by changing source code.
 The AES post no longer had a late
LCP because hydration finished before the font swap. Finding 2 still causes the replacement, so a
slower device can still produce the second LCP.

The generated output did not change: all 33 pages contain the same 2,496 `hljs-*` spans, and after
removing per-build hydration IDs and asset hashes, every page matched `master` except for the CSS
filename. The CSS is 0.5 KB smaller because Tailwind no longer finds class-like strings in the bundled
grammars.

## Implemented change: the application provides the highlighter

`dota-md` no longer depends on `markdown-it-highlightjs` or bundles highlight.js; its published module
dropped from 1,770 KB to 445 KB. Fenced code renders escaped until the application passes
`MDService.configure({highlight})` or a highlighting plugin. Dota Web now does this in
`src/configs/markdown.config.ts`, registering the 11 languages it uses on `highlight.js/lib/core`
before the app starts. The change is a minor release of `dota-md` (see its changeset), because
consumers that relied on the default highlighting must now configure it.

Measured on the implemented Dota Web build (mobile, medians of 5 runs; "before" is the `master` run
above):

| Page | FCP / LCP | TBT | Ready |
| --- | --- | --- | --- |
| `/` | 2,556 → 2,364 | 1,489 → 698 | 5,822 → 3,225 |
| `/docs/core/` | 1,744 → 1,588 | 1,012 → 398 | 4,673 → 2,140 |
| `/blogs/content/Tutorial/AES.md/` | 1,944 → 1,692 (LCP 5,780 → 2,632) | 1,998 → 794 | 5,580 → 2,481 |
| `/blogs/` | 1,700 → 1,544 | 1,176 → 495 | 4,627 → 2,221 |

Desktop FCP for the implemented build ranged from 16 ms earlier to 104 ms later than `master`
(`/` 964 vs 860, `/blogs/` 1,044 vs 988, AES 680 vs 660, `/docs/core/` 640 vs 656; one round each). The earlier
experiment showed this is the cost of a faster-arriving bundle running before first paint (finding in
the experiment section); recommendation 1a below addresses it and has not been applied.

Static generation of the 33 routes took 10.1 s instead of 19.4 s, and `build:ssg` 19.3 s instead of
33.6 s (one run). All 33 generated pages contain the same 2,496 highlighted spans as `master`; the
only HTML differences are random popover IDs in two blog posts.

### Compatibility check: Webingo

Webingo (`webingo-frontend`, 26 SSG routes) uses `MDService` without configuring a highlighter and has
no code fences in its published content. It was built twice with the workspace `dota-wrap`, `dota-ui`,
and `dota-md` linked into `node_modules`; only `dota-md` differed (master versus this change).

| Metric | Before | After |
| --- | ---: | ---: |
| `build:ssg`, 3 runs | 16.8, 14.5, 15.4 s | 9.5, 10.0, 10.5 s |
| Static generation, 26 routes | 12.2 s | 7.2 s |
| JS bundle (gzip) | 505 KB | 199 KB |
| Mobile transfer, `/` | 659 KB | 362 KB |
| Mobile TBT, `/` / blog post / pricing | 1,098 / 892 / 786 | 652 / 512 / 352 |
| Mobile app ready, `/` / blog post / pricing | 4,552 / 4,375 / 4,544 | 2,165 / 2,249 / 2,401 |
| Desktop TBT (all three pages) | 103–140 | 0 |
| Desktop app ready (all three pages) | about 790 | 500–600 |

Mobile FCP and LCP were unchanged (1,120–1,290 ms; the largest difference was 40 ms), and layout shift
was identical. Desktop FCP varied from −52 ms to +48 ms across two rounds, which is within run-to-run
noise. All 26 pages were equivalent after removing hydration IDs and asset hashes, the CSS was
byte-identical, and the output file list matched.

## Recommended changes

Ordered by expected gain relative to risk. Each preserves current FCP and generated HTML.

| # | Change | Where | Expected effect | Guardrail |
| --- | --- | --- | --- | --- |
| 1 | **Done in this change.** Register a configurable language set with `highlight.js/lib/core`. Keep markdown-it and highlight.js external to `dota-md`'s library build | `dota-md` (published, needs a changeset) | Matches the experiment: −285 KB gzip, mobile TBT −90%, ready about 2 s sooner, SSG about 35% faster | Same `hljs-*` output on all pages. Keep a full-language option for consumers who rely on it. **Ship with 1a** |
| 1a | When SSG markup is present, wait one frame before evaluating the entry, keeping a `modulepreload` | Dota Web template or the SSG plugin's HTML output | Prevents the 20–170 ms desktop FCP regression that a smaller bundle otherwise causes | Desktop and mobile FCP no worse than this baseline |
| 2 | Make `page-wrapper` a `TemplateResult` layout that adopts children instead of capturing `innerHTML`. Move `app-header` and `app-footer` from `HTML` strings to `html` templates | Dota Web | Removes the second LCP and the nested `<section>`, and keeps header and footer DOM during hydration | Compare SSG and post-hydration DOM; expect zero top-level removals and no mismatch warnings |
| 3 | Move fonts from CSS `@import` to `<link rel="preconnect">` and `<link rel="stylesheet">` in `index.html`, or self-host `woff2` with `preload` and a metric-matched fallback (`size-adjust`) | Dota Web | Home CLS from 0.118 to about 0; up to about 400 ms FCP on mobile | Visual check in both themes |
| 4 | Skip the fetch in `dota-icon` when the slot already contains SVG for the same `name`. Bundle icons at build time, or cache remote GET responses for the whole SSG run | `dota-ui`; optionally `dota-ssr` | About 30 fewer third-party requests per page view; faster production SSG builds | Icons still update when `name` changes |
| 5 | Extract `dota-md` theme and accent CSS into its own file, or load inactive themes on demand; scan only `src` or only `dist` | `dota-md`, Dota Web Tailwind config | Smaller render-blocking CSS, about 54 KB gzip today | Theme and accent pickers continue to work |
| 6 | Split code by route with dynamic page imports | preloader plugin, router | Further reduces initial JS | Larger change; do after 1 and 2 |

### Next improvements

In order, given what is now measured:

1. **Apply 1a (yield one frame before the entry).** It is the only open item that affects first paint
   directly, and the smaller bundle makes the desktop regression more likely on fast connections.
   Verify against the numbers above on both profiles.
2. **Fix `page-wrapper`, `app-header`, and `app-footer` hydration (item 2).** After this change the
   AES post still has a second LCP candidate on mobile (1,692 → 2,632 ms) caused by the
   recreated blog subtree. It is now the largest remaining LCP cost and removes DOM churn everywhere.
3. **Fonts and icons (items 3 and 4).** Mobile FCP is bound by the CSS and font chain, and each page
   still makes about 30 third-party icon requests. These two are the main remaining first-paint and
   production-build-time costs.
4. **Slim `dota-md` further.** `dota-md.mjs` is still 445 KB (unminified): about 47% theme class
   tables (four themes, each repeated per accent color), 46% inlined markdown-it and its
   dependencies, and 7% component code. Options: register themes on demand so applications bundle only
   the ones they use (Webingo uses one; Dota Web's pickers need all), and mark `markdown-it` and
   `markdown-it-anchor` external so applications can deduplicate them. A lazy Markdown entry loaded only
   when a page renders Markdown at runtime is also possible, since SSG pages already contain the
   rendered HTML, but it needs a hydration check first.
5. **Split CSS and code by route (item 5, then 6).** Pages use 15–19% of the 54 KB gzip stylesheet,
   and Webingo's entire JS bundle is still about 200 KB gzip.

Leave SSG `concurrency` at 1. As #124 found, each worker transforms the application again. After
change 1, per-route rendering costs less, so the trade-off can be measured again then.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm -r run build
cd packages/apps/dota-web
pnpm run build       # client-rendered build
pnpm run build:ssg   # static generation; prints per-route and total SSG timings
```

Serve `dist/` with gzip and an `index.html` fallback, then collect `first-contentful-paint`,
`largest-contentful-paint`, `layout-shift`, and `longtask` entries in Chromium with the throttling
profiles above. Close the browser context between runs so caches do not carry over.

## Related documentation

- [SSG build performance audit](../../../libs/dota-ssr/planning/ssg-build-performance-audit.md)
- [DOM engine benchmark](../../../libs/dota-ssr/planning/dom-engine-benchmark-2026-10-13.md)
- [Vite plugin scan benchmark](../../../libs/dota-wrap/performance/vite-plugin-scan-benchmark-2026-10-13.md)
