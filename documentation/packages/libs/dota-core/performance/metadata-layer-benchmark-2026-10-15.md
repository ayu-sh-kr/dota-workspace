# dota-core metadata layer benchmark — 15 October 2026

This report compares dota-core before and after the [metadata layer](../planning/metadata-layer.md).
*Before* is `fix/core-lifecycle-overhead` at `fb9793d`, which already includes the
[earlier lifecycle fixes](core-review-benchmark-2026-10-15.md). *After* is
`feat/core-metadata-layer`.

**Result.** The layer fixes six correctness bugs without slowing anything measurable:

- Defining a component class is 30% faster.
- Mounting a component with one property is 13–15% faster.
- Reconnecting a moved element is 4–13% faster.
- Lifecycle event timing is unchanged, down to the microtask.

Dota Web and Webingo are unchanged within noise. Their generated HTML differs only on Webingo's
blog pages, where the inheritance fix restores an attribute.

## Method

The environment and the micro-benchmark component set are the same as in the
[review benchmark](core-review-benchmark-2026-10-15.md#method). The micro-benchmark adds the
following scenarios:

- **Define 300 classes.** Run the decorators for 300 component classes and register them. Each
  class has two `@Property`, a `@State`, a `@Watcher`, and a `@BindEvent`.
- **Remove and append, measured separately.** Over 10 cycles of 4,000 elements, time the
  synchronous `remove()`, the microtask flush that follows it, and the synchronous `append()`.

Each variant gets a fresh page per run, and runs alternate A/B/B/A inside one browser. The tables
show the median of 31 runs, with p25–p75 for the spread. Each application was built with
`build:ssg` per variant and measured with 12 (Dota Web) and 20 (Webingo) interleaved runs.

## Micro-benchmark

Milliseconds, median of 31. *Static* render output isolates dota-core from `innerHTML`.

| Scenario | Static: before (p25–p75) | Static: after (p25–p75) | Δ | Real: before | Real: after | Δ |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Define 300 classes | 14.7 (12.5–15.7) | 10.1 (9.2–11.4) | **−31%** | 14.0 | 9.8 | **−30%** |
| Mount 2,000 cards | 89.6 (80.0–104.5) | 89.3 (76.4–95.0) | 0% | 91.5 | 90.0 | −2% |
| Mount 2,000 plain | 52.2 (48.0–64.5) | 45.4 (41.7–54.4) | **−13%** | 54.0 | 46.0 | **−15%** |
| 40,000 property sets | 84.1 (76.1–108.5) | 79.9 (75.4–94.4) | −5% | 82.1 | 83.8 | +2% |
| 10 attribute-change rounds | 94.7 (85.3–109.5) | 76.1 (71.0–91.8) | −20% | 1,314 | 1,266 | −4% |
| 10 click rounds | 183 (161–200) | 159 (146–182) | −13% | 1,470 | 1,395 | −5% |
| 5 detach/re-attach cycles | 662 (607–716) | 574 (500–713) | −13% | 924 | 888 | −4% |
| Remove ×10, synchronous | 261 (229–296) | 218 (195–237) | −16% | 283 | 275 | −3% |
| Remove ×10, microtask flush | 21.4 (19.8–23.6) | 21.0 (18.8–21.8) | −2% | 19.7 | 18.9 | −4% |
| Append ×10, synchronous | 367 (326–411) | 331 (297–358) | −10% | 389 | 387 | 0% |
| Teardown | 29.9 (24.2–37.4) | 29.6 (25.6–35.9) | −1% | 34.6 | 35.8 | +4% |

Rows whose p25–p75 ranges overlap are unchanged within noise. That covers mount of the card
component, property sets, and teardown. Real-render rows are dominated by `innerHTML` in
`dota-rendering`, so dota-core changes move them less.

### What the measurements changed

The first implementation used `queueMicrotask` for deferred lifecycle events and called
`Metadata.for(this)` on every read.

- **Teardown regressed by 15–20% in every sample.** Splitting it into phases showed the
  synchronous `remove()` was already faster. The microtask flush was 51% slower, and the CPU
  profile put 56 ms of self time in `queueMicrotask`. Scheduling through reactions on one settled
  promise, which V8 runs internally, made the flush 35% faster than before.
- **Owner resolution showed up in the profile.** `Metadata.for` plus `get` were 2.5% of the run,
  so `BaseElement` now resolves its record once per instance.
- **The dota-ui suite then caught a timing change.** The old `Promise.all(...).then` chains ran
  `CONNECTED`, `HYDRATED`, `@AfterInit`, and `DISCONNECTED` on the second microtask, and the
  first version ran them on the first. That reordered `PopoverComponent`'s
  `@OnEvent(CONNECTED)` handler against code that awaits one microtask. Every event is now
  scheduled on exactly its old tick: the second for connection and disconnection, the first for
  `DOM_UPDATED` and reactive renders. A probe measured `@AfterInit` on the same tick in both
  versions, and a test pins it. The extra reaction gives back the flush gain, which is now at
  parity; nothing regressed.

## Applications

`build:ssg` builds, 4× CPU throttling, interleaved runs. Spread is p20–p80 within each variant.

### Dota Web (12 runs)

| Metric | Before | After | Δ | Before spread | After spread |
| --- | ---: | ---: | ---: | --- | --- |
| Ready (ms) | 1,235 | 1,172 | −5.1% | 1,021–1,344 | 1,096–1,289 |
| Load task time (ms) | 1,573 | 1,481 | −5.8% | 1,294–1,696 | 1,420–1,636 |
| TBT (ms) | 907 | 810 | −10.7% | 704–928 | 745–882 |
| Navigation script (ms) | 923 | 915 | −0.9% | 864–964 | 834–950 |

### Webingo (20 runs)

| Metric | Before | After | Δ | Before spread | After spread |
| --- | ---: | ---: | ---: | --- | --- |
| Ready (ms) | 1,198 | 1,149 | −4.1% | 1,077–1,226 | 1,071–1,244 |
| Load task time (ms) | 1,695 | 1,678 | −1.0% | 1,605–1,754 | 1,576–1,772 |
| TBT (ms) | 687 | 642 | −6.6% | 572–737 | 607–734 |
| Navigation script (ms) | 771 | 731 | −5.2% | 731–834 | 718–786 |

Every application range overlaps, so neither application changed measurably. An earlier 12-run
Webingo sample went the other way (TBT +14%) and was not reproduced at 20 runs. As the earlier
review found, dota-core is about 2% of their JavaScript time.

## Generated HTML

Both applications were built with SSG on each variant, and every page's HTML was compared after
removing the bundle hash. Webingo's 12 blog article pages now carry `content-class` on
`blog-markdown-view`. `BlogMarkdownViewComponent` extends `MdViewComponent`, and before the layer
its inherited `@Property` metadata was invisible. Dota Web's only differences are popover IDs that
come from `Math.random()` on every build. There are no other differences.

## ayu-sh-kr portfolio

This section measures the whole pull request: both dota-core rounds plus the dota-router and
dota-ssr changes. *Before* is the full workspace at `master` (`ec91be7`); *after* is
`feat/core-metadata-layer` (`9485229`). The portfolio was linked to each build's `dota-wrap`,
`dota-ui`, and `dota-md` and built with `build:ssg`. Each build prerendered 96 routes, and both
passed the portfolio's internal link check (2,633 links).

Pages were measured with 20 interleaved runs at 4× CPU throttling. Each run loads `/`, then
navigates on the client through `/blog`, `/blog/distributed-locks-redis`, `/showcase`,
`/pricing`, and back to `/`.

| Metric | Before | After | Δ | Before p20–p80 | After p20–p80 |
| --- | ---: | ---: | ---: | --- | --- |
| Ready (ms) | 1,378 | 1,373 | −0.4% | 1,276–1,445 | 1,311–1,445 |
| Load script (ms) | 515 | 500 | −2.9% | 483–564 | 450–526 |
| Load task time (ms) | 1,537 | 1,555 | +1.2% | 1,435–1,626 | 1,474–1,643 |
| TBT (ms) | 917 | 919 | +0.2% | 857–1,000 | 839–1,013 |
| Navigation script (ms) | 1,176 | 1,171 | −0.4% | 1,118–1,278 | 1,119–1,307 |
| JS heap (MB) | 19.1 | 18.8 | **−1.5%** | 19.1–19.2 | 18.8–18.9 |
| SSG prerender, 96 routes (s, median of 3) | 19.00 | 18.89 | −0.6% | 18.81–19.43 | 18.14–19.56 |

Only the heap ranges separate. That is consistent with components no longer creating empty
metadata maps per instance. Timing is unchanged within noise. A CPU profile of a load and four
navigations attributes about 20 ms of 541 ms of JavaScript self time to dota-core's lifecycle
(`connectedCallback`, `bindHTML`, and metadata lookups). The largest costs are in the
portfolio itself:

- `app-header`'s scroll listener `updateScrolledState`, which runs during route scroll resets
  (47 ms).
- `GeneralUtils.setBrowserTheme`, whose class toggles on `<html>` restyle the whole document
  (36 ms).
- `updateProgress` and the footer's one-second clock (31 ms together).

The generated HTML is identical on all 96 pages. The only differences are the bundle hash and the
footer clock, which prints the build time. The portfolio has no component subclasses, so the
inheritance fix changes nothing there.
