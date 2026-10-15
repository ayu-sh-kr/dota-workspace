# dota-core review and benchmark — 15 October 2026

Reviews `BaseElement`, the decorators, and the metadata helpers in `dota-core` for API-level cost
and for code that does the wrong thing. It measures `master` at `efdb1c8` against the changes on
`fix/core-lifecycle-overhead` in three settings: a lifecycle micro-benchmark, Dota Web, and
Webingo.

**Result.** The branch removes `reflect-metadata` from every per-instance path and stops
re-mounting moved elements. Component mount and property sets are 22–32% faster, reconnecting a
moved element is 37% faster, and teardown is 31% faster. In both applications the change is
within run-to-run noise. dota-core's lifecycle code is about 2% of their JavaScript time, which
is dominated by rendering, layout, and application code.

## Method

- Linux x64 shared cloud container, Chromium 141 (Playwright), Node.js 22.
- Every package was built from this workspace. Baseline and branch differ only in
  `packages/libs/dota-core/dist`. Webingo (`dota-wrap-template`) was linked to the workspace
  `dota-wrap`, `dota-ui`, and `dota-md` through pnpm overrides, so both variants share every
  other library.
- **Micro-benchmark.** One page mounts 2,000 light-DOM `b-card` elements (three `@Property`,
  one `@State`, `@Watcher`, `@BindEvent`, `@HostListener`, and `@Element`) and 2,000 `b-plain`
  elements (one `@Property`). It then runs 40,000 property sets, 10 rounds of attribute changes
  and clicks, 5 detach/re-attach cycles of all 4,000 elements, and a teardown. Results are
  medians of 9 fresh pages. The *static* variant makes `render()` return a constant string, which
  isolates dota-core from `dota-rendering`'s `innerHTML` cost.
- **Applications.** `build:ssg` output of each application, served locally. Each run uses a
  412×823 viewport and 4× CPU throttling, with third-party requests stubbed. A run loads the first
  route and waits for `Application initialized.`, then navigates through the remaining routes on
  the client. 12 runs per variant, interleaved ABAB.
  - Dota Web: `/`, `/docs/core`, `/blogs`, `/docs/life-cycle`, `/`.
  - Webingo: `/`, `/work`, `/pricing`, `/blog`, `/start`, `/`.

## Findings

### Fixed on this branch

1. **Instance code read and wrote decorator metadata through `fetchOrCreate`.** Every connect,
   disconnect, attribute change, and reactive property set did one or more `reflect-metadata`
   lookups. Each lookup builds a `ClassName:suffix` key and walks the prototype chain. When a
   component had no metadata of a kind, the lookup also *defined* a new empty `Map` on the
   instance. About 12 of these ran per connect, plus one `Watcher:<prop>` map per property set.
   Profiling attributed 15% of the micro-benchmark's CPU time to `reflect-metadata`. The new
   `HelperUtils.readMetadata` memoises lookups per prototype and returns a shared empty map;
   decorators still register through `fetchOrCreate`.
2. **Moving an element re-rendered it from scratch.** `disconnectedCallback` disposed the
   render instance, so re-attaching a node re-ran the full mount. That replaced the whole
   subtree, which reconnected every descendant component and lost input values, focus, and
   scroll position inside the component. Reconnection now updates the retained render instance,
   which is a no-op when the output did not change.
3. **`@EventListener` never removed its listeners.** It added `method.bind(this)` and then
   removed a *new* `method.bind(this)`, which never matches. Window listeners leaked for every
   disconnected instance and fired on detached elements, and host listeners stacked on each
   reconnect. The decorator now keeps one bound handler per instance.
4. `bindParameters` constructed `URLSearchParams` on every connect, including components without
   `@Param`.

### Recommended, not changed

These are real problems. They either change public behaviour or did not show up in the
measurements, so they need a separate decision.

- **Metadata keys use `constructor.name`.** Decorators on a base class are invisible to a
  subclass with a different name. The subclass looks up `Sub:Property`, while the base
  registered `Base:Property`. `@Property` also pushes onto the inherited `observedAttributes`
  array, mutating the parent class. Keying metadata by a symbol per kind and merging along the
  prototype chain once per class would fix both.
- **`unbindWatchers` clears class metadata.** `fetchOrCreate` returns the prototype's map, so
  `watchers.clear()` removes the watchers for every instance of the class.
- **`@BindEvent` matches outside the component.** The delegated listener walks the whole
  `composedPath()`, so an ancestor *outside* the component that matches the selector triggers
  the handler. The walk should stop at the component root.
- **Connect allocates eleven promises.** Every `bind*`/`unbind*` method is `async` even though
  the work is synchronous, and `Promise.all` waits on them. A thrown binding error therefore
  becomes an unhandled-rejection log instead of a failed connect. The profile puts this below 5%
  of connect time; making the methods synchronous would be clearer, but it changes when
  `CONNECTED` and `@AfterInit` run, so it was left alone.
- **Every instance builds an `EventChannel` and two bind managers in its constructor.** It also
  emits `CONSTRUCTED` through a template-string event name, even when nothing subscribes.
  Allocating them lazily on first subscription would reduce per-instance memory.
- **`@Component` stores a list of every prototype method** under `Reflect.defineMetadata(target.name, …)`,
  and a `ClassName:shadow` key. Nothing in the workspace reads either.

## Micro-benchmark

Milliseconds, median of 9. *Real* renders the component templates; *static* isolates dota-core.

| Scenario | Real: master | Real: branch | Δ | Static: master | Static: branch | Δ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mount 2,000 cards (sync) | 118.3 | 91.0 | −23% | 121.9 | 79.1 | −35% |
| Mount 2,000 plain | 67.0 | 50.6 | −24% | 78.5 | 50.9 | −35% |
| 40,000 property sets (sync) | 116.7 | 87.2 | −25% | 113.6 | 79.8 | −30% |
| 40,000 property sets, settled | 236.5 | 230.5 | −3% | 139.3 | 97.6 | −30% |
| 10 attribute-change rounds | 1,234 | 1,173 | −5% | 124.5 | 85.0 | −32% |
| 10 click rounds | 1,341 | 1,334 | −1% | 170.4 | 142.5 | −16% |
| 5 detach/re-attach cycles | 1,232 | 776 | **−37%** | 1,057 | 566 | **−46%** |
| Teardown | 50.0 | 34.7 | −31% | 45.8 | 30.1 | −34% |

Run-to-run spread is about ±10%. The real-render update rows are dominated by `innerHTML` in
`dota-rendering`'s legacy string strategy (`writeHTML`, 18% of CPU time), so a core-only change
cannot move them much. Applying only the metadata change (without reconnect reuse) gave mount
−25–30%, property sets −31%, and reconnect −17%.

## Applications

Median of 12 interleaved runs, 4× CPU throttling. p17–p83 shows the spread of each variant.

### Dota Web

| Metric | master | branch | Δ | master p17–p83 | branch p17–p83 |
| --- | ---: | ---: | ---: | --- | --- |
| Ready (ms) | 1,008 | 971 | −3.7% | 960–1,066 | 914–1,059 |
| Load task time (ms) | 1,287 | 1,224 | −4.9% | 1,202–1,387 | 1,139–1,326 |
| TBT (ms) | 705 | 690 | −2.1% | | |
| Navigation script time (ms) | 776 | 777 | 0.1% | 751–815 | 736–823 |
| JS heap (MB) | 18.6 | 17.7 | −4.9% | | |

### Webingo

| Metric | master | branch | Δ | master p17–p83 | branch p17–p83 |
| --- | ---: | ---: | ---: | --- | --- |
| Ready (ms) | 1,025 | 1,019 | −0.6% | 947–1,084 | 969–1,077 |
| Load task time (ms) | 1,434 | 1,475 | 2.9% | 1,372–1,538 | 1,399–1,577 |
| TBT (ms) | 546 | 563 | 3.1% | | |
| Navigation script time (ms) | 706 | 720 | 2.0% | 658–728 | 644–743 |
| JS heap (MB) | 18.6 | 18.2 | −2.0% | | |

Every application delta lies inside the overlapping p17–p83 ranges, so neither application shows
a measurable change in either direction. A CPU profile of a Dota Web load and navigation
explains why. Of 441 ms of JavaScript self time, `connectedCallback`, `bindHTML`, and
`fetchOrCreate` total about 7 ms, and layout and style account for another 1,100 ms. Both
applications use few components per page and rarely move elements, so dota-core is not their
bottleneck. The branch is still worth taking for the three behaviour fixes and for pages with
many components or reordered lists. Neither application regressed.

### Where the application time goes

These are outside dota-core; they are recorded here because the profile surfaced them.

- Dota Web's home page spends the most JavaScript time in `OurToolsComponent.updateProgress`
  (72 ms of 441 ms). It interleaves `getBoundingClientRect()` and `style.setProperty()` for each
  chapter, forcing a synchronous layout per chapter. Reading every rectangle first and writing
  afterwards would avoid the repeated layouts.
- String `render()` output is committed with `innerHTML`, so each update rebuilds the subtree.
  Moving hot components to `html` templates, which update only their changed parts, is the
  largest remaining rendering win.
