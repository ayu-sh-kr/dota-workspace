# Faster SSG builds: what to change and when

Audited on 14 September 2026. Steps 1–4 and isolated parallel rendering from step 6 are implemented. Writes can overlap other workers' renders, covering step 5 in parallel mode. Application lifecycle changes in steps 7–8 remain future work.

## Implemented changes

Source code now follows the [Vite / SSG / reserved SSR layout](../architecture/source-layout.md).
The Vite build hook delegates generation to `ssg/generate.ts`; rendering and workers live in `ssg`.

- Empty explicit route lists skip template reads and renderer startup while retaining optional Vercel handling.
- The second settling pass runs only after a custom `settle` callback.
- Local asset bytes and pending reads are shared across routes for one build. The cache retains at most 32 MiB and 256 entries, excludes generated HTML destinations, and drops failed reads. Each response still gets its own body.
- Uncached HEAD requests read file metadata instead of file bodies. Cached HEAD requests reuse the stored size.
- Output folders are created once per build, and route-marker lookup stops at the first matching host.
- Timing logs now report per-route render/write durations, total SSG elapsed time, and the three slowest routes. Set `logType: 'debug'` for setup, entry loading, readiness, settling, serialization, and cleanup timings. Worker routes report durations to the coordinator; their overlapping times are not added to calculate total build elapsed time.

Set `concurrency: 2` to render independent pages in two reusable worker threads. Dota Web now enables this option. The default remains `1`; callbacks passed as `settle` require that sequential mode. Each worker owns its globals, Vite server, and bounded asset cache. The next free worker takes the next route, while the coordinator owns output writes and the single Vercel update. The `renderTimeout` option bounds startup, each route/write, and shutdown; failures terminate the pool.

Prerender servers omit the Dota event-map and Web Types writers, client dependency optimization, and WebSocket listeners. Dota Web's Tailwind content patterns now scan UI source and distribution files rather than the whole package tree, avoiding scans through nested dependencies.

Tests cover real overlapping route execution, worker reuse, fresh custom-element registries, state isolation, crashes, timeouts, write failures, and preserving application transforms while excluding duplicate metadata writes. Dota Web's full SSG build successfully generated 19 routes using two workers.

The strongest opportunity for larger sites is to render several pages at once in isolated workers. The smallest promising change is to avoid repeating the final settling step when no custom `settle` callback exists, provided integration tests confirm that late content is still captured. Keep fresh windows and hydration markers in both cases.

## Original behavior before these changes

The [SSG plugin](../../../../../packages/libs/dota-ssr/src/vite/index.ts) runs after the client bundle has finished. It reads the HTML template once and creates one Vite server for the whole SSG run. Route discovery is already metadata-only: it does not need to load page components just to find routes.

It then processes pages one at a time. For each page it creates a Happy DOM window, installs browser globals, writes the template, invalidates Vite's module graph, loads the application, waits for readiness and pending work, adds route markers, serializes HTML, closes the window, and writes the file. The next page starts only after that write finishes.

This repeats application startup for every page. Module invalidation serves a purpose: component classes must belong to the current window's `HTMLElement` and custom-element registry. Removing it alone can break later pages. Vite may reuse some transformed source; repeated application loading does not necessarily mean every file is transformed again.

Previously, the [fetch adapter](../../../../../packages/libs/dota-ssr/src/ssg/prerender-fetch.ts) read a local file again on each matching request. The renderer also ran `settlePrerenderWindow()` twice even when no custom callback ran between them. Each call waits for Happy DOM work twice and tracked fetches twice. These are queue barriers, not fixed delays, so fewer calls do not automatically mean a large saving.

## Implementation order and remaining work

Steps 1–4 and 6 below record the design now implemented. Step 5 is covered by bounded writes in worker mode; a separate sequential write queue is not implemented. Steps 7–8 describe future changes.

| Order | When | Change required | Effort | Work removed |
| --- | --- | --- | --- | --- |
| 1 | First small patch | Skip renderer startup for an empty explicit route list | Easy | Unnecessary template read and server startup |
| 2 | First small patch | Skip the second settle pass when no callback exists, with content checks | Easy | Repeated waits on the default path |
| 3 | Next patch | Cache immutable local asset reads for one build | Small to medium | Repeated reads of shared Markdown, JSON, and other files |
| 4 | With the file cache | Avoid reading bodies for HEAD requests; remember created folders; simplify marker lookup | Easy | Small, unnecessary file and array operations |
| 5 | After defining page dependencies | Overlap a bounded number of output writes with rendering | Small to medium | Waiting for every file write before starting the next page |
| 6 | Next substantial feature | Add isolated render workers | Medium to large | Rendering all independent pages sequentially |
| 7 | Alongside small patches, where applicable | Skip unnecessary application startup work and duplicate registrations | Depends on the application | Work that contributes nothing to static HTML |
| 8 | Later projects | Load fewer components, reuse application state safely, or reuse unchanged output | Large | Repeated module loading, startup, or complete page rendering |

Items 1–4 are the minimal-change batch. Item 5 needs an explicit rule for pages that read other generated pages. Item 6 is the main parallel-rendering improvement, but it is not a one-line change. The sections below explain the required work in the same order.

### 1. Skip startup when there is nothing to render

In `generateStaticPages()`, called by `closeBundle()`, check whether autodetection is disabled and the explicit route list is empty before reading the template or creating the Vite server. Finish without starting the renderer in that case. Preserve the existing optional Vercel configuration handling for an empty route list.

When autodetection is enabled, the server is still needed to discover routes. Do not skip discovery. This change improves empty SSG runs only; it does not make a build with pages faster.

### 2. Avoid a second settle pass when there is no custom callback

In `prerenderRoute()`, keep the first settle pass after application readiness. Run the custom callback and its following settle pass only when `options.settle` exists. The current [Dota Web configuration](../../../../../packages/apps/dota-web/vite.config.ts) does not supply this callback, so it would use the shorter path.

This is a candidate for the first small performance patch, not a proven redundant wait. Extra passes can currently capture late asynchronous work. Before accepting the change, test delayed local fetches, work started by a fetch completion, component updates, and callbacks that schedule more work. Compare complete generated page content. Do not remove all settling or replace it with an arbitrary sleep.

### 3. Reuse local asset reads within a build

Add a build-owned cache to the fetch adapter and pass it to each route. Cache successful reads of immutable assets by their resolved file path; storing the pending read promise also lets simultaneous requests share one read. Create a new `window.Response` for every request so bodies remain independently readable and belong to the correct window.

Bound the cache by bytes or entries and discard it after the build. Preserve existing path checks, status codes, content types, and GET/HEAD behavior. Do not cache remote/API responses by default, and do not retain failed reads.

The output directory also receives newly rendered HTML during the run. Exclude generated route destinations from this cache: caching them could return stale content, including the original `index.html` after the root route replaces it. This optimization is most useful when several pages fetch the same assets; unique blog content and operating-system file caching may limit the gain.

### 4. Include three small cleanups

For an uncached local HEAD request in the fetch adapter, use file metadata to obtain its size instead of reading the entire body. Return the same headers and no body. Preserve missing-file, directory, and API fallback behavior: a directory must not become a successful file response. If bytes are already cached, use their size without another filesystem call. This saves work only for applications that issue HEAD requests.

In the output writer, remember folders successfully created during the build. Call `mkdir()` only for a folder not already in that set. If writes become concurrent, share the pending folder-creation promise too. This helps custom outputs that share folders; the usual one-folder-per-route layout has little repeated folder work.

In `markPrerenderedRoute()`, loop over the existing `[path]` query results and stop at the first matching host. Avoid converting and mapping every match before searching. Preserve the exact path and parent checks. This is a tiny allocation saving; the DOM query still collects matches.

### 5. Overlap output writes carefully

Today, `mkdir()` and `writeFile()` block the next render. Once a page has become an HTML string and its window is closed, its write can join a small bounded queue while the next page renders. Cache successfully created directory paths if repeated destinations share a directory. Await all writes and surface failures before reporting success or updating Vercel configuration.

There is one behavior dependency to resolve first: the fetch adapter reads from the same output directory. A later page can currently fetch HTML written by an earlier page. Overlapping writes can change that result. Preserve write barriers for dependent pages, or define and test an immutable asset source before enabling this generally. Do not queue every HTML string without a limit; large sites would retain unnecessary memory.

For the simplest first version, make overlapping writes opt-in for applications whose pages do not fetch generated HTML. Start with a small limit such as two pending writes. Handle write rejections immediately and include the affected output path in the error. Reuse this page-independence rule for parallel rendering.

### 6. Render pages in isolated workers

Do not replace the current loop with `Promise.all(routes.map(prerenderRoute))`. [Window installation](../../../../../packages/libs/dota-ssr/src/ssg/window-globals.ts) changes `globalThis.document`, `location`, `customElements`, `fetch`, and other browser APIs. Concurrent renders in that environment would overwrite each other's globals. They would also share module invalidation and hydration-emission state. Separate windows, or separate Vite servers in the same JavaScript environment, do not fix this.

Use a small reusable pool of worker threads or child processes. Each worker needs its own JavaScript globals and Vite server, and must render only one page at a time. Keep a fresh Happy DOM window and module invalidation for each page inside that worker. Start each worker once per build, not once per page.

Required implementation work:

1. Extract route rendering and server creation into a worker-loadable module, and include the worker entry in the package build and published exports/assets as appropriate.
2. The `concurrency` option in [DotaSsgOptions](../../../../../packages/libs/dota-ssr/src/ssg/types.ts) defaults to `1`. Use `2` for independent pages. Workers are capped by route count, and single-page builds avoid extra worker startup.
3. Resolve and validate routes once in the coordinator. Give the next available worker the next route, so one slow page does not hold up a fixed batch.
4. Pass the original template and serializable settings to workers. Keep sorted route/output mappings and update Vercel configuration once after successful completion.
5. Parallel mode rejects `settle` callbacks with an actionable error: functions and captured variables cannot be sent through worker messages. Use `concurrency: 1` with existing callbacks, or put readiness into the entry's `applicationReady` promise.
6. Review Vite plugin startup in each worker. The app config includes metadata generators; their file-writing hooks must not race across servers. Preserve the same aliases, transforms, and application semantics while assigning shared artifact writes to one owner.
7. Stop scheduling on failure, drain or cancel active work, close all windows and servers, and report the failing route. Define timeout and worker-exit handling so the build cannot hang indefinitely.
8. Resolve the same generated-HTML fetch dependency described above. Pages that depend on earlier output need ordering or an explicit input snapshot before they can run concurrently.

Two workers can render two independent pages at once. More workers also duplicate application memory and server startup, so a small configurable pool is the straightforward first implementation. Keep output and cleanup checks for both sequential and parallel operation. Unlimited concurrency is not required, and no particular speedup factor is promised.

### 7. Remove application work that does not contribute to static HTML

The application initializes again for every route. Where applicable, add an explicit SSG-aware startup path that skips analytics, notification connections, continuous visual effects, and other browser-only services that do not affect static HTML. These are areas to inspect, not confirmed unnecessary calls in every application. Keep routing, content loading, SEO updates, and component setup needed to render each page.

Start independent data requests together where application loaders currently await them one at a time. Prefer local build assets for fixed content instead of repeatedly requesting that content over the network. Replace fixed-delay application settle callbacks with promises that resolve when the actual content is ready.

[Dota Wrap registration](../../../../../packages/libs/dota-wrap/src/index.ts) appends external constructors and calls `bootstrap()`. Deduplicate repeated instances of the same constructor where inputs overlap. Report different constructors claiming the same selector rather than silently choosing one. This removes duplicate attempts within one page; registration once per fresh window is still required. Do this cleanup where duplicate inputs exist, without assuming they are a major cost in the current app.

These changes belong in application startup, data loaders, or Dota Wrap rather than being forced into the SSG renderer. They can be done alongside the small patches when the relevant unnecessary work is present.

### 8. Leave larger changes for later

These are additional performance areas, but they are not easy follow-up edits:

| Area | Required change | Why it is larger |
| --- | --- | --- |
| Load only needed components | Generate route-specific imports, including layouts and nested components | Changes discovery, registration, and application startup |
| Preserve reusable module work | Separate DOM-independent data and transformed source from window-bound evaluated modules | Broad cache reuse can retain old constructors or mutable services |
| Reuse one initialized application | Add explicit render, reset, and dispose operations between pages | Router state, listeners, services, and DOM must reset completely |
| Reuse unchanged HTML across builds | Track dependencies and reuse output only when every relevant input is unchanged | Must include content, config, template, asset hashes, runtime versions, and API freshness |
| Render directly to HTML without a DOM emulator | Introduce a server rendering contract for components | Changes rendering architecture and component behavior |

Do not simply retain the previous `applicationReady` promise or component constructors. Router state, service singletons, listeners, and DOM state must be reset correctly. Worker parallelism can improve throughput without introducing that persistent application lifecycle.

## Changes that are not priorities

[route-marker.ts](../../../../../packages/libs/dota-ssr/src/route-marker.ts) only exports three marker constants. It is not a meaningful build-time optimization target. The actual marker lookup is `markPrerenderedRoute()` in the Vite plugin; replacing its array conversion with an early-exit loop is a tiny possible allocation reduction, not a likely build speed improvement. Preserve marker names and versions so browser hydration continues to recognize generated pages.

The template is already read once, the Vite server is already reused across routes, route discovery is metadata-only, and Vercel configuration is updated once with unchanged-write avoidance. These do not need duplicate optimizations.

A DOM adapter, jsdom, or Chromium may help compatibility, but none is a prerequisite for faster SSG builds. Complete the small changes and isolated worker support before taking on a different rendering architecture.

## How to verify the eventual implementation

The [plugin tests](../../../../../packages/libs/dota-ssr/test/vite/index.test.ts) cover configuration validation and generation delegation. The [generation tests](../../../../../packages/libs/dota-ssr/test/ssg/generate.test.ts) cover sequential output and cleanup. The [worker tests](../../../../../packages/libs/dota-ssr/test/ssg/render-workers.test.ts) build the current worker source and prove concurrent execution with a fixture in which neither of the first two pages can finish until both have started. Fetch, route-output, globals, and hydration tests cover adjacent contracts.

Add an integration fixture that renders several distinct pages with async content and hydration markers. Verify that sequential and concurrent runs produce equivalent route content, metadata, asset references, and markers; that local storage, custom elements, and service state do not leak; and that invalid readiness, rejected work, failed writes, and worker crashes release resources and fail the build. Exercise both custom and absent settle callbacks. Follow with browser hydration verification of generated pages.

Use these correctness checks as part of each implementation patch, without a separate measurement phase. Start with empty-run handling and the conditional settle pass, follow with file reuse and small cleanups, then add write overlap and isolated workers. Keep caches and queues bounded so reducing repeated work does not require retaining the whole site in memory.

## Related documentation

- [Earlier SSG architecture and compatibility plan](streamlining-ssg-build.md)
- [Initial route hydration roadmap](initial-route-hydration-roadmap.md)
- [SSG build flow](../architecture/vite-ssg-plugin-flow.svg)
