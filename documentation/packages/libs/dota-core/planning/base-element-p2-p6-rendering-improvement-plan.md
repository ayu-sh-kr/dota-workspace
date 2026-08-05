# `BaseElement` P2–P6 rendering implementation report

This document records the implemented no-diffing improvement pass for `BaseElement`.
It covers P2, P3, the safe portion of P4, and P6 from the rendering and hydration
audit, including the approved design, compatibility constraints, tests, and actual
before-and-after browser measurements.

**Status:** implemented and validated

**Baseline:** `fix/core-performance` at `9c19dc0`; implementation applied to its working tree

**Measured:** 2026-08-05

**Related audit:** [BaseElement rendering performance and hydration audit](../../../../standards/audits/dota-core-base-element-rendering-hydration-audit.md)

## Implementation summary

| Finding | Implemented change | Requires DOM diffing? | Verified result |
| --- | --- | --- | --- |
| P2, synchronous rendering for every mutation | Add a microtask update scheduler used by reactive setters; keep explicit `updateHTML()` as an immediate flush | No | N synchronous mutations in one task produce one render |
| P3, property-to-attribute-to-property round trip | Mark framework reflections, update the backing value directly from external attributes, and schedule rendering from the originating reactive path | No | No sanitize/setter re-entry for an internally reflected property |
| P4, repeated binding work | Bind delegated method listeners only on connect; continue refreshing `@Element` references after every actual DOM replacement | Partially | Removes redundant metadata scans without leaving detached `@Element` references |
| P6, falsy interpolation | Change the `HTML` tag fallback from `||` to `??` and add focused tests | No | `0`, `false`, and `NaN` render predictably |

P4 cannot be completed without node preservation. `innerHTML` still destroys every
descendant, so every `@Element` reference must still be queried after a render. Only
the delegated method scan is safe to remove now because its listener root is the host
or the shadow root, neither of which is replaced by `updateHTML()`.

P6 is independent of diffing. The `HTML` tag is currently used by at least 42 render
return sites across `dota-web` and `dota-ui`, so the falsy-value fix has immediate
value even if a structured template renderer is introduced later.

## Baseline behavior and constraints

The implementation is based on
[`base-elements.ts`](../../../../../packages/libs/dota-core/src/core/elements/base-elements.ts),
[`PropertyUtils.ts`](../../../../../packages/libs/dota-core/src/core/utils/PropertyUtils.ts),
and [`html.render.ts`](../../../../../packages/libs/dota-core/src/core/render/html.render.ts).

### Update flow before this change

```text
@State assignment
  -> updateHTML()
  -> render + innerHTML replacement
  -> bindMethods + bindElements

@Property assignment
  -> serialize + setAttribute
  -> attributeChangedCallback
  -> sanitize + reactive setter re-entry
  -> updateHTML()
  -> render + innerHTML replacement
  -> bindMethods + bindElements
  -> ATTRIBUTE_CHANGED
```

Three synchronous changes therefore perform three complete DOM replacements. The
property path performed only one render per assignment, but it reached that render
through attribute serialization, the custom-element callback, sanitization, and setter
re-entry.

There is also an inaccurate implementation comment in `PropertyUtils.bindReactive`:
calling `HTMLElement.prototype.setAttribute` does not bypass custom-element reactions.
An observed attribute still invokes `attributeChangedCallback`; using the prototype
only bypasses the class's TypeScript override.

### Compatibility constraints discovered in consumers

`ATTRIBUTE_CHANGED` is not only informational. Components such as the modal, popover,
and icon use it to inspect or modify the newly rendered DOM. The current order is:

```text
DOM replacement -> ATTRIBUTE_CHANGED -> DOM_UPDATED
```

Batching must preserve that observable order. If `ATTRIBUTE_CHANGED` were emitted
immediately while the DOM update waited for a microtask, these consumers would inspect
stale nodes.

Explicit `updateHTML()` is also used by application and UI components. The safe
compatibility choice is to keep direct calls immediate. Only framework reactive paths
now call the scheduler. If an explicit call occurs while an update is pending, it
consumes that pending update so the queued microtask does not render again.

## Implemented runtime design

### P2: one scheduler, with an immediate compatibility flush

`BaseElement` now keeps private scheduling state:

```ts
private __updateScheduled = false;
private __pendingAttributeChanges: AttributeChange[] = [];
```

The private `requestHTMLUpdate` method distinguishes a reactive request from the
existing immediate method.

```ts
private requestHTMLUpdate(): void {
  if (!this.__initialized || this.__updateScheduled) return;

  this.__updateScheduled = true;
  queueMicrotask(() => {
    if (!this.__updateScheduled) return;
    this.updateHTML();
  });
}
```

`updateHTML()` remains public and immediate. At its start it clears
`__updateScheduled`, which gives it two valid entry modes:

- a scheduled microtask performs one immediate flush;
- a consumer's explicit call performs the flush now and invalidates the queued callback.

The `@State` setter and `@Property` setter call `requestHTMLUpdate()` after a real value
change. Watchers remain synchronous and run once per value change; only rendering is
deferred.

Use `queueMicrotask`, not `requestAnimationFrame`, for this pass. A microtask preserves
same-turn state convergence and updates before the next paint while still collapsing
synchronous changes. Moving updates to animation frames would introduce a larger timing
change and would pause more aggressively in background documents.

On disconnect, clear both scheduling state and queued attribute changes. A microtask
that runs after disconnect must be a no-op and must not leak lifecycle events into a
later reconnection.

### P3: distinguish internal reflection from external attributes

Attribute reflection itself remains part of the `@Property` contract. The improvement
is to identify why an attribute changed and avoid routing an internal reflection back
through property parsing.

Keep reflection state internal to `PropertyUtils`, preferably in a `WeakMap` keyed by
the element so it cannot collide with component fields:

```ts
private static readonly reflectingAttributes =
  new WeakMap<BaseElement, Set<string>>();

static reflectAttribute(
  element: BaseElement,
  name: string,
  value: string,
): void {
  const reflecting = this.getReflectingAttributes(element);
  reflecting.add(name);
  try {
    HTMLElement.prototype.setAttribute.call(element, name, value);
  } finally {
    reflecting.delete(name);
  }
}
```

The resulting paths are:

```text
JavaScript property assignment
  -> compare and store backing value
  -> serialize and reflect attribute under an internal marker
  -> attribute callback records lifecycle details only
  -> run watcher
  -> request one render

External setAttribute
  -> attribute callback detects no internal marker
  -> sanitize and update the backing value directly
  -> run watcher when the semantic value changed
  -> record lifecycle details
  -> request one render
```

Updating the backing value directly for an external attribute replaces the former
`bindProperty()` setter re-entry. `PropertyUtils.bindAttribute` owns metadata lookup,
sanitization, equivalence checking, and storage selection. It returns the changed
property name so `BaseElement` can schedule before invoking its watcher; an explicit
`updateHTML()` inside that watcher therefore consumes the pending batch.

The native custom-element callback cannot be removed: the browser invokes it for every
observed attribute write. P3 makes the internally reflected callback a fast path; it
does not pretend the callback can be bypassed.

### Preserve lifecycle ordering while batching

`attributeChangedCallback` appends each real change to
`__pendingAttributeChanges` rather than emit immediately. The next actual
`updateHTML()` performs work in this order:

1. Clear the scheduled flag.
2. Render once and replace `innerHTML` on the light or shadow root.
3. Refresh `@Element` references.
4. Emit all queued `ATTRIBUTE_CHANGED` records in original call order.
5. Emit one `DOM_UPDATED` event after binding completes.

This preserves the important DOM-before-attribute-event relationship and the existing
attribute-event-before-DOM-updated relationship. When several attributes change in one
task, listeners receive all change records but observe the final coalesced DOM. That is
an intentional batching semantic and must be documented in the release note.

Initial framework reflection during `connectedCallback` uses the same internal
marker and does not enqueue `ATTRIBUTE_CHANGED` while `__initialized` is false. It is
initial state seeding, not a runtime change. External attributes already present before
connection remain the highest-precedence input when `bindReactive` reads initial state.

### P4: remove only the work that is safe without diffing

Delete the `bindMethods()` call from `updateHTML()`. `bindMethods()` already delegates
from a stable root and uses `__delegatedBindListeners` to avoid duplicate listeners.
It runs on connect and is removed on disconnect, including every reconnect cycle.

`bindElements()` remains after every actual HTML replacement. Tests prove
that an `@Element` reference changes to the newly created node after a render. Removing
this query before diffing would leave a detached reference and is not an optimization.

No selector cache was added in this pass. Caching selector strings would save little
relative to DOM parsing and querying while adding invalidation state. Batching already
reduces `bindElements()` from N executions to one for N synchronous mutations.

### P6: correct falsy interpolation now

The complete source change is intentionally small:

```diff
- str += string + (values[i] || '');
+ str += string + (values[i] ?? '');
```

The resulting contract is:

| Interpolated value | Current output | Proposed output |
| --- | --- | --- |
| `0` | empty | `0` |
| `false` | empty | `false` |
| `NaN` | empty | `NaN` |
| `null` | empty | empty |
| `undefined` | empty | empty |
| `''` | empty | empty |

This is a correctness change, not a meaningful rendering-performance optimization.

## File-level changes

| File | Implemented changes |
| --- | --- |
| `src/core/elements/base-elements.ts` | Add scheduler and pending-attribute state; make reactive paths request an update; keep `updateHTML()` immediate; flush lifecycle events after DOM replacement; remove per-update `bindMethods`; clear pending work on disconnect |
| `src/core/utils/PropertyUtils.ts` | Added reflection-origin tracking, external-attribute binding, typed initial-value normalization, and pre-connect public-field preservation; property setters now request rendering directly |
| `src/core/render/html.render.ts` | Replace the falsy fallback with a nullish fallback and format the function consistently |
| `test/core/elements/base-element.test.ts` | Add batching, explicit-flush, lifecycle-order, disconnect, shadow-root, and property-reflection coverage; update tests that currently assert one event for every direct `updateHTML()` call only where reactive scheduling changes timing |
| `test/core/decorators/element.decorator.test.ts` | Preserve the assertion that `@Element` points to the replacement node after an update |
| `test/core/render/html.render.test.ts` | Add focused interpolation tests for `0`, `false`, `NaN`, empty string, `null`, and `undefined` |

No public render return type changes, template markers, DOM diffing, hydration APIs, or
new runtime dependencies are part of this implementation.

## Lifecycle guarantees after the change

| Situation | Render count | Lifecycle behavior |
| --- | --- | --- |
| Three state changes in one synchronous call stack | 1, in a microtask | One `DOM_UPDATED` after the final state is rendered |
| Three property changes in one synchronous call stack | 1, in a microtask | Three ordered `ATTRIBUTE_CHANGED` records, then one `DOM_UPDATED` |
| The same field receives an equivalent value | 0 | No watcher and no lifecycle render event |
| Two changes separated by a microtask | 2 | One render per settled batch |
| Explicit `updateHTML()` with no pending update | 1, immediately | Existing manual-flush behavior |
| Explicit `updateHTML()` after a reactive change in the same stack | 1, immediately | Queued callback is invalidated; no second render |
| Disconnect before a queued flush | 0 after disconnect | Pending render and attribute events are discarded |
| Reconnect and then change state | 1 | Delegated listeners are rebound once to the current stable root |

## Actual browser benchmark report

### Method

The baseline commit and implemented working tree were built independently and loaded
from their production ESM bundles in Firefox 152 on macOS. Each logical update applied
three synchronous mutations and then crossed the same two-microtask settlement boundary,
so both bundles were measured with identical scheduling overhead.

The state fixture rendered 400 list items, one delegated binding, and one `@Element`
binding. Each sample performed 120 logical updates. The reflected-property fixture
rendered 50 nodes and performed 500 logical updates. Eleven samples were collected per
fixture, and the full benchmark was repeated three times.

### Results

| Fixture | Baseline median | Implemented median | Improvement |
| --- | ---: | ---: | ---: |
| 400-node state updates | 52–54 ms | 18 ms | 65–67% less time; about 2.9–3x throughput |
| 50-node reflected-property updates | 55 ms | 23 ms | 58% less time; about 2.4x throughput |

Measured calls across the eleven samples confirm where the time went:

| Operation | Baseline | Implemented | Change |
| --- | ---: | ---: | ---: |
| State renders | 3,960 | 1,320 | -66.7% |
| State `bindElements` calls | 3,960 | 1,320 | -66.7% |
| State `bindMethods` calls | 3,960 | 0 | -100% |
| Reflected-property renders | 16,500 | 5,500 | -66.7% |
| Native attribute callbacks | 16,500 | 16,500 | unchanged |

This validates both P2 and the P3 boundary: the browser still invokes every observed
attribute callback, while the framework avoids property parsing and setter re-entry for
its own reflections. The render-count reduction follows `1 - 1/N`: 66.7% for the three
mutations measured here and 90% when ten synchronous mutations share a batch.

P6 also changed the measured interpolation output from `||||` to
`0|false|NaN||`, preserving only null and undefined as empty values.

The production ESM bundle changed from 72.65 kB / 16.37 kB gzip to
76.12 kB / 17.52 kB gzip. The pass adds no runtime dependency; its compressed bundle
cost is approximately 1.15 kB.

### What the benchmark does and does not establish

The evidence establishes the following boundaries:

- Multi-field synchronous updates improve in proportion to the collapsed renders.
- P3 removes avoidable parsing, metadata lookup, and setter re-entry, but the native
  attribute callback and serialization required for reflection remain.
- The safe P4 portion is small in this fixture and metadata-dependent. Its main benefit
  is removing provably redundant work, not a headline speedup.
- A single mutation in its own task still performs a full `innerHTML` replacement. Its
  performance, focus loss, scroll loss, and uncontrolled-input behavior remain bounded
  by P1/P5 and future diffing.
- P6 changes output correctness and is not included in the performance claim.

The timings remain synthetic and machine/browser-specific. Operation counts are the
stable result; wall-clock measurements are supporting evidence.

## Validation coverage

The implementation is covered by these cases:

1. Three synchronous `@State` assignments update the DOM only after the microtask and
   call `render()` once.
2. Three synchronous `@Property` assignments reflect all attributes, run each watcher
   once, render once, emit three ordered `ATTRIBUTE_CHANGED` events against the final DOM,
   and emit one `DOM_UPDATED`.
3. An external `setAttribute` sanitizes into the property once and does not reflect the
   same value back through the setter.
4. Object properties retain serialization-equivalence behavior and do not recurse.
5. A direct `updateHTML()` is synchronous and cancels a pending scheduled flush.
6. Changes separated by an awaited microtask render separately.
7. Disconnecting before the microtask prevents rendering and lifecycle emission; a later
   reconnect can schedule normally.
8. Light-DOM and shadow-DOM components follow identical scheduling behavior.
9. Delegated `@BindEvent` handlers work after repeated renders and after disconnect/
   reconnect without duplicate listeners.
10. `@Element` references point to the current replacement node after every actual render.
11. `HTML` returns `0`, `false`, and `NaN` as text while continuing to omit only `null`
    and `undefined`.
12. Existing `dota-core` tests, build, and package consumer tests pass.

Run at minimum:

```sh
pnpm --filter @ayu-sh-kr/dota-core test
pnpm --filter @ayu-sh-kr/dota-core build
pnpm --filter @ayu-sh-kr/dota-ui test
pnpm --filter @ayu-sh-kr/dota-md build
pnpm --filter dota-web build
```

Verified results:

- `dota-core`: 21 test files and 377 tests passed; production build passed.
- `dota-ui`: 20 test files and 94 tests passed.
- `dota-md`: type check and production library build passed.
- `dota-web`: type check and production application build passed.

## Implementation record

1. Added scheduler and lifecycle-order tests and confirmed their baseline failures.
2. Implemented `requestHTMLUpdate()` while preserving immediate explicit `updateHTML()`.
3. Added reflection-origin tracking and direct external-attribute binding in
   `PropertyUtils`.
4. Queued `ATTRIBUTE_CHANGED` records between DOM replacement and
   `DOM_UPDATED`.
5. Removed `bindMethods()` from the update path, retaining it on connect and retaining
   `bindElements()` after replacement.
6. Applied the P6 nullish interpolation fix and focused unit tests.
7. Ran core and consumer validation and compared actual production bundles in Firefox.

## Verified acceptance criteria

The no-diffing improvement pass is complete because:

- reactive changes in one task coalesce into one DOM replacement;
- explicit `updateHTML()` remains an immediate, single flush;
- internal property reflection does not sanitize or re-enter the property setter;
- external attributes still update typed properties and watchers;
- `ATTRIBUTE_CHANGED` consumers see the final rendered DOM and retain event order;
- delegated method listeners are not rescanned per update;
- `@Element` references are still refreshed after replacement;
- falsy interpolation follows the documented nullish contract;
- disconnect/reconnect behavior has no stale queued work or duplicate listeners;
- all core and affected consumer tests pass; and
- the actual implementation benchmark confirms the expected operation-count reduction.

## Deferred work

This implementation deliberately does not solve full subtree replacement, live-node state
preservation, structured template output, keyed updates, or hydration. Those remain the
P1/P5 and H1–H4 work. The scheduler and reflection-origin tracking are compatible with a
future diffing renderer, but they must not introduce template markers or hydration flags
prematurely.
