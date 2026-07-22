import {ComponentClass, NavigationOption, RouteConfig, RouteRenderer, Router} from "@dota/Types";
import {HistoryCoordinator} from "@dota/coordinator/HistoryCoordinator";
import {createRouteRenderer} from "@dota/coordinator/route-renderer";

/** Connects browser history events to guarded route transitions and rendering. */
export class DomHistoryRouter<T extends HTMLElement> implements Router<T>{

  readonly routes: RouteConfig<T>[];
  readonly errorRoute: RouteConfig<T>;
  readonly defaultRoute: RouteConfig<T>;
  readonly root: ComponentClass;
  readonly renderer: RouteRenderer<T>;
  private readonly coordinator: HistoryCoordinator<T>;

  /**
   * Creates a history adapter and performs the current URL transition once.
   * @param routes - Configured segment tree used by the history coordinator.
   * @param errorRoute - Fallback route for unresolved destinations.
   * @param defaultRoute - Application default route retained by the adapter.
   * @param root - Component whose host receives rendered route elements.
   * @param renderer - Optional presentation callback supplied by the service.
   */
  constructor(
    routes: RouteConfig<T>[],
    errorRoute: RouteConfig<T>,
    defaultRoute: RouteConfig<T>,
    root: ComponentClass,
    renderer?: RouteRenderer<T>
  ) {
    if (!routes || routes.length === 0) {
      throw new Error('Routes configuration cannot be empty.');
    }

    this.defaultRoute = defaultRoute;
    this.errorRoute = errorRoute;
    this.routes = routes;
    this.root = root;
    this.renderer = renderer ?? createRouteRenderer(root);
    this.coordinator = new HistoryCoordinator(this.routes, this.errorRoute, this.renderer);
    this.init();
    void this.coordinator.navigate(window.location.href, {commit: false});
  }

  /**
   * Registers the popstate boundary owned by the history adapter.
   * The browser has already committed a popstate entry, so the coordinator
   * resolves and renders it with its history commit disabled.
   */
  init(): void {
    window.addEventListener('popstate', (event: PopStateEvent) => {
      event.preventDefault();
      void this.coordinator.handlePopState(event);
    });
  }

  /**
   * Starts a guarded history transition through the coordinator.
   * The coordinator commits the URL only after guards approve the destination.
   * @param path - Relative or absolute destination accepted by the route resolver.
   */
  route(path: string): void {
    void this.coordinator.navigate(path);
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
