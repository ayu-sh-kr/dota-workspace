# Router transition layers

`route-transition.ts` and `history-transition.ts` participate in the same navigation, but they own different boundaries. The coordinator layer decides what a route transition means; the History API layer decides how an already-moving browser history stack is accepted or repaired.

## Context and intent

`route-transition.ts` is browser-independent coordination support under `src/coordinator`. It normalizes URLs, builds the `NavigationContext`, converts guard outcomes to `NavigationResult`, and calculates the ordered entering/leaving branch delta. It does not read or write browser history and does not render a route itself.

`history-transition.ts` is the reusable History API adapter policy under `src/router/history`. It indexes entries with router metadata, starts and settles abortable transitions, delegates route work to `HistoryCoordinator`, and reconciles `popstate` outcomes with `history.go()` when a rejected traversal has already moved the browser.

## Difference at a glance

| Concern | `route-transition.ts` | `history-transition.ts` |
| --- | --- | --- |
| Layer | Coordinator utility | DOM History adapter utility |
| Input | URL, route matches, guard results | Runtime, `PopStateEvent`, path, browser history |
| Owns | Context shape, redirect result, branch ordering | Indexed state, accepted position, cancellation, restoration |
| Browser mutation | None | `replaceState`, `go`, and coordinator commits for programmatic navigation |
| Output | `NavigationContext`, `BranchDelta`, or `NavigationResult` | Updated runtime and delegated coordinator transition |
| Failure policy | Describes cancellation, redirect, render, and lifecycle phases | Keeps accepted rendering, restores rejected render/guard traversals, and bounds redirects |

## Behavior

Programmatic `navigateHistory()` assigns the next router position and delegates to the coordinator. The coordinator runs guards before its History API commit, then renders and runs lifecycle hooks. A completed transition, or a lifecycle failure after rendering, becomes the accepted position. A render failure restores the prior accepted entry.

For browser traversal, `handleHistoryPopState()` receives an entry the browser has already selected. It passes the destination application state to `HistoryCoordinator.handlePopState()` with commit disabled. A completed traversal is accepted; a cancelled, redirected, or render-failed traversal restores the last accepted router-owned position. The matching restoration `popstate` is suppressed so guards and lifecycle hooks are not run twice. Redirects continue only after restoration and stop after `HISTORY_REDIRECT_LIMIT`.

The coordinator utility remains the common semantic layer in both paths: the adapter supplies the destination URL/state and interprets the result, while route matching, callback context, branch ordering, and guard conversion stay centralized.

## Related documentation

- [Transition-layer flow](transition-layer-comparison.svg)
- [History traversal API plan](../planning/history-traversal-api-plan.md)
- [Global navigation hook integration](global-navigation-hooks-integration.md)

Source: [`route-transition.ts`](../../../../../packages/libs/dota-router/src/coordinator/route-transition.ts), [`history-transition.ts`](../../../../../packages/libs/dota-router/src/router/history/history-transition.ts), and [`HistoryCoordinator.ts`](../../../../../packages/libs/dota-router/src/coordinator/HistoryCoordinator.ts).
