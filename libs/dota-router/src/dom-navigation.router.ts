import {NavigationOption, RouteConfig, Router} from "@dota/Types";
import {RouterUtils} from "@dota/RouterUtils";

export class DomNavigationRouter<T extends HTMLElement> implements Router<T> {

  public readonly routes: RouteConfig<T>[]
  public readonly errorRoute: RouteConfig<T>;
  public readonly defaultRoute: RouteConfig<T>;

  constructor(
    routes: RouteConfig<T>[],
    errorRoute: RouteConfig<T>,
    defaultRoute: RouteConfig<T>,
  ) {
    this.routes = routes;
    this.errorRoute = errorRoute;
    this.defaultRoute = defaultRoute;
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

  init() {
    const navigation: Navigation = window.navigation;
    navigation.addEventListener('navigate', (event: NavigateEvent) => {
      if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) {
        return;
      }

      const url = new URL(event.destination.url);
      const routes = this.routes;
      const router = this;
      let render = RouterUtils.render;
      event.intercept({
        async handler() {
          render({
            path: url.pathname,
            routes: routes,
            router: router
          });
        }
      })
    })
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
  static route(path: string, options?: NavigationOption): void {
    // Make sure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Create a navigation destination object
    const navigationDestination = {
      url: new URL(normalizedPath, window.location.origin).toString()
    };

    // Trigger navigation using the Navigation API
    window.navigation.navigate(navigationDestination.url);
  }
}