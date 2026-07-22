import {afterEach, describe, expect, it, vi} from "vitest";
import {RouterUtils} from "@dota/RouterUtils";
import {Router} from "@dota/Types";

const originalNavigation = Object.getOwnPropertyDescriptor(window, "navigation");

afterEach(() => {
  if (originalNavigation) {
    Object.defineProperty(window, "navigation", originalNavigation);
  } else {
    Reflect.deleteProperty(window, "navigation");
  }
  vi.restoreAllMocks();
});

describe("RouterUtils path helpers", () => {
  it("returns the previous navigation entry pathname when one exists", () => {
    Object.defineProperty(window, "navigation", {
      configurable: true,
      value: {
        entries: () => [
          {url: "http://router.local/home"},
          {url: "http://router.local/account"}
        ]
      }
    });

    expect(RouterUtils.getPreviousPath()).toBe("/home");
  });

  it("returns an empty previous path when the navigation stack has one entry", () => {
    Object.defineProperty(window, "navigation", {
      configurable: true,
      value: {entries: () => [{url: "http://router.local/home"}]}
    });

    expect(RouterUtils.getPreviousPath()).toBe("");
  });

  it("returns the browser pathname and removes a known path prefix", () => {
    expect(RouterUtils.getCurrentPath()).toBe(window.location.pathname);
    expect(RouterUtils.getNextPath("/account", "/account/settings")).toBe("/settings");
  });

  it("calculates parent paths and identifies parent-level paths", () => {
    expect(RouterUtils.getParentPath("/account/settings/profile")).toBe("/account/settings");
    expect(RouterUtils.getParentPath("/account")).toBe("/");
    expect(RouterUtils.isParent("/")).toBe(true);
    expect(RouterUtils.isParent("/account")).toBe(true);
    expect(RouterUtils.isParent("/account/settings")).toBe(false);
  });

  it("normalizes a path before delegating to a router", () => {
    const router = {route: vi.fn()} as unknown as Router<HTMLElement>;

    RouterUtils.route(router, "account/settings");

    expect(router.route).toHaveBeenCalledWith("/account/settings");
  });
});
