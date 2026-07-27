import {afterEach, describe, expect, it, vi} from "vitest";
import {HistoryCoordinator, NavigationCoordinator} from "@dota/coordinator";
import {RouteConfig} from "@dota/Types";

class StartPage extends HTMLElement {}
class NextPage extends HTMLElement {}
class ErrorPage extends HTMLElement {}

const errorRoute: RouteConfig<HTMLElement> = {path: "/error", component: ErrorPage};
const flush = (): Promise<void> => new Promise(resolve => queueMicrotask(resolve));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("coordinator transition integration", () => {
  it("runs history guards, commit, render, and lifecycle hooks in order", async () => {
    const events: string[] = [];
    const routes: RouteConfig<HTMLElement>[] = [
      {
        path: "/start",
        component: StartPage,
        beforeLeave: () => {
          events.push("beforeLeave");
          return true;
        },
        afterLeave: () => {
          events.push("afterLeave");
        }
      },
      {
        path: "/next",
        component: NextPage,
        beforeEnter: () => {
          events.push("beforeEnter");
          return true;
        },
        afterEnter: () => {
          events.push("afterEnter");
        }
      }
    ];
    const renderer = vi.fn(async match => {
      events.push(`render:${match.pathname}`);
    });
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const coordinator = new HistoryCoordinator(routes, errorRoute, renderer, {
      beforeEach: [
        () => {
          events.push("beforeEach:first");
          return true;
        },
        () => {
          events.push("beforeEach:second");
          return true;
        }
      ],
      afterEach: [
        () => {
          events.push("afterEach:first");
        },
        () => {
          events.push("afterEach:second");
        }
      ]
    });

    await coordinator.navigate("/start");
    events.length = 0;
    const result = await coordinator.navigate("/next");

    expect(result.status).toBe("completed");
    expect(events).toEqual([
      "beforeEach:first",
      "beforeEach:second",
      "beforeLeave",
      "beforeEnter",
      "render:/next",
      "afterLeave",
      "afterEnter",
      "afterEach:first",
      "afterEach:second"
    ]);
    expect(pushState).toHaveBeenCalledTimes(2);
  });

  it("skips route work, commit, rendering, and after hooks when a global guard cancels", async () => {
    const events: string[] = [];
    const renderer = vi.fn();
    const routes: RouteConfig<HTMLElement>[] = [
      {path: "/start", component: StartPage},
      {
        path: "/next",
        component: NextPage,
        beforeEnter: () => {
          events.push("beforeEnter");
          return true;
        },
        afterEnter: () => {
          events.push("afterEnter");
        }
      }
    ];
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const coordinator = new HistoryCoordinator(routes, errorRoute, renderer, {
      beforeEach: [() => {
        events.push("beforeEach");
        return false;
      }],
      afterEach: [() => {
        events.push("afterEach");
      }]
    });
    await coordinator.navigate("/start");
    vi.clearAllMocks();
    events.length = 0;

    const result = await coordinator.navigate("/next");

    expect(result.status).toBe("cancelled");
    expect(events).toEqual(["beforeEach"]);
    expect(renderer).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("resolves a global redirect without committing or rendering the destination", async () => {
    const renderer = vi.fn();
    const routes: RouteConfig<HTMLElement>[] = [
      {
        path: "/private",
        component: NextPage
      }
    ];
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const coordinator = new HistoryCoordinator(routes, errorRoute, renderer, {
      beforeEach: [() => "/sign-in"]
    });

    const result = await coordinator.navigate("/private");

    expect(result.status).toBe("redirected");
    expect(result.redirectTo?.pathname).toBe("/sign-in");
    expect(renderer).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("stops an asynchronous guard chain when its transition signal aborts", async () => {
    const controller = new AbortController();
    const renderer = vi.fn();
    const routes: RouteConfig<HTMLElement>[] = [
      {
        path: "/next",
        component: NextPage
      }
    ];
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const coordinator = new HistoryCoordinator(routes, errorRoute, renderer, {
      beforeEach: [context => new Promise<boolean>(resolve => {
        if (context.signal.aborted) {
          resolve(true);
          return;
        }
        context.signal.addEventListener("abort", () => resolve(true), {once: true});
      })]
    });
    const transition = coordinator.navigate("/next", {signal: controller.signal});

    await flush();
    controller.abort();
    const result = await transition;

    expect(result.status).toBe("cancelled");
    expect(renderer).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("completes Navigation API preparation and rendering with lifecycle ordering", async () => {
    const events: string[] = [];
    const routes: RouteConfig<HTMLElement>[] = [
      {
        path: "/start",
        component: StartPage,
        beforeLeave: () => {
          events.push("beforeLeave");
          return true;
        },
        afterLeave: () => {
          events.push("afterLeave");
        }
      },
      {
        path: "/next",
        component: NextPage,
        beforeEnter: () => {
          events.push("beforeEnter");
          return true;
        },
        afterEnter: () => {
          events.push("afterEnter");
        }
      }
    ];
    const renderer = vi.fn(async () => {
      events.push("render");
    });
    const coordinator = new NavigationCoordinator(routes, errorRoute, renderer, {
      beforeEach: [() => {
        events.push("beforeEach");
        return true;
      }],
      afterEach: [() => {
        events.push("afterEach");
      }]
    });
    await coordinator.navigate("/start");
    events.length = 0;
    const prepared = await coordinator.prepare(
      new URL("/next", window.location.origin),
      new AbortController().signal,
      {source: "navigation"}
    );

    expect(prepared.status).toBe("prepared");
    if (prepared.status !== "prepared") return;

    const result = await coordinator.complete(prepared.prepared);

    expect(result.status).toBe("completed");
    expect(events).toEqual([
      "beforeEach",
      "beforeLeave",
      "beforeEnter",
      "render",
      "afterLeave",
      "afterEnter",
      "afterEach"
    ]);
  });

  it("runs global hooks when the resolved branch does not change", async () => {
    const historyEvents: string[] = [];
    const navigationEvents: string[] = [];
    const routeHook = vi.fn(() => true as const);
    const route: RouteConfig<HTMLElement> = {
      path: "/next",
      component: NextPage,
      beforeEnter: routeHook
    };
    const history = new HistoryCoordinator([route], errorRoute, () => {
      historyEvents.push("render");
    }, {
      beforeEach: [() => {
        historyEvents.push("beforeEach");
        return true;
      }],
      afterEach: [() => {
        historyEvents.push("afterEach");
      }]
    });
    const navigation = new NavigationCoordinator([route], errorRoute, () => {
      navigationEvents.push("render");
    }, {
      beforeEach: [() => {
        navigationEvents.push("beforeEach");
        return true;
      }],
      afterEach: [() => {
        navigationEvents.push("afterEach");
      }]
    });

    await history.navigate("/next", {commit: false});
    await navigation.navigate("/next");
    historyEvents.length = 0;
    navigationEvents.length = 0;
    routeHook.mockClear();

    await history.navigate("/next", {commit: false});
    await navigation.navigate("/next");

    expect(historyEvents).toEqual(["beforeEach", "render", "afterEach"]);
    expect(navigationEvents).toEqual(["beforeEach", "render", "afterEach"]);
    expect(routeHook).not.toHaveBeenCalled();
  });
});
