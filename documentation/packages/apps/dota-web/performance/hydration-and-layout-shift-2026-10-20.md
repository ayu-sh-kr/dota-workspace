# Hydration, LCP, and layout shift — 20 October 2026

Measures `master` at `d433895` and the change that converts Dota Web to hydratable templates.
On `master`, first paint was already fast, but two pages painted their largest content 1.5–1.8 s
after first paint and three pages shifted visibly. Every cause was DOM that the browser threw
away and rebuilt, or that it never received from the server.

## Environment and method

- Node build (`pnpm run build:node`) served by `dist-server/server.mjs` behind a Brotli proxy.
- Chromium (Playwright 1.56), cache disabled, medians of 5 runs per page and profile.
  - Mobile: 412×823, 4× CPU slowdown, 150 ms latency, 1.6 Mbps down.
  - Desktop: 1350×940, no CPU slowdown, 40 ms latency, 10 Mbps down.
- FCP and LCP from paint and LCP entries, CLS summed from layout shifts, TBT from long tasks after FCP.
- Hydration was checked on every prerendered route and `/community`: hydration-mismatch warnings
  in the console, and element removals inside custom elements recorded by a `MutationObserver`.
- Lab numbers on a local server; compare variants, not field data.

## Causes found on `master`

| Symptom | Cause |
| --- | --- |
| `/docs/*` LCP 2.7 s on mobile, CLS 0.23 | Docs routes were `mode: 'ssr'`, and the request-time renderer does not run the `connected` hook that loads the Markdown. The HTML carried only the loading skeleton; the article painted after the JavaScript fetched and rendered it, pushing the pager down. |
| Blog post LCP 2.6 s on mobile | `page-wrapper` copied its `innerHTML` and returned a string, so hydration replaced the 30 KB article with a fresh copy, which became a second LCP candidate. |
| `/blogs` CLS 0.66 | The same wrapper rebuilt `blog-section` after first paint. |
| Header, footer, and most components rebuilt on every page | More than 40 Dota Web components and every Dota UI component used by the site returned strings, which hydration cannot adopt. |
| Home CLS 0.118 | The Google Fonts swap rewrapped the hero heading from three lines to two. |
| `aes-flow` and other blog embeds rebuilt with a mismatch warning | markdown-it wrapped `<aes-flow …></aes-flow>` in a `<p>`; the browser closed the paragraph at the embed's first block element, so its DOM differed from the prerendered DOM. |

## Changes

- **Templates everywhere.** Every Dota Web component and page returns an `html` template. Lists use
  nested templates or `keyed`, optional fragments use `when`, and trusted Markdown uses
  `trustedHTML`. Components no longer read authored children: `page-wrapper` and `section-wrapper`
  became plain `<section>` elements, `section-header` takes `heading` and `highlight`, and
  `code-snippet` takes `code` and renders the highlighted block in its template.
- **Browser-only state after hydration.** `blog-section`, `blog-pagination`, and `dark-mode-button`
  render the server default and apply stored pagination or the theme once connected.
- **Docs prerendered.** The docs routes are `mode: 'ssg'` and every document in `DOCS` is listed in
  the SSG routes. Dota SSR now accepts a parameterized `ssg` route when listed paths cover it. Only
  `/community` remains request-time rendered.
- **Dota UI components used by the site hydrate.** `dota-icon`, `dota-accordion`, `dota-button`,
  `dota-popover`, `dota-breadcrumb`, `scroll-deck`, `d-avatar`, `avatar-wrapper`, `dota-chip`,
  `dota-alert`, `orb-background`, and `cloud-chamber` return templates. Wrappers move their authored
  children into a `data-dota-slot` element instead of copying `innerHTML`, and Dota SSR's string
  adapter fills the same element.
- **Blog embeds as HTML blocks.** Each embed's opening tag is one line and its closing tag is on the
  next, so markdown-it does not wrap it in a paragraph.
- **Self-hosted fonts.** DM Sans and Fira Code are served from `/assets/fonts` as WOFF2 with
  metric-matched local fallbacks: one for body text and one for display text, because DM Sans's
  optical-size axis makes it wider than Arial at body sizes but narrower at display sizes. The
  fonts are not preloaded: a preload competed with the stylesheet on the mobile profile and delayed
  FCP by about 350 ms.

## Results

Mobile (ms, CLS unitless):

| Page | FCP | LCP | CLS | TBT |
| --- | --- | --- | --- | --- |
| `/` | 1,084 → 1,092 | 1,084 → 1,092 | 0.118 → 0.001 | 266 → 253 |
| `/docs/core/` | 896 → 968 | **2,696 → 968** | 0.230 → 0 | 282 → 66 |
| `/blogs/` | 944 → 924 | 944 → 924 | **0.658 → 0** | 54 → 13 |
| `/blogs/content/Tutorial/AES.md/` | 1,048 → 1,056 | **2,580 → 1,056** | 0 → 0 | 203 → 128 |

Desktop:

| Page | FCP / LCP | CLS | TBT |
| --- | --- | --- | --- |
| `/` | 356 → 320 | 0.004 → 0.006 | 61 → 61 |
| `/docs/core/` | 232 / 636 → 280 / 280 | 0.067 → 0 | 0 → 0 |
| `/blogs/` | 536 → 512 | 0 → 0.001 | 8 → 0 |
| `/blogs/content/Tutorial/AES.md/` | 268 → 256 | 0.001 → 0.001 | 19 → 1 |

LCP now equals FCP on every measured page and profile. FCP differences are within run-to-run noise
except `/docs/core/` on mobile, whose HTML now carries the full article. All 33 prerendered routes and
`/community` hydrate without a mismatch warning or a removed element; on `master` every page rebuilt
its header and footer.

## Remaining opportunities

- **Critical CSS.** FCP is bound by the HTML and one 378 KB (38 KB Brotli) stylesheet, of which
  each page uses a fraction. Inlining a page's critical rules in the generated HTML could save one
  round trip on mobile.
- **Per-route module preloads.** Every page preloads every page chunk; generated HTML should
  preload only the current route's code.
- **Icons in the generated HTML.** Most `dota-icon` slots are empty in prerendered pages and load
  after startup, one request each.
- **Images.** Home page images have no `width`/`height` or `loading="lazy"`.

## Related documentation

- [Build and Web Vitals benchmark, 14 October](./build-and-web-vitals-benchmark-2026-10-14.md)
- [Route-level code splitting for mobile TBT](./mobile-tbt-route-splitting.md)
- [Render modes](../../../../standards/hydration-ssr/render-modes.md)
- [Light-DOM string rendering](../../../libs/dota-ssr/architecture/light-dom-string-rendering.md)
