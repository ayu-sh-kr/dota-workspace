# dota-ssr SSG build speed — 15 October 2026

This report profiles static generation in Dota Web, the ayu-sh-kr portfolio, and Webingo, and
measures three changes to `dota-ssr`. *Before* is `master` at `5a88679`; *after* is
`perf/ssg-build-speed`. Both portfolio and Webingo were linked to the workspace's `dota-wrap`,
`dota-ui`, and `dota-md` for every run.

**Result.** The DOM engine was not the bottleneck. Most of a route's time went to waiting on the
network and to recompiling the application:

- Dota Web: 33 routes in 7.97 s → 2.08–2.35 s. The median route went from about 250 ms to 30 ms.
- Portfolio: 96 routes in 7.33 s → 2.83–3.12 s, with 4 workers.
- Webingo: 26 routes in 1.99 s → 1.29–1.34 s.

## Method

MacBook Pro, 10 CPUs, Node 24. Each variant ran `vite build -- --ssg` three times per
application. Times are the `prerendered N routes in` total that `dota-ssr` logs, so they exclude
the client bundle. Stage times come from the `debug` log. CPU profiles were taken with
`node --cpu-prof` and summed by self time.

## Where the time went

### Network waits

A Dota Web CPU profile spent 5.6 s of a 9.6 s build idle. Each route spent about 180 ms in
settle, waiting for `fetch` calls to `api.iconify.design`.

`dota-icon` keeps a module-level SVG cache, but every route re-evaluates the application, so the
cache is empty on every page. Dota Web made 233 requests for 28 distinct icons. Each took
150–180 ms, and Iconify answered all of them with **429 Too Many Requests**, so the generated pages
had no icons either.

### Recompiling modules

Vite's module runner compiles a new `AsyncFunction` each time it evaluates a module. Clearing the
evaluated modules for each route therefore makes V8 parse and compile the whole application and its
dependencies again. With one worker, `runInlinedModule` was 2.77 s of self time in the portfolio
build, about 29 ms per route, and route `load` averaged 58 ms.

### Workers

Each worker starts its own Vite server and transforms the application before its first route.
That first route costs about 1.15 s in the portfolio. On this machine, 4 workers were only 1.4 times
faster than 1. On a 2-CPU build machine, the 4 cold starts compete for the same 2 cores.

### happy-dom

happy-dom was about 390 ms of CPU across Dota Web's 33 routes, and 1.0 s across the portfolio's
96 routes: 10–12 ms per route. The [DOM engine benchmark](../planning/dom-engine-benchmark-2026-10-13.md)
measured LinkeDOM at 2–3.5 times faster on DOM work. That would save at most 5–8 ms per route, and
LinkeDOM still needs an adapter for `location`, `history`, `getComputedStyle`, and
`XMLSerializer`. Changing engines is not worth its compatibility risk at this point.

## Changes

1. **Build-scoped network cache.** Plain GET requests to other origins are fetched once per build,
   or once per worker, and replayed as a new `Response` in each route's window. Concurrent requests
   share one fetch. Error statuses are replayed too; failures without a response are retried.
2. **Compiled module reuse.** A `CompiledModuleEvaluator` keeps one compiled wrapper per transformed
   module source. Each route still runs every module again with fresh state and its own globals.
3. **Worker cap.** `concurrency` is capped at `os.availableParallelism()`.

## Results

`prerendered N routes in` seconds, three runs each.

| Application | Before | Network cache | + module reuse and worker cap |
| --- | --- | --- | --- |
| Dota Web, 33 routes, 1 worker | 7.95, 8.09, 7.88 | 2.80, 2.78, 2.79 | 2.35, 2.33, 2.08 |
| Portfolio, 96 routes, 4 workers | 7.52, 7.13, 7.35 | 3.70, 3.62, 4.72 | 3.12, 2.83, 3.07 |
| Webingo, 26 routes, 1 worker | 1.94, 2.03, 2.00 | 1.79, 1.80, 1.83 | 1.29, 1.34, 1.29 |

Median route render after both changes: Dota Web 27–32 ms, portfolio 38–44 ms, Webingo 24–27 ms.
The first route of each server still pays for the Vite transform: 400–600 ms, or about 1.1 s per
portfolio worker.

## Generated HTML

All 156 pages were compared with and without the compiled-module evaluator, after removing bundle
hashes and Iconify SVGs, whose responses varied with rate limiting. The only differences are
`Math.random()` popover IDs in Dota Web and the portfolio footer's build-time clock. Both differ
between any two builds.

## Vercel-sized build machine

Vercel's Basic build machine has 2 vCPU and 8 GB. The same runs were repeated in a Docker
container limited to `--cpus=2 --memory=8g` (Node 24.22, Linux arm64), alternating before and after,
three runs each. Inside the container `os.availableParallelism()` reports 2, so the portfolio's
`concurrency: 4` runs 2 workers after this change.

| Application | Before: SSG total | After: SSG total | Before: median route | After: median route |
| --- | --- | --- | --- | --- |
| Dota Web, 33 routes | 8.76, 15.41, 11.65 s | 2.55, 2.92, 2.88 s | 240–486 ms | 31–33 ms |
| Portfolio, 96 routes | 14.81, 14.02, 14.43 s | 5.56, 7.76, 5.33 s | 291–323 ms | 43–84 ms |
| Webingo, 26 routes | 2.57, 2.28, 2.21 s | 2.07, 1.82, 1.46 s | 50–53 ms | 27–32 ms |

Before, Dota Web's totals swung widely because they depended on Iconify's response times. After,
every median route is below 100 ms on 2 vCPU. The largest remaining cost is each server's first
route, which pays for the Vite transform.

## Next steps

- **Bundle icons at build time.** The pages still depend on a rate-limited third-party API. The
  cache reduces requests eightfold, but a 429 during a build still produces pages without icons.
- **Share transforms across workers.** Each worker's cold start re-transforms the application.
  Transforming once in the coordinator and serving workers from it would remove most of the
  first-route cost.
- **Persistent application render.** Evaluate the application once and navigate the router per
  route, as the DOM engine benchmark recommends. That removes the remaining per-route module
  evaluation, but needs checks for state that leaks between routes.
