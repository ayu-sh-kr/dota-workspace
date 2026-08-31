import {NavigationResult, RouteMatch} from "@dota/Types";
import {
  beginHistoryTransition,
  createDotaHistoryState,
  getDotaHistoryEntry,
  handleHistoryPopState,
  HISTORY_REDIRECT_LIMIT,
  HistoryTransitionBrowser,
  HistoryTransitionCoordinator,
  HistoryTransitionRuntime,
  isAcceptedHistoryResult,
  navigateHistory,
  prepareHistoryTransition,
  restoreAcceptedHistoryEntry,
  settleHistoryTransition
} from "@dota/router/history/history-transition";
import {beforeEach, describe, expect, it, Mock, vi} from "vitest";

type CoordinatorMocks = {
  navigate: Mock<HistoryTransitionCoordinator<HTMLElement>["navigate"]>;
  handlePopState: Mock<HistoryTransitionCoordinator<HTMLElement>["handlePopState"]>;
}

type RuntimeFixture = {
  runtime: HistoryTransitionRuntime<HTMLElement>;
  coordinator: CoordinatorMocks;
  history: HistoryTransitionBrowser;
  go: ReturnType<typeof vi.fn>;
  replaceState: ReturnType<typeof vi.fn>;
}

class TestPage extends HTMLElement {}

const match: RouteMatch<HTMLElement> = {
  route: {path: "/", component: TestPage},
  branch: [],
  matched: true,
  params: {},
  pathname: "/",
  searchParams: new URLSearchParams(),
  hash: ""
};

/** Creates isolated browser and coordinator boundaries for transition-policy tests. */
function createRuntime(result: NavigationResult<HTMLElement> = {status: "completed", match}): RuntimeFixture {
  const coordinator: CoordinatorMocks = {
    navigate: vi.fn<HistoryTransitionCoordinator<HTMLElement>["navigate"]>().mockResolvedValue(result),
    handlePopState: vi.fn<HistoryTransitionCoordinator<HTMLElement>["handlePopState"]>().mockResolvedValue(result)
  };
  const go = vi.fn();
  const replaceState = vi.fn();
  const history: HistoryTransitionBrowser = {
    state: null,
    go,
    replaceState
  };

  return {
    runtime: {
      coordinator,
      history,
      acceptedPosition: 2
    },
    coordinator,
    history,
    go,
    replaceState
  };
}

/** Waits for the promise continuation scheduled by the void navigation API. */
function flushNavigation(): Promise<void> {
  return new Promise(resolve => queueMicrotask(resolve));
}

describe("history transition state", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps and reads application state without exposing router metadata", () => {
    const applicationState = {source: "application"};
    const state = createDotaHistoryState(4, applicationState);

    expect(state).toEqual({
      __dotaRouter: {
        position: 4,
        applicationState
      }
    });
    expect(getDotaHistoryEntry(state)).toEqual({position: 4, applicationState});
  });

  it.each([
    null,
    "application state",
    {},
    {__dotaRouter: null},
    {__dotaRouter: {position: "1", applicationState: null}},
    {__dotaRouter: {position: 1}}
  ])("leaves malformed or external state unowned: %j", state => {
    expect(getDotaHistoryEntry(state)).toBeUndefined();
  });

  it("indexes an external current entry while preserving its application state", () => {
    const coordinator = createRuntime().coordinator;
    const applicationState = {source: "existing"};
    const replaceState = vi.fn();
    const history: HistoryTransitionBrowser = {state: applicationState, replaceState, go: vi.fn()};

    const prepared = prepareHistoryTransition(coordinator, history, "http://localhost/account");

    expect(prepared.applicationState).toBe(applicationState);
    expect(prepared.runtime.acceptedPosition).toBe(0);
    expect(replaceState).toHaveBeenCalledWith(
      createDotaHistoryState(0, applicationState),
      "",
      "http://localhost/account"
    );
  });

  it("reuses an indexed current entry without replacing it", () => {
    const coordinator = createRuntime().coordinator;
    const applicationState = {source: "indexed"};
    const replaceState = vi.fn();
    const history: HistoryTransitionBrowser = {
      state: createDotaHistoryState(7, applicationState),
      replaceState,
      go: vi.fn()
    };

    const prepared = prepareHistoryTransition(coordinator, history, "http://localhost/account");

    expect(prepared.applicationState).toBe(applicationState);
    expect(prepared.runtime.acceptedPosition).toBe(7);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("aborts the previous transition and settles only the current controller", () => {
    const {runtime} = createRuntime();
    const firstController = beginHistoryTransition(runtime);
    const secondController = beginHistoryTransition(runtime);

    expect(firstController.signal.aborted).toBe(true);
    expect(settleHistoryTransition(runtime, firstController)).toBe(false);
    expect(settleHistoryTransition(runtime, secondController)).toBe(true);
    expect(runtime.activeTransition).toBeUndefined();
  });

  it("cannot restore an entry when no router-owned position is accepted", () => {
    const {runtime, go} = createRuntime();
    runtime.acceptedPosition = undefined;

    const restored = restoreAcceptedHistoryEntry(runtime, 1);

    expect(restored).toBe(false);
    expect(go).not.toHaveBeenCalled();
  });

  it("records and requests the delta needed to restore the accepted entry", () => {
    const {runtime, go} = createRuntime();
    const redirectTo = new URL("http://localhost/sign-in");

    const restored = restoreAcceptedHistoryEntry(runtime, 0, redirectTo, 3);

    expect(restored).toBe(true);
    expect(runtime.restoration).toEqual({targetPosition: 2, redirectTo, redirectCount: 3});
    expect(go).toHaveBeenCalledWith(2);
  });

  it("accepts completed and post-render lifecycle outcomes only", () => {
    expect(isAcceptedHistoryResult({status: "completed", match})).toBe(true);
    expect(isAcceptedHistoryResult({
      status: "failed",
      match,
      phase: "lifecycle",
      error: new Error("after hook failed")
    })).toBe(true);
    expect(isAcceptedHistoryResult({
      status: "failed",
      match,
      phase: "render",
      error: new Error("render failed")
    })).toBe(false);
    expect(isAcceptedHistoryResult({status: "cancelled"})).toBe(false);
  });
});

describe("history transition workflows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("stops programmatic navigation beyond the redirect limit", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const {runtime, coordinator} = createRuntime();

    navigateHistory(runtime, "/loop", HISTORY_REDIRECT_LIMIT + 1);

    expect(coordinator.navigate).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      `[dota-router] Navigation stopped after ${HISTORY_REDIRECT_LIMIT} redirects.`
    );
  });

  it("commits indexed state and advances the accepted position after navigation", async () => {
    const {runtime, coordinator} = createRuntime();

    navigateHistory(runtime, "/account");
    await flushNavigation();

    expect(runtime.acceptedPosition).toBe(3);
    expect(coordinator.navigate).toHaveBeenCalledWith("/account", {
      signal: expect.any(AbortSignal),
      historyState: null,
      commitState: createDotaHistoryState(3, null)
    });
  });

  it("passes selected application state through popstate and accepts the destination", async () => {
    const applicationState = {source: "selected"};
    const {runtime, coordinator} = createRuntime();
    const event = new PopStateEvent("popstate", {
      state: createDotaHistoryState(1, applicationState)
    });

    await handleHistoryPopState(runtime, event);

    expect(runtime.acceptedPosition).toBe(1);
    expect(coordinator.handlePopState).toHaveBeenCalledWith(event, {
      signal: expect.any(AbortSignal),
      historyState: applicationState
    });
  });

  it("restores an indexed destination rejected by a popstate guard", async () => {
    const {runtime, go} = createRuntime({status: "cancelled"});
    const event = new PopStateEvent("popstate", {
      state: createDotaHistoryState(0, null)
    });

    await handleHistoryPopState(runtime, event);

    expect(runtime.restoration).toEqual({targetPosition: 2, redirectTo: undefined, redirectCount: 0});
    expect(go).toHaveBeenCalledWith(2);
  });

  it("suppresses the popstate generated by an expected restoration", async () => {
    const {runtime, coordinator} = createRuntime();
    runtime.restoration = {targetPosition: 2, redirectCount: 0};
    const event = new PopStateEvent("popstate", {
      state: createDotaHistoryState(2, null)
    });

    await handleHistoryPopState(runtime, event);

    expect(runtime.restoration).toBeUndefined();
    expect(coordinator.handlePopState).not.toHaveBeenCalled();
  });
});
