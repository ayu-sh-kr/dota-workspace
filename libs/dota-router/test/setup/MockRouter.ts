import {ComponentClass, RouteConfig, Router} from "@dota/Types";
import {vi} from "vitest";

export class MockRouter implements Router<HTMLElement> {

  routes: RouteConfig<HTMLElement>[];
  errorRoute: RouteConfig<HTMLElement>;
  defaultRoute: RouteConfig<HTMLElement>;
  root: ComponentClass;
  init: () => void;
  route: (path: string) => void;

  constructor(
    routes: RouteConfig<HTMLElement>[],
    defaultRoute: RouteConfig<HTMLElement>,
    errorRoute: RouteConfig<HTMLElement>,
    root: ComponentClass,
    mockInit: () => void = vi.fn(),
    mockRoute: (path: string) => void = vi.fn()
  ) {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.errorRoute = errorRoute;
    this.root = root;
    this.init = mockInit;
    this.route = mockRoute;
  }
}