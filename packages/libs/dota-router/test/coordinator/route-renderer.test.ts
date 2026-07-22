import {afterEach, describe, expect, it, vi} from "vitest";
import {createRouteRenderer} from "@dota/coordinator";
import {AppComponent, ContactComponent, CustomRenderComponent, ErrorComponent} from "@test/setup/Components";
import {NavigationContext, RouteConfig, RouteMatch} from "@dota/Types";

const context = (pathname: string): NavigationContext<HTMLElement> => ({
  currentMatch: undefined,
  nextMatch: {} as RouteMatch<HTMLElement>,
  signal: new AbortController().signal,
  params: {},
  url: new URL(pathname, window.location.origin),
  historyState: undefined
});

const matchFor = (route: RouteConfig<HTMLElement>, matched: boolean, pathname: string): RouteMatch<HTMLElement> => ({
  route,
  matched,
  branch: [],
  params: {},
  pathname,
  searchParams: new URLSearchParams(),
  hash: ""
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createRouteRenderer", () => {
  it("mounts the matched component in the decorated root", () => {
    const root = document.createElement("app-root");
    root.id = "app-root";
    document.body.appendChild(root);
    const renderer = createRouteRenderer(AppComponent);
    const match = matchFor(
      {path: "/contact", component: ContactComponent},
      true,
      "/contact"
    );

    renderer(match, context("/contact"));

    expect(root.innerHTML).toContain("dota-contact");
  });

  it("uses a route render callback instead of mounting a component", () => {
    const root = document.createElement("app-root");
    root.id = "app-root";
    document.body.appendChild(root);
    const customRender = vi.fn();
    const renderer = createRouteRenderer(AppComponent);
    const match = matchFor(
      {path: "/custom", component: CustomRenderComponent, render: customRender},
      true,
      "/custom"
    );

    renderer(match, context("/custom"));

    expect(customRender).toHaveBeenCalledWith("/custom");
    expect(root.innerHTML).toBe("");
  });

  it("mounts the fallback component for an unmatched match", () => {
    const root = document.createElement("app-root");
    root.id = "app-root";
    document.body.appendChild(root);
    const renderer = createRouteRenderer(AppComponent);
    const match = matchFor(
      {path: "/error", component: ErrorComponent},
      false,
      "/missing"
    );

    renderer(match, context("/missing"));

    expect(root.innerHTML).toContain("dota-error");
    expect(root.innerHTML).toContain("Path not found");
  });
});
