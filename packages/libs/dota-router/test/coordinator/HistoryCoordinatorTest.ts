import {afterEach, describe, expect, it, vi} from "vitest";
import {HistoryCoordinator} from "@dota/coordinator";
import {NavigationContext, RouteConfig} from "@dota/Types";

class ErrorPage extends HTMLElement {}
class HomePage extends HTMLElement {}
class AccountPage extends HTMLElement {}

const errorRoute: RouteConfig<HTMLElement> = {path: "/error", component: ErrorPage};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HistoryCoordinator", () => {
  it("pushes a history entry with the supplied state by default", () => {
    const coordinator = new HistoryCoordinator(
      [{path: "/", component: HomePage}],
      errorRoute,
      vi.fn()
    );
    const pushState = vi.spyOn(window.history, "pushState");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const url = new URL("/account", window.location.origin);
    const options = {historyState: {source: "test"}};

    coordinator.commit(url, options);

    expect(pushState).toHaveBeenCalledWith(options.historyState, "", url.href);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("replaces the current history entry when requested", () => {
    const coordinator = new HistoryCoordinator(
      [{path: "/", component: HomePage}],
      errorRoute,
      vi.fn()
    );
    const pushState = vi.spyOn(window.history, "pushState");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const url = new URL("/account", window.location.origin);

    coordinator.commit(url, {replace: true});

    expect(replaceState).toHaveBeenCalledWith(null, "", url.href);
    expect(pushState).not.toHaveBeenCalled();
  });

  it("resolves and renders a browser-selected entry without committing it again", async () => {
    const render = vi.fn();
    const coordinator = new HistoryCoordinator(
      [{path: "/account", component: AccountPage}],
      errorRoute,
      render
    );
    const pushState = vi.spyOn(window.history, "pushState");
    window.history.replaceState(null, "", "/account");
    const event = new PopStateEvent("popstate", {state: {source: "browser"}});

    const result = await coordinator.handlePopState(event);

    expect(result.status).toBe("completed");
    expect(result.match?.pathname).toBe("/account");
    expect(render).toHaveBeenCalledTimes(1);
    expect(pushState).not.toHaveBeenCalled();
  });

  it("cancels navigation before committing when a guard rejects the destination", async () => {
    const render = vi.fn();
    const coordinator = new HistoryCoordinator(
      [{path: "/account", component: AccountPage, beforeEnter: () => false}],
      errorRoute,
      render
    );
    const pushState = vi.spyOn(window.history, "pushState");

    const result = await coordinator.navigate("/account");

    expect(result.status).toBe("cancelled");
    expect(pushState).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it("returns a failed result when rendering throws after the history commit", async () => {
    const error = new Error("render failed");
    const afterEach = vi.fn();
    const coordinator = new HistoryCoordinator(
      [{path: "/account", component: AccountPage}],
      errorRoute,
      vi.fn().mockRejectedValue(error),
      {afterEach: [afterEach]}
    );
    const pushState = vi.spyOn(window.history, "pushState");

    const result = await coordinator.navigate("/account");

    expect(result).toMatchObject({status: "failed", phase: "render", error});
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(afterEach).not.toHaveBeenCalled();
  });

  it("reports a global after-hook failure without undoing the committed match", async () => {
    const error = new Error("analytics failed");
    const beforeEach = vi.fn((_context: NavigationContext) => true as const);
    const coordinator = new HistoryCoordinator(
      [{path: "/account", component: AccountPage}],
      errorRoute,
      vi.fn(),
      {
        beforeEach: [beforeEach],
        afterEach: [vi.fn().mockRejectedValue(error)]
      }
    );

    const result = await coordinator.navigate("/account");
    await coordinator.navigate("/account");

    expect(result).toMatchObject({status: "failed", phase: "lifecycle", error});
    expect(window.location.pathname).toBe("/account");
    expect(beforeEach.mock.calls[1][0].currentMatch?.pathname).toBe("/account");
  });

  it("separates committed router state from callback-visible application state", async () => {
    const applicationState = {source: "application"};
    const commitState = {source: "adapter"};
    const beforeEnter = vi.fn(() => true as const);
    const coordinator = new HistoryCoordinator(
      [{path: "/account", component: AccountPage, beforeEnter}],
      errorRoute,
      vi.fn()
    );

    const result = await coordinator.navigate("/account", {historyState: applicationState, commitState});

    expect(result.status).toBe("completed");
    expect(window.history.state).toBe(commitState);
    expect(beforeEnter).toHaveBeenCalledWith(expect.objectContaining({historyState: applicationState}));
  });

  it("uses adapter state and signal for an already-committed popstate entry", async () => {
    const applicationState = {source: "selected-entry"};
    const controller = new AbortController();
    const beforeEnter = vi.fn(() => true as const);
    const coordinator = new HistoryCoordinator(
      [{path: "/account", component: AccountPage, beforeEnter}],
      errorRoute,
      vi.fn()
    );
    window.history.replaceState(null, "", "/account");

    const result = await coordinator.handlePopState(
      new PopStateEvent("popstate", {state: {source: "browser-envelope"}}),
      {signal: controller.signal, historyState: applicationState}
    );

    expect(result.status).toBe("completed");
    expect(beforeEnter).toHaveBeenCalledWith(expect.objectContaining({
      signal: controller.signal,
      historyState: applicationState
    }));
  });
});
