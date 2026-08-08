import {afterEach, describe, expect, it, vi} from "vitest";
import {createRouteRenderer} from "@dota/coordinator";
import {AppComponent, ContactComponent, CustomRenderComponent, ErrorComponent} from "@test/setup/Components";
import {NavigationContext, RouteConfig, RouteMatch} from "@dota/Types";

const context = (pathname: string, initial?: boolean): NavigationContext<HTMLElement> => ({
  initial,
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
  document.head.innerHTML = "";
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

  it("applies route SEO before mounting the component", () => {
    const root = document.createElement("app-root");
    root.id = "app-root";
    document.body.appendChild(root);
    const renderer = createRouteRenderer(AppComponent);
    const seo = {
      title: "Contact",
      description: "Contact the Dota team",
      keywords: ["dota", "contact"],
      canonical: "https://dota.example/contact",
      robots: "index,follow",
      og: {
        title: "Contact Dota",
        type: "website"
      },
      twitter: {
        card: "summary",
        title: "Contact Dota"
      }
    };
    const match = matchFor(
      {path: "/contact", component: ContactComponent, seo},
      true,
      "/contact"
    );

    renderer(match, context("/contact"));

    expect(document.title).toBe("Contact");
    expect(document.head.querySelector('meta[name="keywords"]')?.getAttribute("content")).toBe("dota, contact");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://dota.example/contact");
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("website");
    expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary");
  });

  it("warns before discarding server-rendered output on the initial render", () => {
    const root = document.createElement("app-root");
    root.id = "app-root";
    const serverPage = document.createElement("dota-contact");
    serverPage.setAttribute("data-dh-route", "true");
    root.appendChild(serverPage);
    document.body.appendChild(root);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const renderer = createRouteRenderer(AppComponent);
    const match = matchFor(
      {path: "/contact", component: ContactComponent},
      true,
      "/contact"
    );

    renderer(match, context("/contact", true));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Discarding server-rendered output"));
    expect(root.innerHTML).toContain("dota-contact");
  });

  it("does not warn on a later navigation that overwrites unmarked output", () => {
    const root = document.createElement("app-root");
    root.id = "app-root";
    document.body.appendChild(root);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const renderer = createRouteRenderer(AppComponent);
    const match = matchFor(
      {path: "/contact", component: ContactComponent},
      true,
      "/contact"
    );

    renderer(match, context("/contact", false));

    expect(warn).not.toHaveBeenCalled();
  });

  it("logs a missing root element by default instead of throwing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const renderer = createRouteRenderer(AppComponent);
    const match = matchFor(
      {path: "/contact", component: ContactComponent},
      true,
      "/contact"
    );

    expect(() => renderer(match, context("/contact"))).not.toThrow();
    expect(error).toHaveBeenCalledWith("Root element not found for selector: app-root");
  });

  it("throws on a missing root element when configured with the strict error policy", () => {
    const renderer = createRouteRenderer(AppComponent, {onError: "throw"});
    const match = matchFor(
      {path: "/contact", component: ContactComponent},
      true,
      "/contact"
    );

    expect(() => renderer(match, context("/contact"))).toThrow(
      "Root element not found for selector: app-root"
    );
  });

  it("throws on missing component metadata when configured with the strict error policy", () => {
    class UndecoratedComponent extends HTMLElement {}
    const root = document.createElement("app-root");
    root.id = "app-root";
    document.body.appendChild(root);
    const renderer = createRouteRenderer(AppComponent, {onError: "throw"});
    const match = matchFor(
      {path: "/dummy", component: UndecoratedComponent},
      true,
      "/dummy"
    );

    expect(() => renderer(match, context("/dummy"))).toThrow(
      "Component metadata not found for path: /dummy"
    );
  });
});
