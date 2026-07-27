import {
  ComponentClass,
  GlobalNavigationHooks,
  RouteConfig,
  RouteRenderer,
  Router
} from "@dota/Types";
import {vi} from "vitest";

export class MockRouter implements Router<HTMLElement> {

  routes: RouteConfig<HTMLElement>[];
  errorRoute: RouteConfig<HTMLElement>;
  defaultRoute: RouteConfig<HTMLElement>;
  root: ComponentClass;
  renderer?: RouteRenderer<HTMLElement>;
  globalHooks?: GlobalNavigationHooks<HTMLElement>;
  init: () => void = vi.fn();
  route: (path: string) => void = vi.fn();

  constructor(
    routes: RouteConfig<HTMLElement>[],
    errorRoute: RouteConfig<HTMLElement>,
    defaultRoute: RouteConfig<HTMLElement>,
    root: ComponentClass,
    renderer?: RouteRenderer<HTMLElement>,
    globalHooks?: GlobalNavigationHooks<HTMLElement>
  ) {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.errorRoute = errorRoute;
    this.root = root;
    this.renderer = renderer;
    this.globalHooks = globalHooks;
  }
}
