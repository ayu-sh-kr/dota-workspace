import {BaseElement, bootstrap, Component} from "@ayu-sh-kr/dota-core";
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {DotaRouterService} from "@dota/DotaRouterService";
import {Route} from "@dota/route.decorator";
import {DomHistoryRouter, DomNavigationRouter} from "@dota/router";
import {ComponentClass, RouteConfig} from "@dota/Types";

const transitionEvents: string[] = [];

@Component({selector: "integration-app-root"})
class IntegrationAppRoot extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    return "<main>Router shell</main>";
  }
}

@Route({
  path: "/",
  beforeLeave: context => {
    transitionEvents.push(`guard:leave:home:${context.params.projectId ?? "none"}`);
    return true;
  },
  afterLeave: context => {
    transitionEvents.push(`hook:leave:home:${context.params.projectId ?? "none"}`);
  }
})
@Component({selector: "integration-home-page"})
class IntegrationHomePage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    transitionEvents.push("render:home");
    return "<h1>Integration home</h1>";
  }
}

@Route({
  path: "/workspace",
  beforeEnter: () => {
    transitionEvents.push("guard:enter:workspace");
    return true;
  },
  afterEnter: () => {
    transitionEvents.push("hook:enter:workspace");
  }
})
@Component({selector: "integration-workspace-page"})
class IntegrationWorkspacePage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    return "<h1>Workspace</h1>";
  }
}

@Route({
  path: "/workspace/projects",
  beforeEnter: () => {
    transitionEvents.push("guard:enter:projects");
    return true;
  },
  afterEnter: () => {
    transitionEvents.push("hook:enter:projects");
  }
})
@Component({selector: "integration-projects-page"})
class IntegrationProjectsPage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    return "<h1>Projects</h1>";
  }
}

@Route({
  path: "/workspace/projects/:projectId",
  beforeEnter: context => {
    transitionEvents.push(`guard:enter:project:${context.params.projectId}`);
    return true;
  },
  afterEnter: context => {
    transitionEvents.push(`hook:enter:project:${context.params.projectId}`);
  }
})
@Component({selector: "integration-project-page"})
class IntegrationProjectPage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    return "<h1>Project</h1>";
  }
}

@Route({
  path: "/workspace/projects/:projectId/settings",
  beforeEnter: context => {
    const projectId = context.params.projectId;
    transitionEvents.push(`guard:enter:settings:${projectId}`);

    if (projectId === "blocked") return false;
    if (projectId === "slow") {
      return new Promise<true>(resolve => {
        if (context.signal.aborted) {
          resolve(true);
          return;
        }
        context.signal.addEventListener("abort", () => resolve(true), {once: true});
      });
    }
    return true;
  },
  afterEnter: context => {
    transitionEvents.push(`hook:enter:settings:${context.params.projectId}`);
  },
  beforeLeave: context => {
    transitionEvents.push(`guard:leave:settings:${context.params.projectId}`);
    return true;
  },
  afterLeave: context => {
    transitionEvents.push(`hook:leave:settings:${context.params.projectId}`);
  }
})
@Component({selector: "integration-settings-page"})
class IntegrationSettingsPage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    transitionEvents.push("render:settings");
    return "<h1>Project settings</h1>";
  }
}

@Route({
  path: "/workspace/projects/:projectId/activity",
  beforeEnter: context => {
    transitionEvents.push(`guard:enter:activity:${context.params.projectId}`);
    return true;
  },
  afterEnter: context => {
    transitionEvents.push(`hook:enter:activity:${context.params.projectId}`);
  }
})
@Component({selector: "integration-activity-page"})
class IntegrationActivityPage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    transitionEvents.push("render:activity");
    return "<h1>Project activity</h1>";
  }
}

@Component({selector: "integration-error-page"})
class IntegrationErrorPage extends BaseElement {
  constructor() {
    super();
  }

  render(): string {
    transitionEvents.push("render:error");
    return "<h1>Route not found</h1>";
  }
}

const components: ComponentClass[] = [
  IntegrationHomePage,
  IntegrationWorkspacePage,
  IntegrationProjectsPage,
  IntegrationProjectPage,
  IntegrationSettingsPage,
  IntegrationActivityPage
];
const defaultRoute: RouteConfig<HTMLElement> = {
  path: "/",
  component: IntegrationHomePage,
  default: true
};
const errorRoute: RouteConfig<HTMLElement> = {
  path: "/error",
  component: IntegrationErrorPage
};

const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

function mountRoot(): IntegrationAppRoot {
  const root = document.createElement("integration-app-root") as IntegrationAppRoot;
  root.id = "integration-app-root";
  document.body.appendChild(root);
  return root;
}

function createHistoryService() {
  return DotaRouterService.fromComponents({
    router: DomHistoryRouter,
    components,
    errorRoute,
    defaultRoute,
    root: IntegrationAppRoot
  });
}

beforeAll(() => {
  bootstrap([
    IntegrationAppRoot,
    IntegrationHomePage,
    IntegrationWorkspacePage,
    IntegrationProjectsPage,
    IntegrationProjectPage,
    IntegrationSettingsPage,
    IntegrationActivityPage,
    IntegrationErrorPage
  ]);
});

beforeEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
  transitionEvents.length = 0;
  mountRoot();
});

afterEach(() => {
  vi.restoreAllMocks();
  transitionEvents.length = 0;
  document.body.innerHTML = "";
});

describe("DotaRouterService happy-dom integration", () => {
  it("collects decorated routes, initializes the history chain, and mounts a real component", async () => {
    const service = createHistoryService();

    service.init();
    await settle();

    const home = document.querySelector("integration-home-page");
    const workspace = service._routes.find(route => route.path === "/workspace");
    const project = workspace?.children
      ?.find(route => route.path === "/projects")
      ?.children?.find(route => route.path === "/:projectId");

    expect(service.instance).toBeInstanceOf(DomHistoryRouter);
    expect(home).toBeInstanceOf(IntegrationHomePage);
    expect(home?.textContent).toContain("Integration home");
    expect(project?.slug).toBe(true);
    expect(project?.children?.[0].path).toBe("/settings");
  });

  it("executes a deep slug transition from service route to real DOM in exact order", async () => {
    const service = createHistoryService();
    service.init();
    await settle();
    transitionEvents.length = 0;

    service.route("/workspace/projects/alpha/settings?tab=members#advanced");
    await settle();

    const settings = document.querySelector("integration-settings-page");

    expect(window.location.pathname).toBe("/workspace/projects/alpha/settings");
    expect(window.location.search).toBe("?tab=members");
    expect(window.location.hash).toBe("#advanced");
    expect(settings).toBeInstanceOf(IntegrationSettingsPage);
    expect(settings?.getAttribute("path")).toBe("/workspace/projects/alpha/settings");
    expect(settings?.textContent).toContain("Project settings");
    expect(transitionEvents).toEqual([
      "guard:leave:home:alpha",
      "guard:enter:workspace",
      "guard:enter:projects",
      "guard:enter:project:alpha",
      "guard:enter:settings:alpha",
      "render:settings",
      "hook:leave:home:alpha",
      "hook:enter:workspace",
      "hook:enter:projects",
      "hook:enter:project:alpha",
      "hook:enter:settings:alpha"
    ]);
  });

  it("preserves history and the mounted page when a nested guard cancels", async () => {
    const service = createHistoryService();
    service.init();
    await settle();
    transitionEvents.length = 0;

    service.route("/workspace/projects/blocked/settings");
    await settle();

    expect(window.location.pathname).toBe("/");
    expect(document.querySelector("integration-home-page")).toBeInstanceOf(IntegrationHomePage);
    expect(document.querySelector("integration-settings-page")).toBeNull();
    expect(transitionEvents).toEqual([
      "guard:leave:home:blocked",
      "guard:enter:workspace",
      "guard:enter:projects",
      "guard:enter:project:blocked",
      "guard:enter:settings:blocked"
    ]);
  });

  it("runs only changed leaf hooks when navigating between nested sibling pages", async () => {
    const service = createHistoryService();
    service.init();
    await settle();
    service.route("/workspace/projects/alpha/settings");
    await settle();
    transitionEvents.length = 0;

    service.route("/workspace/projects/alpha/activity");
    await settle();

    const activity = document.querySelector("integration-activity-page");

    expect(activity).toBeInstanceOf(IntegrationActivityPage);
    expect(activity?.textContent).toContain("Project activity");
    expect(document.querySelector("integration-settings-page")).toBeNull();
    expect(transitionEvents).toEqual([
      "guard:leave:settings:alpha",
      "guard:enter:activity:alpha",
      "render:activity",
      "hook:leave:settings:alpha",
      "hook:enter:activity:alpha"
    ]);
  });

  it("renders the real fallback component after an unmatched deep route", async () => {
    const service = createHistoryService();
    service.init();
    await settle();
    transitionEvents.length = 0;

    service.route("/workspace/unknown/deep/path");
    await settle();

    const fallback = document.querySelector("integration-error-page");

    expect(window.location.pathname).toBe("/workspace/unknown/deep/path");
    expect(fallback).toBeInstanceOf(IntegrationErrorPage);
    expect(fallback?.getAttribute("message")).toBe("Path not found");
    expect(fallback?.getAttribute("path")).toBe("/workspace/unknown/deep/path");
    expect(fallback?.textContent).toContain("Route not found");
    expect(transitionEvents).toEqual([
      "guard:leave:home:none",
      "render:error",
      "hook:leave:home:none"
    ]);
  });

  it("aborts Navigation API precommit before history, DOM, or after-hooks change", async () => {
    const originalNavigation = Object.getOwnPropertyDescriptor(window, "navigation");
    let navigateListener: ((event: NavigateEvent) => void) | undefined;
    const navigation = {
      addEventListener: vi.fn((name: string, listener: (event: NavigateEvent) => void) => {
        if (name === "navigate") navigateListener = listener;
      }),
      navigate: vi.fn()
    };
    Object.defineProperty(window, "navigation", {
      configurable: true,
      value: navigation
    });

    try {
      const service = DotaRouterService.fromComponents({
        router: DomNavigationRouter,
        components,
        errorRoute,
        defaultRoute,
        root: IntegrationAppRoot
      });
      service.init();
      await settle();
      transitionEvents.length = 0;

      const abortController = new AbortController();
      const intercept = vi.fn();
      const event = {
        canIntercept: true,
        hashChange: false,
        downloadRequest: null,
        destination: {
          url: new URL("/workspace/projects/slow/settings", window.location.origin).href,
          getState: () => undefined
        },
        signal: abortController.signal,
        intercept
      } as unknown as NavigateEvent;

      navigateListener?.(event);
      const options = intercept.mock.calls[0][0] as NavigationInterceptOptions & {
        precommitHandler(controller: {redirect(url: string): void}): Promise<void>;
        handler(): Promise<void>;
      };
      const precommit = options.precommitHandler({redirect: vi.fn()});
      await flushMicrotasks();
      abortController.abort();

      await expect(precommit).rejects.toMatchObject({name: "AbortError"});
      expect(window.location.pathname).toBe("/");
      expect(document.querySelector("integration-home-page")).toBeInstanceOf(IntegrationHomePage);
      expect(document.querySelector("integration-settings-page")).toBeNull();
      expect(transitionEvents).toEqual([
        "guard:leave:home:slow",
        "guard:enter:workspace",
        "guard:enter:projects",
        "guard:enter:project:slow",
        "guard:enter:settings:slow"
      ]);
    } finally {
      if (originalNavigation) {
        Object.defineProperty(window, "navigation", originalNavigation);
      } else {
        Reflect.deleteProperty(window, "navigation");
      }
    }
  });
});
