import {HistoryTraversalOptions, NavigationOptions, NavigationResult} from "@dota/Types";

const DOTA_HISTORY_STATE_KEY = "__dotaRouter";

/** Maximum guard redirects followed before a programmatic transition is stopped. */
export const HISTORY_REDIRECT_LIMIT = 10;

/**
 * Keeps recovery metadata beside the application state stored for one browser entry.
 * The adapter uses `position` internally while callbacks continue to receive only
 * `applicationState` through their navigation context.
 */
export type DotaHistoryEntry = {
  /** Monotonic router position used to recover the last accepted entry. */
  position: number;
  /** State exposed to guards, renderers, and lifecycle hooks. */
  applicationState: unknown;
}

/** Browser-history envelope written by the DOM History adapter. */
export type DotaHistoryState = {
  /** Namespaced metadata that distinguishes router entries from external entries. */
  [DOTA_HISTORY_STATE_KEY]: DotaHistoryEntry;
}

/**
 * Describes a browser-generated recovery that is waiting for its `popstate` event.
 * A delayed redirect is retained so it starts only after the accepted entry returns.
 */
export type HistoryRestoration = {
  /** Router-owned position that remains the accepted destination. */
  targetPosition: number;
  /** Guard redirect to follow after recovery, when the rejected traversal redirected. */
  redirectTo?: URL;
  /** Redirect count carried across the recovery event. */
  redirectCount: number;
}

/** Coordinator operations required by browser-history transition policy. */
export type HistoryTransitionCoordinator<T extends HTMLElement> = {
  /** Runs a programmatic transition that may commit a new indexed entry. */
  navigate(url: string | URL, options?: NavigationOptions): Promise<NavigationResult<T>>;
  /** Processes an entry that the browser selected before router policy ran. */
  handlePopState(event: PopStateEvent, options?: HistoryTraversalOptions): Promise<NavigationResult<T>>;
}

/** Browser-history operations required for entry indexing and traversal recovery. */
export type HistoryTransitionBrowser = {
  /** State belonging to the currently selected browser entry. */
  readonly state: unknown;
  /** Replaces the current entry when the router first assigns its position. */
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
  /** Moves by a relative entry delta when a rejected traversal must be restored. */
  go(delta?: number): void;
}

/**
 * Holds the mutable browser-history state shared by reusable transition functions.
 * Keeping it outside the router class makes recovery policy directly testable while
 * the adapter remains responsible for wiring browser events to the coordinator.
 */
export type HistoryTransitionRuntime<T extends HTMLElement> = {
  /** Coordinator that runs guards, rendering, and lifecycle hooks. */
  coordinator: HistoryTransitionCoordinator<T>;
  /** Browser history receiving indexed entries and recovery deltas. */
  history: HistoryTransitionBrowser;
  /** Last router-owned position accepted by guards and rendering. */
  acceptedPosition?: number;
  /** Controller used to cancel a transition superseded by a newer request. */
  activeTransition?: AbortController;
  /** Recovery awaiting the browser's matching `popstate` event. */
  restoration?: HistoryRestoration;
}

/** Result used to initialize the router and its first coordinator transition. */
export type PreparedHistoryTransition<T extends HTMLElement> = {
  /** Mutable runtime passed to the history transition functions. */
  runtime: HistoryTransitionRuntime<T>;
  /** Current entry state exposed to the initial navigation callbacks. */
  applicationState: unknown;
}

/**
 * Reads router metadata without treating arbitrary application state as an envelope.
 * Entries with missing or malformed metadata remain externally owned and therefore
 * cannot participate in position-based traversal recovery.
 * @param state - State supplied by the browser for one history entry.
 * @returns Valid router metadata, or `undefined` for an external entry.
 */
export function getDotaHistoryEntry(state: unknown): DotaHistoryEntry | undefined {
  if (typeof state !== "object" || state === null) return undefined;

  const entry = (state as Partial<DotaHistoryState>)[DOTA_HISTORY_STATE_KEY];
  if (!entry || typeof entry.position !== "number" || !("applicationState" in entry)) return undefined;

  return entry;
}

/**
 * Wraps application state with the position required for traversal recovery.
 * The namespace prevents router metadata from being mistaken for callback-visible
 * state when an indexed entry is selected later.
 * @param position - Router position assigned when the entry is committed.
 * @param applicationState - State that application callbacks must receive.
 * @returns State written to `window.history` for the entry.
 */
export function createDotaHistoryState(position: number, applicationState: unknown): DotaHistoryState {
  return {[DOTA_HISTORY_STATE_KEY]: {position, applicationState}};
}

/**
 * Creates traversal state and indexes the current browser entry when necessary.
 * Existing application state is preserved inside the router envelope so initial
 * callbacks observe the same value after the adapter takes ownership.
 * @param coordinator - Coordinator used for every history transition.
 * @param history - Browser history that owns the current entry.
 * @param currentUrl - Current document URL retained when replacing an external entry.
 * @returns Runtime state and callback-visible state for the initial transition.
 */
export function prepareHistoryTransition<T extends HTMLElement>(
  coordinator: HistoryTransitionCoordinator<T>,
  history: HistoryTransitionBrowser,
  currentUrl: string
): PreparedHistoryTransition<T> {
  const currentEntry = getDotaHistoryEntry(history.state);
  const applicationState = currentEntry?.applicationState ?? history.state;
  const acceptedPosition = currentEntry?.position ?? 0;

  if (!currentEntry) {
    history.replaceState(createDotaHistoryState(acceptedPosition, applicationState), "", currentUrl);
  }

  return {
    runtime: {coordinator, history, acceptedPosition},
    applicationState
  };
}

/**
 * Cancels stale asynchronous work and creates a signal for the latest transition.
 * Only one transition may own the runtime at a time, preventing late guard results
 * from changing history after a newer navigation has started.
 * @param runtime - Mutable state shared by history transition functions.
 * @returns Controller assigned exclusively to the new transition.
 */
export function beginHistoryTransition<T extends HTMLElement>(runtime: HistoryTransitionRuntime<T>): AbortController {
  runtime.activeTransition?.abort();
  runtime.activeTransition = new AbortController();
  return runtime.activeTransition;
}

/**
 * Accepts a result only when it still belongs to the current transition.
 * A settled controller is released so a future transition does not abort work that
 * has already completed.
 * @param runtime - Mutable state shared by history transition functions.
 * @param controller - Controller created for the result being settled.
 * @returns Whether the result still owns the active transition.
 */
export function settleHistoryTransition<T extends HTMLElement>(
  runtime: HistoryTransitionRuntime<T>,
  controller: AbortController
): boolean {
  if (controller.signal.aborted || runtime.activeTransition !== controller) return false;
  runtime.activeTransition = undefined;
  return true;
}

/**
 * Returns from a rejected committed entry to the last accepted router position.
 * The matching recovery event is recorded so it can be suppressed, preventing
 * guards and lifecycle hooks from running a second time during restoration.
 * @param runtime - Mutable state and browser history used for recovery.
 * @param selectedPosition - Position selected before the transition was rejected.
 * @param redirectTo - Optional guard redirect started after recovery.
 * @param redirectCount - Redirect count retained across the recovery event.
 * @returns Whether an accepted router position was available for restoration.
 */
export function restoreAcceptedHistoryEntry<T extends HTMLElement>(
  runtime: HistoryTransitionRuntime<T>,
  selectedPosition: number,
  redirectTo?: URL,
  redirectCount = 0
): boolean {
  if (runtime.acceptedPosition === undefined) return false;

  const delta = runtime.acceptedPosition - selectedPosition;
  if (delta === 0) {
    if (redirectTo) navigateHistory(runtime, redirectTo.href, redirectCount);
    return true;
  }

  runtime.restoration = {targetPosition: runtime.acceptedPosition, redirectTo, redirectCount};
  runtime.history.go(delta);
  return true;
}

/**
 * Runs programmatic navigation with indexed state and bounded guard redirects.
 * Guards execute before the coordinator commits the entry; render failures recover
 * the previously accepted position, while lifecycle failures retain rendered state.
 * @param runtime - Mutable transition state and coordinator used by the adapter.
 * @param path - Relative or absolute destination requested by the application.
 * @param redirectCount - Redirects already followed for this navigation chain.
 */
export function navigateHistory<T extends HTMLElement>(
  runtime: HistoryTransitionRuntime<T>,
  path: string,
  redirectCount = 0
): void {
  if (redirectCount > HISTORY_REDIRECT_LIMIT) {
    console.error(`[dota-router] Navigation stopped after ${HISTORY_REDIRECT_LIMIT} redirects.`);
    return;
  }

  const controller = beginHistoryTransition(runtime);
  const destinationPosition = (runtime.acceptedPosition ?? -1) + 1;
  void runtime.coordinator.navigate(path, {
    signal: controller.signal,
    historyState: null,
    commitState: createDotaHistoryState(destinationPosition, null)
  }).then(result => {
    if (!settleHistoryTransition(runtime, controller)) return;

    if (isAcceptedHistoryResult(result)) {
      runtime.acceptedPosition = destinationPosition;
      if (result.status === "failed") console.error("[dota-router] Navigation lifecycle failed.", result.error);
      return;
    }

    if (result.status === "redirected") {
      navigateHistory(runtime, result.redirectTo.href, redirectCount + 1);
      return;
    }

    if (result.status === "failed" && result.phase === "render") {
      restoreAcceptedHistoryEntry(runtime, destinationPosition);
    }
  });
}

/**
 * Sends a browser-selected entry through the coordinator without committing it again.
 * Because `popstate` occurs after browser history has moved, rejected router-owned
 * entries are restored and recovery events are suppressed to avoid duplicate hooks.
 * @param runtime - Mutable transition state and coordinator used by the adapter.
 * @param event - Browser event containing the selected entry state.
 */
export async function handleHistoryPopState<T extends HTMLElement>(
  runtime: HistoryTransitionRuntime<T>,
  event: PopStateEvent
): Promise<void> {
  const selectedEntry = getDotaHistoryEntry(event.state);

  if (runtime.restoration && selectedEntry?.position === runtime.restoration.targetPosition) {
    const {redirectTo, redirectCount} = runtime.restoration;
    runtime.restoration = undefined;
    if (redirectTo) navigateHistory(runtime, redirectTo.href, redirectCount);
    return;
  }

  runtime.restoration = undefined;
  const controller = beginHistoryTransition(runtime);
  const result = await runtime.coordinator.handlePopState(event, {
    signal: controller.signal,
    historyState: selectedEntry?.applicationState ?? event.state
  });
  if (!settleHistoryTransition(runtime, controller)) return;

  if (isAcceptedHistoryResult(result)) {
    runtime.acceptedPosition = selectedEntry?.position;
    if (result.status === "failed") console.error("[dota-router] History traversal lifecycle failed.", result.error);
    return;
  }

  if (result.status === "redirected") {
    if (selectedEntry && restoreAcceptedHistoryEntry(runtime, selectedEntry.position, result.redirectTo, 1)) return;
    navigateHistory(runtime, result.redirectTo.href, 1);
    return;
  }

  if (result.status === "cancelled" || result.status === "failed") {
    if (selectedEntry && restoreAcceptedHistoryEntry(runtime, selectedEntry.position)) return;
    console.error("[dota-router] Cannot restore a rejected external history entry without router position metadata.");
  }
}

/**
 * Distinguishes transitions whose destination is already rendered and must be kept.
 * Lifecycle failures occur after rendering, so restoring history would desynchronize
 * the visible route and repeat application callbacks.
 * @param result - Coordinator result whose browser-history consequence is required.
 * @returns Whether the selected or committed entry must remain accepted.
 */
export function isAcceptedHistoryResult<T extends HTMLElement>(result: NavigationResult<T>): boolean {
  return result.status === "completed" || (result.status === "failed" && result.phase === "lifecycle");
}
