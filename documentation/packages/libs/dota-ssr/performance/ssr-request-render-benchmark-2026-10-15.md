# dota-ssr request-time render paths — 15 October 2026

This report measures ways to render a Dota page for an HTTP request, the work the
[buffered SSR plan](../planning/buffered-ssr-and-edge-cache.md) proposes but `dota-ssr` does not
implement yet. The [SSG build report](ssg-build-speed-benchmark-2026-10-15.md) made static generation
fast. Nothing in this report changes repository code; every experiment used throwaway scripts against
Dota Web.

**Result.** The best path keeps Dota's decorator and DI design and removes two obstacles from the way
the render engine is packaged:

1. Build the application **once** with Vite's own SSR build into a single server bundle, so no Vite
   server, transform, or plugin runs at request time.
2. Keep `reflect-metadata` **outside** every bundle, as one shared instance. `dota-ui` currently
   inlines a second copy, which makes each render leak about 10 MB.

With both, a warm worker renders a Dota Web page in about 20 ms with flat memory. An HTTP server over
a pool of 4 workers served 120 req/s at 32 ms median latency.

## Method

MacBook Pro (Apple M4, 10 CPUs), Node 24.19, Vite 8.2, happy-dom 20.10.6. Ten Dota Web routes
(`/`, five documentation pages, the blog and community indexes, two blog posts) rendered in rotation.

- **Network is stubbed.** Same-origin fetches read `dist/`; cross-origin fetches (Iconify) return a
  fixed SVG. The real Iconify API answered 429 in the
  [SSG report](ssg-build-speed-benchmark-2026-10-15.md), so real-network runs are not repeatable.
- **Same lifecycle as `prerenderRoute`**: fresh happy-dom window, browser globals installed, shell
  written, application evaluated, readiness awaited, settle passes, route marker, `outerHTML`, window
  closed, then globals restored.
- Timings exclude the HTTP layer except experiment 9. Heap numbers come from `--expose-gc` and a
  forced collection before each sample.
- Single machine, one application, no serverless deployment. Treat ratios as stronger evidence than
  absolute milliseconds.

## What the existing engine costs per request

The current SSG engine (Vite dev server, module runner with `CompiledModuleEvaluator`) used as a
request handler, run sequentially:

| Metric | Value |
| --- | --- |
| Server startup | 215 ms |
| **First request** | **1,340 ms** (Vite transforms the application) |
| Warm request, median / p95 | 24 ms / 41 ms |
| Warm stages (median) | load 11.1, settle 8.1, cleanup 2.1, serialize 0.8, setup 0.7 |

Warm rendering is already fast. The cost is in getting to the first request: a serverless function
would pay a Vite startup, a Vite plugin load, and a full transform on each cold start, and would have
to ship Vite and the plugins in its bundle. That is what the plan's "no Vite runtime dependency"
requirement avoids.

## Experiments

### 1. Prebuilt server bundle

`vite build` with `build.ssr`, the application's own plugins (minus the metadata writers, as in
`createPrerenderServer`), and a virtual entry that enables hydration markers and exports the
application. This is the pattern in [Vite's SSR guide][vite-ssr]: a separate server build that
production code loads instead of the dev server. Output is one CommonJS file (1.5 MB, unminified,
`noExternal: true`). Building takes about 1.0 s.

**Equivalence.** After removing icon SVGs (the Vite run got none, the bundle run got the stub) and
random ids, bundle output matched the Vite-runner output on **10 of 10** routes, including the
`data-dh-route` hydration markers. A first comparison failed only because my harness omitted
`markPrerenderedRoute`; the marker step belongs in any shared render lifecycle.

### 2. Fresh worker per request, prebuilt bundle

Spawn a worker thread, import happy-dom, `require` the bundle, render, terminate. This is the plan's
production baseline.

| Metric | Median |
| --- | --- |
| Wall time per request | **154 ms** (p95 170 ms) |
| Worker + happy-dom import | 78 ms |
| Render | 66 ms (load 22, settle 34: cold JIT) |
| Fresh `node` process, no compile cache / with | 156 ms / 142 ms |

This is **9 times cheaper than the first request of the Vite-runner approach** and needs no Vite
code. Node's [compile cache][node-cache] trims about 9% from a cold process. Treat it as a small
extra, not a design driver.

### 3. Warm worker, bundle compiled once

Each worker compiles the bundle source once with `new Function` and evaluates it again for every
request, the same idea as `CompiledModuleEvaluator`: V8 keeps the compiled code, every request gets
fresh module state. One request runs at a time per worker, because the globals are process-wide.

| Pool | Render median / p95 | Throughput (80 queued requests) |
| --- | --- | --- |
| 1 worker | 22 ms / 38 ms | 42 req/s |
| 2 workers | 25 ms / 39 ms | 76 req/s |
| 4 workers | 34 ms / 80 ms | 100 req/s |
| 8 workers | 67 ms / 136 ms | 104 req/s |

Throughput stops improving past 4 workers (the machine has 10 CPUs, but workers contend for memory
bandwidth and GC), and per-request time doubles at 8. Pool size should be tuned per host, as the plan
already says. A worker pool is the standard Node pattern for CPU-bound work, and per-task worker
creation is the cost pools exist to avoid ([Piscina][piscina], [Snyk][snyk-workers]).

**Why concurrency inside one thread is unsafe.** Four simultaneous renders in one process, using the
global-swap approach, produced four wrong pages. All four returned the same HTML hash, so each
request saw another request's window. The existing `installWindowGlobals` is correct only when one
render runs at a time per realm.

### 4. Memory growth across requests — the blocker

Re-evaluating the application per request leaks about **9.8 MB per render** and without limit
(1,004 MB after 100 renders; a 600-render run exhausted a 4 GB heap). The existing Vite-runner engine
leaks at the same rate (8.9 MB per render), so this is already true today. SSG hides it because a
build is short.

A heap snapshot shows the retaining path:

```
Reflect[Symbol.for('@reflect-metadata:registry')]
  -> registerProvider (closure context)
  -> AlertService -> DotaAlertComponent -> Window
```

`reflect-metadata` keeps a **process-global registry**. Every additional copy of the library that
loads registers a provider in it, and the provider's closure chain keeps that render's whole window
alive. The bundle contained two copies: one from `reflect-metadata` itself and one **inlined inside
`dota-ui`'s published `dist/dota-ui.mjs`**. `dota-ui`'s Vite config externalizes only
`@ayu-sh-kr/dota-core`; `dota-md` has no copy. `dota-core`, `dota-event`, `dota-router`, and
`dota-wrap` already declare `reflect-metadata` in their `package.json`; `dota-ui` does not.

### 5. Fixes for the leak

Each run is 60 renders (the last one also 600), heap after GC.

| Fix | Heap at render 20 / 40 / 60 | Growth per render | Median render | Fits Dota? |
| --- | --- | --- | --- | --- |
| None (baseline) | 225 / 420 / 615 MB | 9.75 MB | 23 ms | n/a |
| **A. One shared `reflect-metadata`**: `dota-ui` externalizes it, the server bundle leaves it external | 30 / 50 / 30 MB | **0 MB** (600 renders: 30 / 29 / 30 MB) | **20–22 ms** | **Yes.** Uses the library as designed and fixes a packaging error. |
| **B. VM context per request**: run the bundle inside each window's own V8 context | 28 / 139 / 29 MB | 0.03 MB | 26 ms | Yes, with a shim list. See below. |
| C. Reset the registry before and after each render | crash | n/a | n/a | No. The registry property is non-configurable, so it cannot be deleted. |
| D. Recycle workers every N requests | bounded by N × ~10 MB | n/a | + 154 ms per recycle | Safety net only. |

Fix A needs two changes. In `dota-ui`, add `reflect-metadata` to `rolldownOptions.external` and to
`peerDependencies`. In the server build, leave `reflect-metadata` external, so one instance is loaded
per process. I tested this by rebuilding `dota-ui` into a temporary directory with the dependency
external and aliasing it into the server build; nothing in the repository was edited. All four
strategies produced the same page size (141,564 bytes of document HTML for the last route).

Fix B gives each request its own `Reflect`, so the registry is collected with the window, and it also
removes the global swap (`installWindowGlobals`) entirely. In the tests, 20 of 20 concurrent renders
inside one thread matched the sequential reference. It needed Node globals the context lacks
(`process`, `Buffer`, `setImmediate`, `clearImmediate`, `queueMicrotask`, `structuredClone`,
`TextEncoder`, `TextDecoder`) copied onto the window, which is a maintained allow-list. It also does
not add throughput: forty concurrent renders in one thread took 870 ms, which is 22 ms each, because
the thread is still CPU-bound. Its benefit is correctness under I/O overlap, not speed. VM contexts
are also how [Lit SSR][lit-ssr] isolates requests, though it uses experimental VM modules.

Fixes A and B are alternatives. `reflect-metadata` must be one shared instance for A, and it is not
shared across VM contexts, so the shared-reflect bundle cannot be used inside B.

### 6. HTTP server over a warm pool

Fix A bundle, an `http` server on the main thread, bounded worker pool, queue when all workers are
busy. 300 requests, mixed routes, fixed client concurrency, no failures.

| Pool / client concurrency | Throughput | p50 | p95 | p99 |
| --- | --- | --- | --- | --- |
| 1 / 1 | 45 req/s | 22 ms | 35 ms | 45 ms |
| 2 / 8 | 84 req/s | 93 ms | 116 ms | 157 ms |
| 4 / 4 | 120 req/s | 32 ms | 55 ms | 82 ms |
| 4 / 16 | 124 req/s | 121 ms | 168 ms | 219 ms |
| 8 / 16 | 128 req/s | 118 ms | 187 ms | 232 ms |

With client concurrency equal to the pool size, latency stays near the render time. Once requests
queue, latency is queue time: 16 clients on 4 workers take 121 ms at the median with no extra
throughput. The practical cap is about 120 req/s on this machine for this page, so past that a CDN
cache, not more workers, is the lever (see the plan's caching section).

## Paths compared

| Path | Cold request | Warm request | Memory | Library changes | Verdict |
| --- | --- | --- | --- | --- | --- |
| Vite runner in the request path (today's SSG engine) | 1,340 ms | 24 ms | leaks 9 MB/request | none | Reject for production: Vite ships in the function, cold start is slow |
| Bundle + fresh worker per request | 154 ms | 154 ms | bounded | none | **Ship first.** Simplest and correct, no leak because each worker dies |
| Bundle + warm worker + shared `reflect-metadata` (A) | 154 ms (first on a worker) | **20–22 ms** | flat | `dota-ui` externals + peer dependency | **Target.** Follows Dota's design and fixes a real packaging error |
| Bundle + warm worker + VM context per request (B) | 154 ms | 26 ms | flat | none, plus a globals allow-list | Fallback if A cannot land, or for in-thread concurrency |
| Warm worker + recycling every N requests (D) | 154 ms per recycle | 22 ms | N × 10 MB | none | Safety net on top of A |
| CDN or HTML cache (plan section 6) | n/a | CDN hit | none | none | Needed on top of any of the above for public pages |

## Recommended order

1. **Fix the packaging first.** Externalize `reflect-metadata` in `dota-ui` (and check `dota-md` and
   the other published libraries for inlined copies), with a changeset per the release rules. This
   is useful on its own: two copies of the registry are a latent bug in browsers too, and it removes
   the leak from SSG workers.
2. **Add a server build to `dota-ssr`.** A Vite SSR build with a virtual entry replaces
   `createPrerenderServer` for request handling. SSG can adopt the same bundle later, which would
   also remove each SSG worker's Vite cold start (about 1.1 s per worker in the portfolio). That is
   a possible follow-up; this report did not measure SSG on the bundle.
3. **Ship fresh-worker-per-request** as the first SSR release, as the plan says. 154 ms is acceptable
   behind a CDN and has no state-isolation risk.
4. **Add warm workers** behind a load test that asserts flat heap over several hundred requests,
   keeping a recycle limit as a guard.
5. Keep fix B in reserve and keep the existing happy-dom engine. The earlier
   [DOM engine benchmark](../planning/dom-engine-benchmark-2026-10-13.md) estimated 5–8 ms saved per
   route from LinkeDOM, now small next to worker, queue, and fetch time.

## Not covered

- No serverless deployment (Vercel or Netlify), so cold-start numbers are local worker and process
  times, not provider cold starts or bundle-size limits.
- No browser hydration check of the server output beyond the existing `data-dh-*` markers matching.
- No initial-data transfer, request cookies and headers, redirects, status codes, or error handling.
  Those are in the plan's steps 2 to 4.
- No minified bundle, route-split bundle, or V8 startup-snapshot measurement. The bundle is 1.5 MB
  unminified, so parse time is the likely next saving for the cold path.
- Streaming SSR was not tested. The plan defers it, and Dota's readiness model assumes the complete
  document.
- Network was stubbed. Real API latency adds directly to buffered response time.

## Reproduce

The experiment scripts were scratch files and are not committed. They are small: a Vite
`build.ssr` script with a virtual entry; a harness that reproduces the `prerenderRoute` lifecycle
against the bundle (fresh window, globals, fetch stub, settle, marker, serialize, close); a worker
that compiles the bundle once; and an `http` server over a worker pool. Say so if you want them added
under `tool-scripts/`.

## Sources

- [Vite: Server-Side Rendering][vite-ssr] — separate `--ssr` server build loaded by production code.
- [Node.js: `module.enableCompileCache`][node-cache] — on-disk V8 code cache; gains depend on module
  size and are not guaranteed.
- [Lit: Server-side rendering][lit-ssr] — VM context per render, shared registry in global scope.
- [Piscina][piscina] and [Snyk on worker threads][snyk-workers] — pooling avoids per-task worker
  creation cost; suited to CPU-bound work.

[vite-ssr]: https://vite.dev/guide/ssr
[node-cache]: https://nodejs.org/api/module.html#moduleenablecompilecachecachedir
[lit-ssr]: https://lit.dev/docs/ssr/server-usage/
[piscina]: https://github.com/piscinajs/piscina
[snyk-workers]: https://snyk.io/blog/node-js-multithreading-worker-threads-pros-cons/
