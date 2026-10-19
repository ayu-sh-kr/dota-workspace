# Mobile TBT reduction plan

Status: in progress. The first round of fixes landed on `fix/hydration-adoption`; this document records
what was measured, what changed, and the next steps.

## Targets

| Metric | Good | Poor | Portfolio today (mobile lab) |
| --- | --- | --- | --- |
| First Contentful Paint | ≤ 1.8 s | > 3.0 s | 1.03–1.23 s (already good) |
| Total Blocking Time | ≤ 200 ms | > 600 ms | 1.36–2.15 s |

Lab setup: `ayu-sh-kr-portfolio` SSG build served by `vite preview`, linked to the workspace packages,
Playwright with Pixel 7 emulation, 4× CPU slowdown, 10 Mbps / 40 ms, median of 7 runs per route
(`/`, a blog article, a showcase page).

## Where the blocking time goes

A trace of the blog article after the first round of fixes:

| Cost | Time | Owner |
| --- | --- | --- |
| Evaluating the single 1.3 MB JS bundle | ~570 ms | Portfolio bundle shape; framework loads every component |
| Style and layout for one 524 KB stylesheet | ~1.1 s | Every page's CSS ships on every route |
| Forced layout in `updateScrolledState` and `setBrowserTheme` | ~180 ms | Portfolio startup code |
| Template parsing and hydration | small after the fixes below | `dota-rendering` |

## Done on `fix/hydration-adoption`

- `dota-popover` and the other light-DOM `dota-ui` components (badge, button, chip, card, card
  footer, avatar, slide, scroll-deck, carousel) read authored content on connect instead of in
  the constructor. happy-dom builds elements before their children are parsed, so SSG emitted
  them empty and the header failed to hydrate on every page.
- `dota-rendering`: adopted attribute parts keep the server locator; string components keep
  matching server markup; templates are parsed once per document; attribute markers match in
  linear time; marker patterns are compiled once per scope.
- `dota-md`: re-applying the prerendered theme writes only the classes that differ
  (418 class writes on a blog article down to 6).

## Next steps

### 1. Route-level code splitting (architectural, highest impact)

`virtual:dota-components` statically imports every component, and `dota-router` accepts only a
ready `ComponentClass`, so every route evaluates every page and its CSS.

- `dota-router`: accept `component: ComponentClass | (() => Promise<ComponentClass>)` and await
  the loader before rendering or adopting a route. Additive; existing routes keep working.
- `dota-vite-preloader`: emit `() => import(...)` for `@Route` pages; keep shared shell
  components (header, footer, `dota-ui`) eager.
- `dota-ssr`: the initial route handoff must wait for the page chunk before adoption; the SSG HTML
  stays visible meanwhile, so FCP is unaffected.
- Expected result: per-route JS and CSS chunks from Vite, with the 524 KB stylesheet split by page.

### 2. Portfolio quick wins

- `content-visibility: auto` with `contain-intrinsic-size` on the footer and lower article
  sections. Measured: blog TBT 2149 → 1702 ms (−21%).
- Move `updateScrolledState` and the `getComputedStyle` read in `setBrowserTheme` into
  `requestAnimationFrame` or idle time (~180 ms of forced layout).
- Load highlight.js and its grammars (~63 KB) with `import()` only when Markdown renders in the
  browser; prerendered articles already contain highlighted code.
- Skip markdown-it and `dota-md` parsing on prerendered pages (inferred, not yet measured).
- Use WOFF2 fonts and preload the above-the-fold weight.

### 3. Deferred hydration (framework feature, after step 1)

Hydrate off-screen components when visible or idle. Re-measure first; only pursue this if TBT is
still above 200 ms after steps 1 and 2.

## How to re-measure

1. `pnpm -r run build` in this workspace.
2. In the portfolio, override `@ayu-sh-kr/dota-wrap`, `dota-ui`, and `dota-md` with `link:` paths to
   the workspace packages, run `vite build -- --ssg`, then `vite preview`.
3. Run the Playwright benchmark with the settings above and compare FCP, LCP, TBT, and CLS medians.
