import {NavigationOption, RouteConfig, Router} from "@dota/Types";
import {RouterUtils} from "@dota/RouterUtils";

export class DomHistoryRouter<T extends HTMLElement> implements Router<T>{

  readonly routes: RouteConfig<T>[];
  readonly errorRoute: RouteConfig<T>;
  readonly defaultRoute: RouteConfig<T>;


  constructor(
    routes: RouteConfig<T>[],
    errorRoute: RouteConfig<T>,
    defaultRoute: RouteConfig<T>,
  ) {
    this.defaultRoute = defaultRoute;
    this.errorRoute = errorRoute;
    this.routes = routes;
    this.init();

    // handle initial navigation
    const url = new URL(window.location.href);
    RouterUtils.render({
      router: this,
      routes: this.routes,
      options: {},
      path: url.pathname
    });
  }

  init(): void {
    window.addEventListener('popstate', (event: PopStateEvent) => {
      event.preventDefault();
      const path = window.location.pathname;
      RouterUtils.render({
        router: this,
        routes: this.routes,
        options: {},
        path: path
      });
    });
  }

  /**
   * Navigate to a specified path using the Navigation API.
   * This method is responsible for navigating to a new path using the Navigation API.
   * It ensures that the path starts with a slash and creates a navigation destination object.
   * Finally, it triggers the navigation using the Navigation API.
   *
   * @param path - The path to navigate to.
   * @param options - Optional navigation options.
   * @returns void
   */
  static route(path: string, options?: NavigationOption) {
    // Make sure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Create a navigation destination object
    const navigationDestination = {
      url: new URL(normalizedPath, window.location.origin).toString()
    };

    window.history.pushState(null, '', navigationDestination.url);
    window.dispatchEvent(new PopStateEvent('popstate', {state: null}));
  }

}