# Buffered SSR alongside SSG

Proposed implementation plan, audited on 14 September 2026. This document describes future work; request-time SSR and deployment adapters are not implemented yet. The current package provides SSG and browser hydration.

The recommendation is to retain SSG for known public pages, add buffered Node SSR for request-time pages, and opt suitable public SSR responses into the hosting provider's CDN cache. Reuse the existing DOM renderer and hydration markers. Most changes belong in `dota-ssr`, with small integration changes in Dota Wrap, application startup, and build configuration.

## What buffered Node SSR means

For an uncached page request, a Node function creates an isolated Happy DOM window, loads the application, awaits its content, adds hydration markers, and serializes the complete document. Only then does it return the HTML response. “Buffered” means that the complete HTML exists in memory before sending the response body. “Node” identifies the server runtime, not a requirement for a permanently running server.

The browser can display this HTML before JavaScript finishes loading. The existing hydration plugin subsequently adopts compatible markup and attaches the application lifecycle. Rendering the complete document first makes status codes, redirects, error handling, and CDN caching straightforward. However, the browser cannot receive and paint an early HTML shell while slower server data is still loading. Streaming would need a different readiness and output contract.

The proposed routing order is:

```text
Request
  -> deployed static asset or generated SSG page: serve from CDN
  -> eligible public SSR response already cached: serve from CDN
  -> selected SSR route without a usable cached response:
       Node function -> isolated render -> complete HTML -> response/CDN
  -> explicitly configured CSR route: serve untouched client shell
  -> unknown route: return 404
```

Private SSR routes bypass shared response caching. An API request or missing JavaScript asset must not fall through to the HTML renderer.

## Fit for Vercel and Netlify

Both platforms support Node functions, so the proposed execution model fits them. This is a design-level compatibility assessment, not a deployment verification of Dota SSR. The first implementation must prove worker startup, artifact inclusion, and request handling on both providers.

| Concern | Vercel | Netlify |
| --- | --- | --- |
| Execution target | Node.js Vercel Function | Node.js Netlify Function |
| Handler integration | Small adapter around the shared SSR handler | Small adapter receiving `Request` and returning `Response` |
| Instance lifetime | Warm instances may be reused; Fluid compute can run several invocations in one instance | Ephemeral function environments; correct behavior must not depend on retaining an instance |
| Public HTML caching | Explicit CDN response headers | Explicit CDN response headers; function responses are not cached by default |
| Additional cache option | Provider CDN caching and stale-while-revalidate | Provider CDN caching, stale-while-revalidate, and optional durable cache |
| Deployment proof | Worker file, server bundle, shell, and required content assets included in function output | The same artifacts included in the function bundle |

Edge caching does not require an Edge Function. Happy DOM, filesystem reads, and Node worker threads make Node the initial target. Porting this runtime to an edge isolate is separate work.

Do not run a Vite dev server or transform application source inside a production request. Build the server application ahead of deployment. Function files are deployment artifacts; requests return HTML without writing generated pages into the deployment directory. Keep function regions close to the data source to reduce uncached latency. A nearby CDN only removes the origin journey on a cache hit.

Workers share their parent function's CPU and memory allocation. Increasing the worker count does not create more function resources, and a large pool can make cold starts and contention worse. Start with a small bounded limit and measure queue time under the provider's concurrency model.

## How fast content can be served

There are no deployed SSR measurements for these packages yet. The audit's successful type checks and 177 tests establish an existing correctness baseline, not throughput or latency. SSG build duration also does not predict function response time: it includes different module loading, startup, and output work.

The useful metric for initial HTML is time to first byte (TTFB):

```text
Uncached TTFB ≈ network/routing + function cold start, if any
             + queue + worker startup + application evaluation
             + data/readiness/settling + serialization
             + required cleanup before response

Cached TTFB   ≈ client-to-CDN network + cache lookup/response overhead
```

Some stages overlap; instrumentation must avoid double-counting data work that starts during application evaluation. For buffered output, data loading on the critical path delays the entire HTML response. A warm function still pays the fresh render worker and application costs in the initial design.

### Illustrative latency budget, not a benchmark

These numbers demonstrate the effect of caching; they are assumptions, not expected Vercel or Netlify performance:

| Scenario | Assumed timing | Illustrative TTFB |
| --- | --- | --- |
| Warm function, cache miss | 100 ms network/routing + 250 ms complete render lifecycle | 350 ms |
| Cold function, cache miss | The same work + 700 ms function initialization | 1,050 ms |
| Nearby CDN hit | 60 ms client/CDN network + 10 ms response overhead | 70 ms |
| Stale response served during revalidation | Approximately the CDN-hit path; regeneration runs separately | About 70 ms in this example |

A page whose API takes an additional second adds roughly that second to an uncached response when the call is on the critical path. Real results may be much faster or slower than this example. Large component graphs, long settling, geographic distance, CPU limits, and concurrent requests all matter.

On a full HTML cache hit, delivery can approach SSG speed because both paths deliver stored HTML without invoking the renderer. This does not remove image, stylesheet, JavaScript, or hydration work. Measure Largest Contentful Paint separately from TTFB, and measure interactivity separately from both.

If a public page gets 95% cache hits at an assumed 70 ms and 5% warm misses at 350 ms, its illustrative mean is `0.95 × 70 + 0.05 × 350 = 84 ms`. This is not its p95 or p99. Cold misses and bursts can still dominate tail latency. Cache hit rate varies by URL, query variants, region, TTL, traffic, and eviction; low-traffic pages may frequently be cold.

## Cache behavior required for the first release

Keep cache policy explicit per route. SSG is the preferred path for stable, enumerated public content. Cache public SSR pages whose content can tolerate a defined period of staleness. Return `private, no-store` for personalized SSR, errors, and responses whose caching policy is unknown.

For example, a public page may be fresh for 60 seconds and eligible for stale serving for a further 300 seconds. The following are proposed adapter response headers, not configuration APIs that exist today:

```http
# Vercel public response
Cache-Control: public, max-age=0, must-revalidate
Vercel-CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

```http
# Netlify public response
Cache-Control: public, max-age=0, must-revalidate
Netlify-CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

The provider-specific header controls shared caching independently of the browser. On Netlify, optionally add `durable` to its CDN header after testing. Durable caching lets other edge nodes reuse a function response from a shared cache when their local cache misses, reducing duplicate invocations. A durable-cache hit is a separate latency case from a local edge hit.

The first request after an empty cache must render. Requests within the freshness window reuse HTML. A request within the subsequent stale window can receive the old HTML while the provider refreshes it. Without requests, this is not a periodic refresh job. After the permitted stale window, or after eviction or invalidation, a request may block on rendering again. The example permits serving content approximately six minutes old; use a shorter policy when that is unacceptable.

Required rules:

- A cache key must distinguish all inputs that affect public HTML: host/tenant, pathname, relevant query parameters, and any supported locale or content variant. Initially preserve provider query-key defaults; normalize or exclude tracking parameters only when rendering demonstrably ignores them. Netlify offers `Netlify-Vary` for deliberate variations.
- Publicly cached routes must render the same public content regardless of authentication cookies. Keep personalized routes separate initially. If one URL must switch between anonymous cached HTML and private HTML, configure and verify cache bypass or variation before the CDN lookup. Returning `no-store` inside the function cannot stop an already cached public response from being served without invoking it.
- Private responses must not inherit public provider-specific cache headers. Remove those headers or set their equivalent no-store policy. Do not cache responses with `Set-Cookie`, authorization-dependent content, failures, or arbitrary user-specific `Vary` keys in the first version.
- Keep hydration state subject to the same privacy rule as HTML. An embedded user payload makes the response private even if the visible page looks public.
- Delegate revalidation to the CDN. Do not leave an unawaited regeneration promise running after a normal function response. Treat request coalescing as provider behavior to verify, not a guaranteed global lock.
- Preserve deployment-based invalidation and matching client asset versions. Retain the default Netlify deploy invalidation; do not opt into cache IDs that survive deploys in the first version. Add explicit content-purge support later if TTL-based freshness is insufficient.

## Source-backed changes needed

| Current behavior | Required change |
| --- | --- |
| [Prerender runtime](../../../../../packages/libs/dota-ssr/src/ssg/prerender-runtime.ts) takes an SSG route/output mapping, installs globals, and invokes Vite | Extract a shared render lifecycle with a URL and injected entry loader; retain output mapping in SSG |
| [Global installation](../../../../../packages/libs/dota-ssr/src/ssg/window-globals.ts) changes process-global browser APIs | Execute request rendering in workers; the HTTP handler must retain its normal Node globals |
| [Vite preamble](../../../../../packages/libs/dota-ssr/src/vite/prerender-server.ts) enables markers before application import; runtime setup begins outside `try` | Protect setup and cleanup from the first resource allocation; reset emission even when application import fails |
| [SSG workers](../../../../../packages/libs/dota-ssr/src/ssg/render-workers.ts) reuse Vite and abort the entire pool on failure | Keep SSG semantics; add request-scoped worker ownership, cancellation, bounded concurrency, and failure recovery for SSR |
| [Fetch forwarding](../../../../../packages/libs/dota-ssr/src/ssg/prerender-fetch.ts) reconstructs API URLs and passes only `init` | Preserve the effective Request method, headers, body, and signal; define credential forwarding and immutable asset lookup |
| [Generation](../../../../../packages/libs/dota-ssr/src/ssg/generate.ts) may replace `index.html` with the root page | Preserve a separate original shell and deploy it with the server entry |
| [SSG route discovery](../../../../../packages/libs/dota-ssr/src/ssg/route-output.ts) uses `ssr: true` as its existing opt-in | Preserve that meaning and add explicit SSR route selection; use the router's matching semantics for dynamic requests |
| [Hydration adoption](../../../../../packages/libs/dota-rendering/src/renderer.ts) retains scalar DOM using client values as its initial baseline | Transfer matching initial data to client startup; preserve existing markers and cover mismatched data in integration tests |
| [Dota SSR exports](../../../../../packages/libs/dota-ssr/package.json) expose hydration, Vite, and the SSG worker | Add a separate Node server export and build artifact without pulling Node dependencies into the browser entry |

Initial SSR should support the existing light DOM serialization path. Shadow DOM output requires an explicit declarative-shadow serialization and hydration test before being advertised as supported: serializing `documentElement.outerHTML` does not by itself include shadow trees.

## Implementation order

Each step should preserve the existing SSG and hydration checks. These are proposed work packages; none is marked complete by this document.

### 1. Extract the shared render lifecycle and repair cleanup

Move reusable rendering, window setup, settling, and serialization into a small internal `src/render/` area. Keep Vite loading in `src/vite/`, static generation in `src/ssg/`, and request handling in `src/ssr/`. Avoid a new package or a general rendering backend framework.

Inject the application loader so SSG retains fresh Vite evaluation. Begin cleanup protection before fetch configuration, global installation, and template writing; restore partial installation on failure. Ensure marker emission is reset when imports fail. Keep route and template marker names/versions unchanged.

Acceptance: unchanged SSG content and asset references; failures during setup, import, readiness, settling, and serialization release windows and restore globals. This step is useful independently of SSR.

### 2. Define SSR contracts and preserve the original shell

Define request input with the full absolute URL, relevant headers, cancellation, and explicit request-local context. Define result output with HTML, status, response headers, and timings. Preserve repeated `Set-Cookie` headers; serialize worker messages as plain data rather than passing Node or Happy DOM Request/Response objects across realms.

Use the same core rendering behavior for GET and HEAD, suppressing the HEAD body. Reject unsupported page methods predictably. Expose a readiness-time status/redirect mechanism; connect it to routing results so missing routes return 404, guards can return redirects, and render failures return an uncached error rather than a 200 error page. Do not infer status by scraping error-page HTML.

Capture the untouched client shell before SSG writes any page. Keep existing SSG routes, flags, and public imports working. Choose proposed server entry names separately from today's browser hydration entry.

Acceptance: query-driven and parameterized pages, base paths, HEAD, redirects, 404s, and a generated `/` page alongside an unaffected SSR shell.

### 3. Build a production entry and prove function isolation early

Add a build-time server application bundle using the same relevant transforms, aliases, decorators, and template behavior as the client build. Resolve virtual route/component modules at build time. Guard SSG hooks from accidentally running on the server build. Include the worker entry, server entry/chunks, original shell, and content assets needed during rendering in a deployment manifest.

Use a fresh worker per render as the initial production baseline. Install its Happy DOM globals before importing application modules, enable marker emission before application startup, await completion, and terminate the worker after the result. Bound active workers and queued requests per function instance. One request failure must not cancel unrelated requests; queue timeout, render timeout, and cancellation must actually stop work.

This deliberately differs from the existing reusable SSG workers: those use Vite module invalidation between routes. A reused production worker with ordinary cached ESM imports would retain constructors, services, and the previous readiness promise. A warm parent function can cache immutable shell/manifest data; that does not make its application realm reusable. Defer reusable application workers until reset/dispose and fresh module evaluation are proven. Do not use ever-changing import query strings as an unbounded module-cache workaround.

Acceptance: a minimal function fixture starts the worker on both providers with no Vite runtime dependency; simultaneous distinct requests never share globals; crashes and deadlines leave later requests healthy. Verify provider bundle, response-size, memory, and duration limits against the actual artifact and selected plan.

### 4. Add request data, fetch fidelity, and initial-state transfer

Set the window URL from the request, including query parameters. Supply cookies/headers through request-local context; do not expose HttpOnly credentials as browser-readable cookies. Forward only intended credentials to a configured API destination. Preserve Request-versus-init precedence, body semantics, and cancellation when adapting fetch. Use a manifest-backed immutable asset source; do not recursively fetch the same SSR handler as an asset fallback.

Define an opt-in initial-data payload read before the client's first render, keeping server and client initial values aligned. Serialize only client-visible data and escape it safely for embedding, including literal `</script>` content. Do not serialize arbitrary service objects or credentials. Use explicit readiness promises for required data and skip browser-only background work that contributes nothing to HTML.

Acceptance: two concurrent users have distinct output with no leakage; API failures behave predictably; query variants remain distinct; the browser hydrates the server's initial data without stale-value baselines, unnecessary first-load refetching, or script injection.

### 5. Complete Vercel and Netlify adapters and hybrid routing

Wrap the shared handler with provider entrypoints and deployment configuration. Serve assets and generated SSG pages before SSR; preserve the application's configured CSR routes and existing redirects. Select SSR routes explicitly so the existing SSG `ssr: true` flag is not reinterpreted. Preserve the original request URL across internal rewrites.

Expose the server entry through `dota-ssr` and, for wrapper consumers, a separate Dota Wrap server surface. Keep today's `dota-wrap/ssr` browser hydration import compatible. Audit dependency tracing so Happy DOM and worker files are available in functions but do not enter browser bundles.

Acceptance: deployed fixtures demonstrate static, SSG, SSR, CSR, missing asset, and 404 behavior; response headers, cookies, redirects, and status survive both adapters. The earlier minimal worker deployment proof should make this integration predictable.

### 6. Enable public edge caching with explicit freshness

Implement the route cache policy and provider header mapping described above. Default to no-store and opt public routes in. Test CDN behavior on actual deployments; local handler tests cannot establish CDN cache-key or revalidation behavior.

Acceptance: first miss, subsequent hit, stale serving/revalidation, expired miss, query variations, privacy separation, and deployment invalidation are observed using `x-vercel-cache` or Netlify `Cache-Status`. Verify that a cache hit causes no render invocation and that updated HTML references the matching deployment's client assets.

### 7. Measure latency and gate release on correctness under load

Record queue, worker startup, application loading, readiness, settling, serialization, cleanup, and total handler duration. Mark cold versus warm parent instances. Measure end-to-end TTFB externally; cached `Server-Timing` headers describe the original render, so use provider cache-status headers to classify each request.

Measure small public, data-heavy public, and private pages on both providers, with cold misses, warm misses, edge hits, stale hits, and Netlify durable hits separated. Report p50/p95/p99, sample count, client/function/data regions, concurrency, response size, peak memory, failure rate, and cache hit rate. Include browser LCP and hydration checks.

Set numeric release budgets from these measurements and the application's needs. Do not publish the illustrative numbers above as benchmarks. Optimize the measured bottleneck: server-only entry size, unnecessary registrations, data round trips, settling, or worker startup. Reuse workers only if lifecycle correctness remains demonstrable.

### 8. Defer larger features until evidence justifies them

Optional follow-ups are reusable render realms, route-specific component bundles, targeted cache purge hooks, and controlled response/data caching. Streaming, edge-runtime rendering, direct HTML rendering without Happy DOM, and a new component lifecycle are larger projects, not prerequisites for the first buffered Node release.

## Related documentation and evidence

- [Current source layout](../architecture/source-layout.md)
- [SSG build performance audit and implemented optimizations](ssg-build-performance-audit.md)
- [Initial route hydration roadmap](initial-route-hydration-roadmap.md)
- [Dota Wrap SSR and Vite composition](../../dota-wrap/configuration/ssr-and-vite-plugin-composition.md)
- [Hydration and SSR lifecycle audit](../../../../standards/audits/hydration-ssr-lifecycle-consistency-audit.md)

Provider behavior checked against official documentation on 14 September 2026; limits and plan behavior must be rechecked during deployment:

- [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel Fluid compute and instance concurrency](https://vercel.com/docs/fluid-compute)
- [Vercel CDN cache, eligibility, and targeted headers](https://vercel.com/docs/caching/cdn-cache)
- [Vercel cache-control and stale-while-revalidate](https://vercel.com/docs/caching/cache-control-headers)
- [Vercel function limits](https://vercel.com/docs/functions/limitations)
- [Netlify Functions](https://docs.netlify.com/build/functions/overview/)
- [Netlify caching, durable cache, variations, and invalidation](https://docs.netlify.com/build/caching/caching-overview/)
