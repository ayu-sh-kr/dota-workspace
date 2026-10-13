# Dota DOM benchmark — 13 October 2026

LinkeDOM is promising for Dota's renderer. The Rust-backed domparser-rs package is fast for HTML processing but does not provide the browser/custom-element runtime needed by Dota. No full application SSG replacement or build-speed claim is established by this benchmark.

## Environment and versions

- Node.js 24.19.0, Linux x64, same shared execution environment for every engine.
- Happy DOM 20.10.6; LinkeDOM 0.18.13; domparser-rs 0.1.1 (native Rust Node addon).
- Dota renderer built from dota-workspace PR #123, based on master 935193a.
- No network requests or disk reads inside timed operations; fixture files loaded before timing.
- Engines run in separate processes sequentially. Memory numbers include the Node process, imports, fixtures and garbage collector behavior; they are not standalone DOM allocation figures.

## Static DOM workload

19 generated Dota pages, 1,486,590 input bytes. Two warmup rounds and ten measured rounds per engine. Each round parses every page, runs five selectors, creates/updates/removes 100 span elements per page, sets an attribute on the route host, and serializes documentElement.outerHTML. Happy DOM uses a fresh Window with resource loading disabled and document.write, matching the existing renderer's setup style. LinkeDOM uses parseHTML; Rust uses DOMParser.parseFromString. Window cleanup is outside the timed stage totals.

Median milliseconds per complete 19-page batch:

| Engine | Parse/setup | Queries | Mutations | Serialization | Combined |
|---|---:|---:|---:|---:|---:|
| Happy DOM | 193.56 | 17.47 | 27.34 | 21.62 | 258.84 |
| LinkeDOM | 82.50 | 11.69 | 6.15 | 15.72 | 115.84 |
| domparser-rs | 36.87 | 3.62 | 8.29 | 25.97 | 74.94 |

Each column is an independent median, so the column medians need not sum to the median combined time.

LinkeDOM's combined median is 2.23 times faster than Happy DOM for this workload. domparser-rs is 3.45 times faster, but returns different selector counts on six pages. It does not expose template.content; a minimal HTML template probe also loses its contents during serialization. These differences invalidate treating its timing as equivalent browser DOM behavior. LinkeDOM matches all measured selector counts, which is a limited check, not full HTML/output equivalence.

Peak process RSS: Happy DOM 206.9 MiB; LinkeDOM 180.0 MiB; domparser-rs 211.9 MiB. Do not interpret these as memory required by an initialized Dota application.

## Persistent Dota renderer workload

Uses Dota's real render(), html tagged templates, and session.update(). The renderer module and DOM environment are initialized once. Each round renders 19 fixed-shape synthetic route views, each containing a heading and 100 dynamic list rows/links; after the first mount, subsequent views update the same session. Every output is serialized and checked for the correct final item and 100 rows. This is a rendering microbenchmark, not Dota Web's router, data loaders, Markdown processing, service lifecycle or full application build.

Two warmups, ten measured rounds. A second process run reverses engine order:

| Engine | First run, render + serialization | Repeat, reversed order |
|---|---:|---:|
| Happy DOM | 47.15 ms | 42.31 ms |
| LinkeDOM | 13.28 ms | 15.37 ms |
| domparser-rs | Cannot execute Dota renderer | Not applicable |

LinkeDOM is approximately 2.75–3.55 times faster for the combined workload. Its serialization alone is slower here; the saving comes from rendering/patching. Both Happy DOM and LinkeDOM pass the basic custom-element connect/disconnect probe and Dota render/patch check. LinkeDOM needs its exported NodeFilter wired into globals. It does not supply location, history, getComputedStyle or XMLSerializer on the tested window; application integration needs an adapter and route-specific async completion handling.

Rust cannot run the Dota template renderer because template.content is unavailable. It also exposes no customElements, HTMLElement or browser window. Benchmarking a parser does not benchmark a Rust browser such as Servo/OxiBrowser.

## Interpretation

Do not multiply the previously measured 6.24-second SSG build by these speedup ratios. Those builds include Vite transformation, module evaluation, application startup and network work. Static DOM operations here save roughly 143 ms per 19-page batch. The synthetic persistent renderer saves tens of milliseconds. A full integration benchmark is necessary to quantify the application's actual benefit.

Recommended next experiment: a LinkeDOM adapter for an explicit persistent application lifecycle, then all 19 real routes with completion barriers and checks for page text, SEO, asset references, hydration markers, lifecycle and cross-route state. Happy DOM should remain the correctness baseline until that passes.

## Reproduce

```sh
npm ci
node --expose-gc benchmark.mjs
node --expose-gc compatibility.mjs happy-dom
node --expose-gc compatibility.mjs linkedom
node compatibility.mjs domparser-rs
```

The companion benchmark archive provided with the review includes the exact fixture HTML and built Dota renderer used by the tests, plus package-lock.json, individual round results and capability/error outputs. The Dota renderer copy is only a benchmark fixture; no application source or PR changes were made for this experiment.

Primary project documentation:

- https://github.com/WebReflection/linkedom
- https://github.com/capricorn86/happy-dom
- https://github.com/utooland/domparser-rs

