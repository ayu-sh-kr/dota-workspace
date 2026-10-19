# Route-level code splitting for mobile TBT

Investigation log for bringing Dota Web's mobile Total Blocking Time (TBT) from 1.4–2.1 s
toward the 200 ms "good" target, with each route loading only its own JavaScript.

## Method

- Node SSG/SSR build (`pnpm run build:node`) served behind a Brotli proxy to match Vercel.
- Lighthouse 12.6 mobile, simulated throttling with `cpuSlowdownMultiplier=20`. That multiplier
  makes HEAD's home page land at ~1.4 s TBT, matching the PageSpeed Insights numbers.
- Medians of 3 runs while exploring and 5 runs for the final comparison. TBT varies by
  ±150 ms between runs because single long tasks fall inside or outside the TBT window.

## Root causes

1. **One 833 kB entry chunk for every route.** Templates reference children only by tag, so
   the preloader imported all 70 components, and `main.ts` eagerly imported every Dota UI and
   Dota MD element plus highlight.js. Every route parsed, evaluated, and defined all of it.
2. **Canvas animations running during start-up.** `orb-background` is `display: none` below
   `lg` but drew every frame on mobile; `cloud-chamber` computed ~300k `sin` calls and five
   full-viewport blurs per frame, so `/community` never reached a quiet window.
3. **Startup definitions in one task.** Defining an element upgrades and hydrates every
   instance synchronously, so defining a page's tree at once is one long task.

## Options tried

| Option | Result | Decision |
| --- | --- | --- |
| S1: vendor `codeSplitting` groups, still eagerly imported | Home 1418 → 903 ms, `/blogs` 1331 → 476 ms, same script time, FCP +400 ms | Rejected: splits the task without removing work |
| S3: tag-driven lazy registry (`lazyComponents`) | `/blogs` JS 188 → 102 kB, TBT 1331 → 666 ms; home and docs barely moved | Kept: the foundation for per-route JS |
| S5: shared visibility/idle-gated animation loop | `/blogs` 666 → 0 ms; home script time 3.6 → 2.0 s | Kept |
| S6: definition batches yielding under 40 ms; separable vapor field | Splits route definition work; vapor math ~100× cheaper | Kept |
| Half-resolution cloud canvas + cached static blur layers | `/community` per-frame cost ~3 s → ~350 ms simulated; route settles | Kept |
| S7: replace prebuilt `dota-ui.css` with component CSS only | CSS 379 → 375 kB; no TBT change | Rejected: the minifier already merged the duplicates |
| Code-split route CSS into lazy chunks | Not shipped | Would load CSS after prerendered HTML paints (layout shift) and reorder the cascade after Tailwind utilities |

## Final comparison (5-run medians)

| Route | HEAD TBT | Final TBT | HEAD script ms | Final script ms | JS kB (transfer) |
| --- | --- | --- | --- | --- | --- |
| `/` | 1374 | 896 | 3487 | 2003 | 188 → 196 |
| `/blogs` | 1322 | 0 | 4497 | 829 | 188 → 103 |
| Blog post | 100 | 75 | 993 | 1158 | 188 → 182 |
| `/community` | never settles | 626 | 37063 | 3650 | 188 → 98 |
| `/docs` | 459 | 514 | 1369 | 1483 | 188 → 176 |

Prerendered output was compared with HEAD's: all 20 SSG pages have identical text and
custom-element counts, and SSR responses differ only in `modulepreload` links.

## Remaining work

- **Home and docs hydration.** The largest remaining tasks are one element's synchronous
  upgrade: style recalculation and layout during home hydration (~75% of its largest task), and
  the docs page template. Batching cannot split a single element; this needs incremental
  hydration in Dota Rendering or lighter page templates.
- **Route assets in server HTML.** Dota SSR should emit each route's chunk `modulepreload`
  and CSS links into SSG/SSR HTML. That removes the post-entry fetch waterfall and makes it
  safe to code-split route CSS.
- **Dota UI packaging.** The library ships one 180 kB module, so any tag loads all of it.
  Publishing per-component modules would let routes load only the elements they render.
- **`/community` content.** HEAD's build renders `<page-wrapper>` without its children on SSR
  and in the browser, because the wrapper reads `innerHTML` in its constructor. This predates
  this change.

## Related documentation

- [Lazy components](../../../libs/dota-wrap/architecture/lazy-components.md)
