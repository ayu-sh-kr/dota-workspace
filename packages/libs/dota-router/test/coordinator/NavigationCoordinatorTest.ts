import {describe, expect, it, vi} from "vitest";
import {HistoryCoordinator, NavigationCoordinator} from "@dota/coordinator";
import {runRouteGuards, runRouteLifecycleHooks} from "@dota/coordinator/navigation-lifecycle";
import {NavigationContext, RouteConfig} from "@dota/Types";

class ErrorPage extends HTMLElement {}
class HomePage extends HTMLElement {}
class AccountPage extends HTMLElement {}

const errorRoute: RouteConfig<HTMLElement> = {path: "/error", component: ErrorPage};

describe("NavigationCoordinator", () => {
  it("prepares in precommit and renders in the Navigation API handler", async () => {
    const render = vi.fn();
    const intercept = vi.fn();
    const coordinator = new NavigationCoordinator([
      {path: "/account", component: AccountPage}
    ], errorRoute, render);
    const event = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      destination: {url: "http://dota-router.local/account", getState: () => undefined},
      signal: new AbortController().signal,
      intercept
    } as unknown as NavigateEvent;

    coordinator.handleNavigateEvent(event);

    expect(intercept).toHaveBeenCalledTimes(1);
    const options = intercept.mock.calls[0][0] as {
      precommitHandler(controller: {redirect(url: string): void}): Promise<void>;
      handler(): Promise<void>;
    };
    const controller = {redirect: vi.fn()};

    await options.precommitHandler(controller);
    await options.handler();

    expect(controller.redirect).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({pathname: "/account", matched: true}),
      expect.objectContaining({url: expect.any(URL)})
    );
  });

  it("rejects Navigation API precommit when a guard cancels", async () => {
    const render = vi.fn();
    const intercept = vi.fn();
    const coordinator = new NavigationCoordinator([
      {path: "/account", component: AccountPage, beforeEnter: () => false}
    ], errorRoute, render);
    const event = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      destination: {url: "http://dota-router.local/account", getState: () => undefined},
      signal: new AbortController().signal,
      intercept
    } as unknown as NavigateEvent;

    coordinator.handleNavigateEvent(event);

    const options = intercept.mock.calls[0][0] as {
      precommitHandler(controller: {redirect(url: string): void}): Promise<void>;
    };

    await expect(options.precommitHandler({redirect: vi.fn()})).rejects.toMatchObject({
      name: "AbortError"
    });
    expect(render).not.toHaveBeenCalled();
  });

  it("exposes standalone guard and lifecycle runners", async () => {
    const events: string[] = [];
    const route: RouteConfig<HTMLElement> = {
      path: "/account",
      component: AccountPage,
      beforeEnter: context => {
        events.push(context.nextMatch.pathname);
        return true;
      },
      afterEnter: context => {
        events.push(context.nextMatch.route.path);
      }
    };
    const context = {
      currentMatch: undefined,
      nextMatch: {
        route,
        branch: [route],
        matched: true,
        params: {},
        pathname: "/account",
        searchParams: new URLSearchParams(),
        hash: ""
      },
      signal: new AbortController().signal,
      params: {},
      url: new URL("http://dota-router.local/account"),
      historyState: undefined
    } satisfies NavigationContext;

    expect(await runRouteGuards([route], "beforeEnter", context)).toBe(true);
    await runRouteLifecycleHooks([route], "afterEnter", context);
    expect(events).toEqual(["/account", "/account"]);
  });

  it("runs guards and lifecycle hooks around rendering", async () => {
    const events: string[] = [];
    const routes = [{
      path: "/account",
      component: AccountPage,
      beforeEnter: () => { events.push("before"); return true as const; },
      afterEnter: () => { events.push("after"); }
    }];
    const coordinator = new NavigationCoordinator(routes, errorRoute, async () => {
      events.push("render");
    });

    const result = await coordinator.navigate("/account");

    expect(result.status).toBe("completed");
    expect(events).toEqual(["before", "render", "after"]);
  });

  it("does not render when a guard cancels", async () => {
    const render = vi.fn();
    const coordinator = new NavigationCoordinator([
      {path: "/account", component: AccountPage, beforeEnter: () => false}
    ], errorRoute, render);

    const result = await coordinator.navigate("/account");

    expect(result.status).toBe("cancelled");
    expect(render).not.toHaveBeenCalled();
  });

  it("returns a resolved redirect without rendering the guarded route", async () => {
    const render = vi.fn();
    const coordinator = new NavigationCoordinator([
      {path: "/account", component: AccountPage, beforeEnter: () => "/sign-in"}
    ], errorRoute, render);

    const result = await coordinator.navigate("/account");

    expect(result).toMatchObject({
      status: "redirected",
      redirectTo: expect.objectContaining({pathname: "/sign-in"})
    });
    expect(render).not.toHaveBeenCalled();
  });

  it("passes destination entry state to intercepted navigation callbacks", async () => {
    const historyState = {source: "destination"};
    const beforeEnter = vi.fn(() => true as const);
    const intercept = vi.fn();
    const coordinator = new NavigationCoordinator([
      {path: "/account", component: AccountPage, beforeEnter}
    ], errorRoute, vi.fn());
    const event = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      destination: {
        url: "http://dota-router.local/account",
        getState: () => historyState
      },
      signal: new AbortController().signal,
      intercept
    } as unknown as NavigateEvent;

    coordinator.handleNavigateEvent(event);
    const options = intercept.mock.calls[0][0] as {
      precommitHandler(controller: {redirect(url: string): void}): Promise<void>;
    };
    await options.precommitHandler({redirect: vi.fn()});

    expect(beforeEnter).toHaveBeenCalledWith(expect.objectContaining({historyState}));
  });

  it("surfaces intercepted render failures through the Navigation API handler", async () => {
    const error = new Error("render failed");
    const intercept = vi.fn();
    const coordinator = new NavigationCoordinator([
      {path: "/account", component: AccountPage}
    ], errorRoute, vi.fn().mockRejectedValue(error));
    const event = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: null,
      destination: {
        url: "http://dota-router.local/account",
        getState: () => undefined
      },
      signal: new AbortController().signal,
      intercept
    } as unknown as NavigateEvent;

    coordinator.handleNavigateEvent(event);
    const options = intercept.mock.calls[0][0] as {
      precommitHandler(controller: {redirect(url: string): void}): Promise<void>;
      handler(): Promise<void>;
    };
    await options.precommitHandler({redirect: vi.fn()});

    await expect(options.handler()).rejects.toBe(error);
  });
});

describe("HistoryCoordinator", () => {
  it("commits a programmatic navigation through history", async () => {
    const coordinator = new HistoryCoordinator(
      [{path: "/", component: HomePage}],
      errorRoute,
      vi.fn()
    );

    const result = await coordinator.navigate("/", {historyState: {source: "test"}});

    expect(result.status).toBe("completed");
    expect(window.location.pathname).toBe("/");
    expect(window.history.state).toEqual({source: "test"});
  });
});
