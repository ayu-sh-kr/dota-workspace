# History traversal API plan

This document records the implemented public API for moving one entry toward the older or newer side of the browser history stack. The source, tests, README, and release entry described by the plan are complete.

## Implementation status

Implemented on 2026-08-31. Package validation passed with `pnpm --filter @ayu-sh-kr/dota-router test` and `pnpm --filter @ayu-sh-kr/dota-router build`.

## Decision

Use the paired method names `back()` and `forth()`.

```ts
interface Router<T extends HTMLElement> {
  init(): void;
  route(path: string): void;
  back(): void;
  forth(): void;
}

interface RouterService<T extends Router<HTMLElement>> {
  init(): RouterService<T>;
  route(path: string): void;
  back(): void;
  forth(): void;
}
```

`Back` and `forth` are an established English directional pair and have similar lengths: four and five letters. `back()` moves to the preceding history entry; `forth()` moves to the succeeding entry. The public pair deliberately avoids mixing `back` with the sequence label `next`.

The alternatives were rejected for these reasons:

| Pair | Reason not selected |
| --- | --- |
| `back()` / `next()` | Mixes a direction with a sequence position. |
| `backward()` / `forward()` | Longer directional forms the proposed API is intended to avoid. |
| `previous()` / `next()` | Familiar labels, but uneven in length and less natural as command verbs. |
| `undo()` / `redo()` | Suggests reversing application state rather than traversing browser history. |
| `earlier()` / `later()` | Describes relative time more naturally than an action. |

## Baseline before implementation

`DotaRouterService` previously exposed only `init()` and `route(path)`. Its `route()` method delegated to the initialized router instance.

The adapters already react to browser-initiated history traversal:

- `DomHistoryRouter` listens for `popstate` and delegates the selected URL to `HistoryCoordinator` without committing another entry.
- `DomNavigationRouter` intercepts eligible `navigate` events, including browser history traversals, and delegates preparation and rendering to `NavigationCoordinator`.

The missing capability was a shared command API that let an application request those movements through either a router instance or `DotaRouterService`.

## Public contract

The implemented contract adds required `back(): void` and `forth(): void` methods to both `Router` and `RouterService` in `Types.ts`.

The methods request exactly one history-entry traversal:

- `back()` requests the immediately preceding entry.
- `forth()` requests the immediately succeeding entry.
- Neither method accepts a path, distance, or route options.
- Neither method creates a new history entry.
- Reaching the beginning or end of the available history is a no-op.
- The native browser event produced by the traversal must enter the selected adapter's coordinator pipeline; the command methods must not render or invoke hooks themselves.

Keep these as instance methods. Static traversal methods would bypass the router instance selected by `DotaRouterService` and would duplicate the existing static `route()` design that the package already treats as a compatibility surface.

The return type remains `void`, matching `route(path)`. The History API does not provide a portable completion promise, so exposing a promise only for the Navigation API adapter would make the common contract misleading. A future transition-result API can add observable completion consistently across both adapters.

## Coordinator processing contract

`back()` and `forth()` request browser traversal; they do not call a coordinator directly. The browser-selected destination is only known when the adapter receives `popstate` or `navigate`, so that event remains the authoritative transition input.

Both coordinators already calculate and execute a transition in this order:

```text
resolve destination URL and route match
  → build NavigationContext and branch delta
  → global beforeEach guards, in registration order
  → beforeLeave guards, deepest route first
  → beforeEnter guards, parent route first
  → browser commit boundary
  → render the approved route
  → record the destination as currentMatch
  → afterLeave hooks, deepest route first
  → afterEnter hooks, parent route first
  → global afterEach hooks, in registration order
```

The browser commit boundary differs by adapter. `NavigationCoordinator.prepare()` runs the three guard phases before the Navigation API commits, while `HistoryCoordinator.handlePopState()` receives an entry that the History API has already committed and therefore calls `navigate()` with `commit: false`.

Every guard and lifecycle callback for one traversal receives the same `NavigationContext`:

- `currentMatch` is the last successfully rendered route.
- `nextMatch` is the route selected from the destination entry.
- `params` and `url` describe that destination.
- `historyState` must come from the destination entry, not the entry being left.
- `signal` cancels stale asynchronous guard work.
- `initial` remains false after the router's first successful render.

The existing branch-delta policy remains unchanged for traversal:

- Shared parent routes do not leave and re-enter.
- Changed path parameters or query parameters rerun the matched leaf's leave and enter phases.
- Hash-only changes do not produce route leave or enter work.
- Global `beforeEach` and `afterEach` hooks still run when the resolved branch is unchanged, unless an adapter intentionally leaves a hash-only event browser-managed.

Guard outcomes have these meanings:

| Guard outcome | Coordinator result | Required adapter behavior |
| --- | --- | --- |
| `true` | Continue | Commit or accept the traversal, render, then run lifecycle hooks. |
| `false` | `cancelled` | Do not render or run after-hooks; the adapter must prevent or repair the browser traversal. |
| Redirect string | `redirected` | Do not render the rejected destination; the adapter must hand the resolved redirect back to its browser navigation mechanism. |
| Throw or reject | `failed` | Do not continue pending route work; preserve the last accepted route when failure occurs before rendering. |

After-hooks are observers and cannot cancel a traversal. They run only after rendering succeeds. A failure in an after-hook produces `failed` after the coordinator has already recorded and rendered the destination, so it must not be treated like a guard cancellation or automatically roll history back.

## Adapter implementation

### `DomHistoryRouter`

The public commands are thin History API adapters:

```ts
back(): void {
  window.history.back();
}

forth(): void {
  window.history.forward();
}
```

The resulting `popstate` event must remain the sole route-processing entry point. The methods must not call `HistoryCoordinator` directly, dispatch a synthetic event, or push a replacement entry because the browser owns selection of the destination entry.

At a history boundary, the browser performs no traversal and emits no `popstate`; the router preserves that native no-op behavior.

The `popstate` listener must await or observe `HistoryCoordinator.handlePopState()` and process its `NavigationResult`. The current listener discards that promise, which means cancellation and redirect results cannot reconcile an already-selected history entry. Traversal support therefore requires router-level outcome handling in addition to the two command methods.

### `DomNavigationRouter`

Map the commands to the Navigation API while checking its explicit capability flags:

```ts
back(): void {
  if (!window.navigation.canGoBack) return;
  this.observeTraversal(window.navigation.back());
}

forth(): void {
  if (!window.navigation.canGoForward) return;
  this.observeTraversal(window.navigation.forward());
}
```

The resulting `navigate` event must continue through `handleNavigateEvent()`. The methods must not invoke `NavigationCoordinator.navigate()` directly because that would render without asking the Navigation API to traverse its current-entry list.

The implementation handles the `NavigationResult.finished` rejection produced by a failed traversal so a fire-and-forget public command cannot create an unhandled promise rejection. Expected guard cancellation is ignored, while unexpected traversal failures are reported with a scoped router error.

`NavigationCoordinator.handleNavigateEvent()` already maps cancellation to an `AbortError` during precommit and redirects through `controller.redirect()`. Preserve that behavior for `back()` and `forth()`. Change the traversal context to read destination state from `event.destination.getState()` rather than `history.state`; during precommit, `history.state` can still describe the entry being left.

## Service implementation

`DotaRouterService` delegates through matching methods:

```ts
back(): void {
  this.instance.back();
}

forth(): void {
  this.instance.forth();
}
```

The service remains an adapter-neutral facade. It must not inspect the concrete router with `instanceof`, access `window.history`, or access `window.navigation` itself.

Keep initialization behavior consistent with `route(path)`: all three navigation commands require `init()` to have created `instance`. A separate lifecycle change should introduce a descriptive pre-initialization error for all service commands together rather than treating traversal differently.

## History API outcome handling

The adapters use different cancellation mechanisms because their commit timing differs:

- The Navigation API runs guards during intercepted precommit work and can prevent a traversal from committing.
- A History API `popstate` event occurs after the browser has selected the entry. Calling `preventDefault()` on that event does not restore the previous URL. A rejected guard can therefore leave the selected URL and rendered route out of sync.

Complete guard processing uses the router-owned history-index restoration described in the [backward-compatible router integration plan](../migration/backward-compatible-router-integration-plan.md#step-6-adapt-the-history-router). Router metadata identifies the last accepted entry and selected destination while preserving application history state.

Process `HistoryCoordinator.handlePopState()` outcomes as follows:

- `completed`: retain the selected entry as the new accepted position. Rendering and all applicable after-hooks have already completed.
- `cancelled`: traverse back to the last accepted entry and suppress coordinator work for the restoration `popstate`, so guards and lifecycle hooks do not run twice.
- `redirected`: do not render the rejected entry. Restore the last accepted position, then initiate the redirect through the normal guarded navigation path with a ten-redirect limit.
- `failed` before the destination is recorded: restore the last accepted entry and preserve the previously rendered route.
- `failed` after rendering or in an after-hook: use `NavigationResult.phase` to restore render failures while retaining entries whose lifecycle observers failed after acceptance.

`DomHistoryRouter` owns an `AbortController` for active `popstate` processing. It aborts the previous traversal before starting a newer one and passes the new signal through `HistoryTraversalOptions`, preventing a slower guard from an older entry from rendering after a newer traversal.

Entries without router index metadata, including entries created before router initialization or by another history owner, must follow an explicit fallback policy. Accepting the external entry is safer than guessing a restoration distance. Document that fallback and add coverage for mixed router-owned and external entries.

## Implemented sequence

The implementation was completed in this order:

1. Added coordinator characterization tests for traversal guard order, lifecycle order, cancellation, redirect, destination history state, and asynchronous supersession.
2. Extended `Router` and `RouterService` in `Types.ts` with documented `back()` and `forth()` methods.
3. Added the native command methods to `DomHistoryRouter` and `DomNavigationRouter`, keeping browser events as coordinator entry points.
4. Updated `NavigationCoordinator.handleNavigateEvent()` to pass destination entry state from `event.destination.getState()` while preserving precommit cancellation and redirects.
5. Added router-owned abort handling and indexed restoration around `HistoryCoordinator.handlePopState()` for completed, cancelled, redirected, and failed outcomes.
6. Delegated both commands from `DotaRouterService` to its initialized router instance.
7. Updated `MockRouter` so custom-router compatibility remains compile-time checked.
8. Added focused adapter, service, coordinator, and end-to-end traversal tests.
9. Updated the package README with service-first usage, callback ordering, and history fallback behavior.
10. Added a major changeset describing the commands and custom `Router` migration requirement.

## Test plan

### Router adapter tests

For `DomHistoryRouter`:

- `back()` calls `window.history.back()` exactly once.
- `forth()` calls `window.history.forward()` exactly once.
- Neither method calls `pushState()`, `replaceState()`, or the renderer directly.
- A subsequent `popstate` resolves and renders the browser-selected URL without creating a duplicate history entry.
- An allowed traversal runs global guards, deepest-first leave guards, parent-first enter guards, rendering, leave hooks, enter hooks, and global after-hooks in exact order.
- A cancelled traversal runs no renderer or after-hooks, restores the accepted entry, and suppresses application work for the restoration event.
- A redirect does not render the rejected entry and continues through the redirect policy without looping.
- A newer traversal aborts an older asynchronous guard and prevents stale rendering or lifecycle hooks.
- Destination `PopStateEvent.state` reaches every callback as `context.historyState`.
- Pre-render failure restores the accepted entry; post-render lifecycle failure does not undo the accepted transition.

For `DomNavigationRouter`:

- `back()` calls `window.navigation.back()` only when `canGoBack` is true.
- `forth()` calls `window.navigation.forward()` only when `canGoForward` is true.
- Boundary calls are no-ops.
- A resulting `navigate` event still uses the existing intercept precommit and completion handlers.
- Guards run during `precommitHandler`; rendering and lifecycle hooks run only from `handler` after commit.
- Guard cancellation rejects precommit with `AbortError`, while a redirect calls the precommit controller with the resolved destination.
- `event.destination.getState()` reaches every callback as `context.historyState`.
- The event signal aborts stale asynchronous guards before rendering or after-hooks.
- Expected cancellation and unexpected `finished` rejection do not become unhandled promise rejections.

### Service and contract tests

- `DotaRouterService.back()` delegates once to the exact initialized router instance.
- `DotaRouterService.forth()` delegates once to the exact initialized router instance.
- Neither service method performs browser-specific work.
- `MockRouter` and any custom router fixtures implement the two required methods.
- Existing `route(path)` behavior and tests remain unchanged.

### Integration tests

- Navigate through at least three routes, call `back()` once, and verify the URL, rendered component, guards, and lifecycle hooks represent the preceding entry.
- Call `forth()` once and verify the succeeding entry is restored without adding another entry.
- Exercise beginning and end boundaries.
- Verify query parameters, hash fragments, and history state survive both directions.
- Verify cancelled `back()` and `forth()` traversals restore the accepted URL and view without a duplicate lifecycle transition.
- Verify nested branch traversal leaves routes deepest-first and enters routes parent-first while shared parents remain active.
- Verify a parameter or query change reruns the leaf phases and a hash-only traversal follows the adapter's documented browser-managed policy.

Run the package validation after implementation:

```bash
pnpm --filter @ayu-sh-kr/dota-router test
pnpm --filter @ayu-sh-kr/dota-router build
```

## Acceptance criteria

- `back()` and `forth()` are required by the public `Router` contract and available on both built-in adapters.
- The same methods are available through an initialized `DotaRouterService`.
- Both adapters traverse one existing browser-history entry through their native browser API.
- Traversal does not push or replace history entries.
- Boundary behavior is a no-op.
- Existing browser event handling remains responsible for coordinator entry; the command methods never render or run callbacks directly.
- Both adapters provide the same guard and lifecycle ordering for accepted traversals.
- Cancelled or redirected traversals never render the rejected destination or run its after-hooks.
- Rapid traversal cannot let stale asynchronous guard work render or run lifecycle hooks.
- Callback context contains the selected entry's URL, match, parameters, state, and cancellation signal.
- History API cancellation restores the last accepted router-owned entry without repeating application lifecycle work.
- Public documentation distinguishes traversal requests from observable transition completion and documents the fallback for external history entries.
- Adapter, service, and integration tests cover both directions without regressing `route(path)`.

## Source references

- [`DotaRouterService.ts`](../../../../../packages/libs/dota-router/src/DotaRouterService.ts) owns the adapter-neutral service facade.
- [`Types.ts`](../../../../../packages/libs/dota-router/src/Types.ts) defines the public `Router` and `RouterService` contracts.
- [`dom-history.router.ts`](../../../../../packages/libs/dota-router/src/router/history/dom-history.router.ts) owns History API commands and delegates `popstate` handling.
- [`history-transition.ts`](../../../../../packages/libs/dota-router/src/router/history/history-transition.ts) owns reusable History API state, recovery, and transition functions.
- [`dom-navigation.router.ts`](../../../../../packages/libs/dota-router/src/router/dom-navigation.router.ts) owns Navigation API commands and interception.
- [`HistoryCoordinator.ts`](../../../../../packages/libs/dota-router/src/coordinator/HistoryCoordinator.ts) processes already-selected `popstate` entries without another commit.
- [`NavigationCoordinator.ts`](../../../../../packages/libs/dota-router/src/coordinator/NavigationCoordinator.ts) prepares and completes intercepted Navigation API transitions.
- [`navigation-lifecycle.ts`](../../../../../packages/libs/dota-router/src/coordinator/navigation-lifecycle.ts) defines sequential guard and lifecycle execution.
- [`route-transition.ts`](../../../../../packages/libs/dota-router/src/coordinator/route-transition.ts) creates callback context and orders entering and leaving branches.
- [`coordinator-integration.test.ts`](../../../../../packages/libs/dota-router/test/coordinator/coordinator-integration.test.ts) characterizes shared callback ordering, cancellation, redirects, and aborts.
- [`router-service.test.ts`](../../../../../packages/libs/dota-router/test/router-service.test.ts) verifies service delegation.
- [`dom-history-router.test.ts`](../../../../../packages/libs/dota-router/test/router/dom-history-router.test.ts) verifies History API adapter behavior.
- [`history-transition.test.ts`](../../../../../packages/libs/dota-router/test/router/history/history-transition.test.ts) verifies the extracted History transition functions directly.
- [`dom-navigation-router.test.ts`](../../../../../packages/libs/dota-router/test/router/dom-navigation-router.test.ts) verifies Navigation API adapter behavior.
