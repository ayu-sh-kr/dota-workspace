# Dota Vite plugin scan benchmark — 13 October 2026

Measures [PR #126](https://github.com/ayu-sh-kr/dota-workspace/pull/126) (`fix/ast-scan-speed`) against
`master` in three applications that build with `dotaVitePlugins()`. The PR fixes quadratic UTF-8 offset
conversion in `dota-ast-utils`, adds a shared `SourceFileIndex` used by the preloader, event-map, and
Web Types plugins, and makes the preloader read sources relative to its `root`.

On every project the client build is 8–11 times faster, generated artifacts and prerendered HTML are
unchanged, and each project's typecheck and tests pass.

## Method

- Projects: `ayu-sh-kr-portfolio` (94 SSG routes, 4 render workers), `webingo-frontend` (26 SSG routes,
  sequential), and `school-erp-app/frontend/dashboard-ui` (no SSG).
- Each project was installed from its lockfile, then `@ayu-sh-kr/dota-wrap`, `dota-ui`, and `dota-md` in
  `node_modules` were symlinked to the workspace packages. The workspace was built at `master`
  (`9d7813a`) for the baseline and at the PR head (`44c7aeb`) for the change, with identical linking.
- An `npm` row records the packages each project currently publishes against, for reference only:
  `dota-wrap@0.1.0` for the portfolio and School ERP, `dota-wrap@0.0.34` for Webingo.
- Scan: the `buildStart` hooks of the plugins returned by `dotaVitePlugins()`, called with each
  project's scan roots in a fresh Node process. Client: `vite build`. SSG: `vite build -- --ssg`.
- Three scan and client runs, two SSG runs; tables show the median, or the mean of the two SSG runs.
- Linux x64, Node.js 22.22.0, one shared cloud container. Absolute times vary between runs by about
  10%; the ratios are the useful figures.

## Results

### Plugin scans (ms)

| Project | Version | Preloader | Event map | Web Types | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| Portfolio | npm | 423 | 12,456 | 794 | 13,674 |
| Portfolio | master | 366 | 17,797 | 2,152 | 20,219 |
| Portfolio | PR | 245 | 345 | 124 | **720** |
| Webingo | npm | 152 | 2,942 | 213 | 3,263 |
| Webingo | master | 153 | 8,492 | 1,875 | 10,395 |
| Webingo | PR | 103 | 280 | 52 | **433** |
| School ERP | npm | 347 | 19,757 | 1,647 | 21,751 |
| School ERP | master | 341 | 20,572 | 1,677 | 22,489 |
| School ERP | PR | 223 | 363 | 82 | **676** |

The linked `master` scans more files than `npm` for the portfolio and Webingo: their scan roots include
`node_modules/@ayu-sh-kr/dota-ui` and `dota-md`, whose published packages contain no `src/`, while the
workspace packages add 60 TypeScript sources. Compare `master` with the PR, not with `npm`.

### Builds (s)

| Project | Version | Client `vite build` | SSG build, wall | Prerender | SSG setup |
| --- | --- | ---: | ---: | ---: | ---: |
| Portfolio | npm | 15.7 | 141.6 | 125.4 | 0.40 |
| Portfolio | master | 22.2 | 48.2 | 24.0 | 0.48 |
| Portfolio | PR | **2.6** | **25.9** | 22.4 | 0.16 |
| Webingo | npm | 5.6 | 61.9 | — | — |
| Webingo | master | 12.7 | 25.8 | 11.4 | 0.31 |
| Webingo | PR | **1.4** | **12.8** | 10.2 | 0.14 |
| School ERP | npm | 24.8 | — | — | — |
| School ERP | master | 23.6 | — | — | — |
| School ERP | PR | **2.1** | — | — | — |

"Client" is Vite's reported `built in` time. SSG setup includes route discovery, where the prerender
server now reuses the client build's parses. Webingo's published `dota-ssr` does not log prerender
timings. The `npm` portfolio SSG time predates the transform reuse in
[PR #124](https://github.com/ayu-sh-kr/dota-workspace/pull/124).

| Project | Client build, master → PR | SSG build, master → PR |
| --- | --- | --- |
| Portfolio | 22.2 s → 2.6 s (8.5×) | 48.2 s → 25.9 s (−22.3 s) |
| Webingo | 12.7 s → 1.4 s (9.2×) | 25.8 s → 12.8 s (−13.0 s) |
| School ERP | 23.6 s → 2.1 s (11×) | not used |
| Dota Web | 21.6 s → 7.0 s (3.1×) | 38 s → 25 s total `build:ssg` |

These applications gain more than Dota Web because plugin scanning was most of their client build.

## Correctness checks

- `web-types.json`, `custom-elements.json`, `src/event-map.d.ts`, and `vercel.json` hash identically
  after `master` and PR builds in all three projects.
- Prerendered HTML is identical for all 94 portfolio and 26 Webingo pages after normalising hashed asset
  names, which differ between any two builds, and the portfolio footer clock, which prints build time.
- With the PR linked: portfolio `tsc --noEmit` and 112 Vitest tests pass; Webingo `tsc --noEmit` passes
  (it has no tests); School ERP `pnpm typecheck` and 1,072 Vitest tests pass.
- Build logs contain the same errors and warnings for `npm`, `master`, and the PR.

## Findings outside this PR

None of these are caused by the PR; each reproduces with `master` or the published packages.

1. Scan roots under `node_modules` find nothing with published packages. The portfolio and Webingo
   scan `node_modules/@ayu-sh-kr/dota-ui` and `dota-md`, but those packages publish only `dist/`, so
   Web Types, the Custom Elements Manifest, and event maps omit library components. With linked
   workspace sources, the portfolio's `custom-elements.json` and `web-types.json` each gain about
   3,100 lines.
2. Every SSG build rewrites the portfolio and Webingo `vercel.json`. The committed files hold the same
   96 portfolio redirects and other keys, in a different order than the generator writes them, so
   each build leaves a reordering diff.
3. Prerendering fetches icons from `api.iconify.design`. Without network access, as in this benchmark,
   the portfolio logs 477 and Webingo 2 failed icon fetches; output depends on that service at build time.
4. The `dota-ssr` test "captures chained asynchronous content without a custom settle callback" fails
   intermittently (2 of 4 runs) on `master`.

## Reproduce

```sh
# In each project, after `pnpm install --frozen-lockfile`:
ln -sfn <workspace>/packages/libs/dota-wrap node_modules/@ayu-sh-kr/dota-wrap
ln -sfn <workspace>/packages/ui/dota-ui node_modules/@ayu-sh-kr/dota-ui
ln -sfn <workspace>/packages/ui/dota-md node_modules/@ayu-sh-kr/dota-md
npx vite build             # client
npx vite build -- --ssg    # SSG, where configured
```

Build the workspace with `pnpm -r run build` at each revision before linking, and restore the
projects with `pnpm install --frozen-lockfile` afterwards.

## Related documentation

- [SSR and Vite plugin composition](../configuration/ssr-and-vite-plugin-composition.md)
- [SSG build performance audit](../../dota-ssr/planning/ssg-build-performance-audit.md)
