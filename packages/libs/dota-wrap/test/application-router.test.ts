import {afterEach, describe, expect, it, vi} from "vitest";
import {registerRoutes} from "../src";
import {RouteConfig} from "../src/router";

class AppRoot extends HTMLElement {}
class HomePage extends HTMLElement {}
class ErrorPage extends HTMLElement {}

const homeRoute: RouteConfig<HTMLElement> = {
  path: "/",
  component: HomePage,
  default: true
};
const errorRoute: RouteConfig<HTMLElement> = {
  path: "/error",
  component: ErrorPage
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("application router setup", () => {
  it("forwards global navigation hooks to the initialized router", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const beforeEach = vi.fn(() => true as const);
    const afterEach = vi.fn();
    const routerService = await registerRoutes(
      [HomePage],
      errorRoute,
      homeRoute,
      AppRoot,
      [homeRoute],
      {beforeEach: [beforeEach], afterEach: [afterEach]}
    );

    routerService.init();
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(beforeEach).toHaveBeenCalledWith(expect.objectContaining({
      nextMatch: expect.objectContaining({pathname: "/"})
    }));
    expect(afterEach).toHaveBeenCalledTimes(1);
  });
});
