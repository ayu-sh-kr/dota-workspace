# BaseElement performance follow-up

**Status:** Findings and proposed changes; no implementation in this document  
**Reviewed:** 2026-08-05  
**Primary source:** [`BaseElement`](../../../../../packages/libs/dota-core/src/core/elements/base-elements.ts)

## Conclusion

The project skills used for the P2–P6 work did not force the current runtime to become
slower. They guided readability, responsibility boundaries, testing, and documentation.
The batching scheduler, reflected-attribute fast path, and removal of repeated method
binding were implementation decisions supported by browser measurements, not requirements
imposed by those skills.

There are two important qualifications:

1. Microtask batching trades a small queueing cost and deferred visibility for a single,
   isolated mutation in exchange for removing redundant renders when mutations occur
   together. The existing benchmark proves the grouped-update gain, but does not yet
   measure the isolated-mutation cost.
2. The clean-code skill currently recommends `map(...).join("")` as a general list-rendering
   style. That expression creates an intermediate array and can be slower or more
   allocation-heavy than a direct loop in a large rendering hot path. `BaseElement` does
   not use this rule, so it did not cause the costs identified here. The rule should be
   treated as a readability default with a benchmark exception for proven hot paths.

The largest remaining cost is still full `innerHTML` replacement. That behavior was kept
because diffing and hydration were explicitly outside the P2–P6 implementation scope, not
because a skill required it. Several smaller costs can be removed before diffing is added.

## How the skills affected the design

| Skill guidance | Effect on the current implementation | Performance assessment |
| --- | --- | --- |
| Keep `render()` pure | Rendering remains deterministic and side-effect free | Positive: enables output comparison, memoization, and repeatable benchmarks |
| Avoid trivial one-use helpers | Did not remove `requestHTMLUpdate()` because it owns a scheduling invariant | Neutral: the boundary is justified and avoids duplicating scheduler policy |
| Preserve meaningful domain boundaries | Reflection policy remains in `PropertyUtils`; lifecycle policy remains in `BaseElement` | Positive: makes each hot path independently replaceable and testable |
| Prefer `map(...).join("")` for rendered lists | Not used by `BaseElement` | Potential future negative for large lists due to an intermediate array; benchmark before applying in hot paths |
| Feature documentation and placement rules | Put this package-owned proposal under `documentation/packages/libs/dota-core/planning` | No runtime effect |
| Modern web guidance search | Returned no guidance specific to custom-element scheduling or string rendering | No runtime decision was derived from it; the local skill also reported that its catalog revision should be updated |

The skills should not be treated as an optimizer. Readable structure is a constraint on how
an optimization is expressed; measurements and observable contracts decide whether the
optimization should exist.

## Current costs that can be improved without diffing

### F1 — Synchronous work is wrapped in synthetic asynchronous APIs

Most connect, disconnect, and element-binding helpers are declared `async`, but none of
them awaits asynchronous work. Their bodies execute synchronously and then allocate
resolved promises. `connectedCallback()` collects ten such results in `Promise.all`,
`disconnectedCallback()` collects five, and every `updateHTML()` creates a promise through
`bindElements()` before attaching `.then()`.

The two application-event manager implementations have the same issue: their methods are
implemented as `async`, while `ClassApplicationEventBindManager` declares `bind()` and
`unbind()` as returning `void`. This mismatch caused the IDE warnings that were fixed by
calling the managers outside `Promise.all`. Their bodies are currently synchronous, but
the public type does not honestly describe the implementations.

Required change:

- Remove `async` from lifecycle helpers that do not await work and give them `void` return
  types.
- Make the event-manager interface and implementations agree. Because their current work
  is synchronous, prefer `void`; use `Promise<void>` only if the contract genuinely needs
  asynchronous implementations.
- Replace `Promise.all` with a straight-line setup and teardown pipeline.
- If `CONNECTED`, `DISCONNECTED`, or `DOM_UPDATED` must retain their current microtask
  boundary, schedule that boundary once with `queueMicrotask` instead of manufacturing a
  promise per helper.
- Add ordering and reconnect-race tests before changing lifecycle timing.

This applies the **pay-for-play principle**, **YAGNI**, and an **honest interface contract**:
synchronous operations should not pay for or advertise asynchronous behavior.

### F2 — Metadata queries create state when nothing is decorated

`HelperUtils.fetchOrCreate()` is used both by decorators that register metadata and by
runtime code that only wants to read it. A read for a missing decorator category creates
and stores an empty `Map`. A component connection queries `Before`, `After`, `Property`,
`Param`, `State`, `Element`, `Bind`, `Exposed`, `Output`, `Host`, `Window`, and `Document`,
so undecorated features still perform key creation, reflection lookup, and possibly empty
map allocation.

`bindParameters()` also constructs `URLSearchParams` before it knows whether parameter
metadata exists. Since `fetchOrCreate()` always returns a map, its current truthiness check
does not avoid that work.

Required change:

- Split registration from lookup: keep `fetchOrCreateMetadata()` for decorators and add a
  non-mutating `getMetadata()` for runtime readers.
- Return `undefined` or a shared immutable empty view for absent runtime metadata.
- In `bindParameters()`, return before constructing `URLSearchParams` when there are no
  parameter bindings.
- Prefer compiling all immutable decorator metadata once per component constructor, as
  described in F3.

This applies **Command–Query Separation**: asking for metadata must not create metadata.

### F3 — Every instance repeatedly interprets immutable decorator metadata

Decorator metadata is effectively a class-level description, but each component instance
reconstructs runtime details from it. `bindElements()` rebuilds selector strings on every
render, and connect/disconnect paths repeatedly resolve the same event and property maps.

Required change:

- Build a `ComponentExecutionPlan` once per component constructor and cache it in a
  `WeakMap`.
- Precompute `@Element` selector strings, event names, method names, property backing keys,
  and whether each optional lifecycle phase has work.
- Keep instance-specific values—nodes, listener functions, backing values, and event
  channels—out of the shared plan.
- Define invalidation behavior for development hot reload before caching is enabled there.

This is the **Flyweight pattern** combined with **memoization**. Immutable class metadata is
shared; mutable instance state remains isolated.

### F4 — Delegation uses one root listener per binding

`bindMethods()` correctly delegates from a stable root, but it registers a separate root
listener for every event/selector/method tuple. When several bindings use `click`, the
browser dispatches the same event to several listeners, and each listener requests and
walks `composedPath()` independently.

Required change:

- Compile bindings into a registry grouped by event name.
- Register one root listener per event name.
- Compute `composedPath()` once, then dispatch matching registry entries in declaration
  order.
- Preserve the existing behavior for shadow/slot paths, multiple matching bindings,
  disconnect/reconnect, and method overrides.

This extends the existing **Event Delegation pattern** with a **Dispatcher/Registry**.
Listener count becomes proportional to unique event names rather than decorated methods.

### F5 — State-only renders allocate an attribute-change copy

`updateHTML()` always calls `__pendingAttributeChanges.splice(0)`. Even when a render was
caused only by `@State`, that call creates an empty result array. Attribute changes also
allocate one record object per mutation because the lifecycle contract preserves every
ordered change.

Required change:

- Make the pending queue lazy: `PendingAttributeChange[] | undefined`.
- Allocate it only when an initialized component receives an attribute change.
- Detach the current queue at flush time and clear the field before emitting events so a
  re-entrant change enters the next batch safely.
- Do not coalesce records by attribute name unless the public lifecycle contract is
  intentionally changed; current tests require every real change in order.

This uses **Lazy Initialization** and a **drain-buffer pattern** while preserving re-entrant
correctness.

### F6 — Identical render output still replaces the DOM

Batching prevents duplicate renders within one task, but a changed state value can still
produce the same HTML. The framework then parses and replaces the complete subtree even
though the output is identical.

Required change:

- Cache the last committed render string.
- Compute `nextHTML` once and skip `innerHTML` plus `bindElements()` when it equals the
  committed string.
- Decide the lifecycle contract before implementation: `ATTRIBUTE_CHANGED` records may
  still need flushing, while `DOM_UPDATED` should either mean “a DOM mutation occurred” or
  be replaced/supplemented by an “update settled” event.
- Benchmark memory as well as time because retaining the previous HTML string trades
  memory for avoided parsing and node construction.

This applies **memoization**, **idempotence**, and a **guard clause**. It is the most direct
remaining optimization that avoids DOM diffing.

### F7 — Microtask batching is not optimal for every workload

`requestHTMLUpdate()` is a **Unit of Work**: several mutations share one commit. That is
why the measured three-mutation fixtures reduced render count by 66.7%. For a workload
where every task changes exactly one value, batching cannot remove a render and adds a
microtask plus delayed DOM visibility.

Required change:

- Add a single-mutation fixture before changing the scheduler.
- Keep `updateHTML()` as the immediate escape hatch.
- If isolated updates are a demonstrated bottleneck, consider an explicit
  `batchUpdates(() => ...)` transaction API rather than an adaptive scheduler whose timing
  is difficult to predict.
- Do not move to `requestAnimationFrame` without a separate contract decision; it changes
  visibility timing and background-tab behavior.

The relevant patterns are **Unit of Work** and an optional **Transaction API**. Predictable
timing is more important than saving one microtask based on an unproven heuristic.

### F8 — Full replacement remains the dominant ceiling

Even after F1–F7, a changed render string still causes complete `innerHTML` replacement
and all `@Element` queries. This cost scales with the entire subtree and cannot be removed
by code-cleanup rules.

The eventual design should introduce a `Renderer` strategy:

```text
BaseElement lifecycle
  -> Renderer.commit(renderResult)
       -> StringReplacementRenderer   (current compatibility mode)
       -> IncrementalRenderer         (future diff/patch mode)
       -> HydrationRenderer           (future adoption mode)
```

The **Strategy pattern** keeps lifecycle, scheduling, rendering, and hydration separate.
The **Open/Closed Principle** then allows a new renderer without repeatedly rewriting
`BaseElement`. A structured template result or stable markers are still prerequisites for
efficient diffing and hydration.

## Recommended implementation order

| Priority | Change | Diffing required | Risk | Expected source-level result |
| --- | --- | --- | --- | --- |
| 1 | Make lifecycle binding contracts genuinely synchronous | No | Low–medium because event timing is observable | Remove per-helper promises and `Promise.all` chains |
| 2 | Split metadata reads from metadata creation | No | Low | No empty metadata maps created by runtime reads |
| 3 | Skip `URLSearchParams` when no `@Param` exists | No | Low | No location parsing for unrelated components |
| 4 | Lazily allocate the attribute-change drain buffer | No | Low | No queue-copy allocation for state-only renders |
| 5 | Cache a constructor-level `ComponentExecutionPlan` | No | Medium | Metadata and selectors compiled once per component class |
| 6 | Use one delegated listener per root/event name | No | Medium | Fewer listeners and one composed-path read per event |
| 7 | Skip identical committed HTML | No | Medium because lifecycle semantics need a decision | Avoid DOM replacement and element queries for no-op output |
| 8 | Introduce the renderer strategy and structured templates | Yes for incremental rendering | High | Cost scales with changed dynamic regions rather than the full subtree |

F1–F7 should be separate changes with separate operation-count evidence. Combining them
would make regressions and benchmark attribution difficult.

## Benchmark and acceptance plan

The current browser benchmark covers grouped state and property updates. Extend it before
implementing this follow-up:

1. **Connection fixture:** create and connect many undecorated, lightly decorated, and
   fully decorated elements. Measure median and p95 connection/disconnection time.
2. **Single-mutation fixture:** one state or property change per task. Compare scheduling
   overhead and time until DOM visibility.
3. **No-op-output fixture:** change internal values while keeping rendered HTML identical.
   Count DOM replacements and `bindElements()` calls.
4. **Delegation fixture:** dispatch one event with 1, 10, and 50 bindings sharing the same
   event type. Count root listeners, `composedPath()` calls, selector checks, and handlers.
5. **Metadata fixture:** count metadata maps created for an undecorated element and verify
   that repeated instances reuse one compiled plan.
6. **Memory check:** compare retained size with and without cached HTML and execution plans.

Stable operation-count targets are more useful than machine-specific milliseconds:

- zero promises created solely by synchronous lifecycle helpers;
- zero empty metadata maps created by runtime lookup;
- zero `URLSearchParams` objects without `@Param` metadata;
- zero attribute-queue arrays for state-only batches;
- one delegated listener per root and unique event name;
- selector strings compiled once per component constructor;
- zero DOM replacements when identical-output skipping is enabled and approved.

All existing Dota Core and Dota UI tests must remain green. Add explicit tests for event
timing, re-entrant attribute events, reconnect behavior, inherited decorator metadata, hot
reload invalidation, and identical-output lifecycle semantics.

## Skill changes recommended

No performance-specific skill should override measurements or public behavior. Two small
wording changes would make the project guidance safer:

1. Amend the clean-code list-rendering rule to say that `map(...).join("")` is the default
   for readability, while allocation-sensitive rendering hot paths may use a direct loop
   when a representative benchmark proves the benefit.
2. Add a general rule that `async` is a behavior contract, not a way to make synchronous
   code “non-blocking.” A function with no asynchronous operation should return `void`;
   one deliberate scheduler boundary should be used when deferred notification is part of
   the lifecycle contract.

These changes preserve the skills' readability intent while applying the
**measure-don't-guess principle** to runtime-sensitive code.

## Related documentation

- [Rendering, hydration, and patching architecture roadmap](./dota-core-rendering-hydration-architecture-roadmap.md)
- [P2–P6 rendering implementation report](./base-element-p2-p6-rendering-improvement-plan.md)
- [Startup rendering and viewport deferral plan](./base-element-startup-render-deferral-plan.md)
- [Original rendering and hydration audit](../../../../standards/audits/dota-core-base-element-rendering-hydration-audit.md)
- [`PropertyUtils` reflection and reactive binding](../../../../../packages/libs/dota-core/src/core/utils/PropertyUtils.ts)
- [`HelperUtils` metadata access](../../../../../packages/libs/dota-core/src/core/utils/HelperUtils.ts)
- [Project clean-code skill](../../../../../.agents/skills/code/clean-code/SKILL.md)
