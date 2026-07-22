import {ComponentClass, NavigationOption, RouteConfig, RouteRenderer, Router} from "@dota/Types";
import {NavigationCoordinator} from "@dota/coordinator/NavigationCoordinator";
import {createRouteRenderer} from "@dota/coordinator/route-renderer";

/** Connects the Navigation API event source to guarded route transitions. */
export class DomNavigationRouter<T extends HTMLElement> implements Router<T> {

  public readonly routes: RouteConfig<T>[]
  public readonly errorRoute: RouteConfig<T>;
  public readonly defaultRoute: RouteConfig<T>;
  public readonly root: ComponentClass;
  public readonly renderer: RouteRenderer<T>;
  private readonly coordinator: NavigationCoordinator<T>;

  /**
   * Creates a Navigation API adapter and prepares the current URL transition.
   * @param routes - Configured segment tree used by the navigation coordinator.
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
    if (!routes || routes.length === 0) throw new Error('Routes configuration cannot be empty.');
    this.routes = routes;
    this.errorRoute = errorRoute;
    this.defaultRoute = defaultRoute;
    this.root = root;
    this.renderer = renderer ?? createRouteRenderer(root);
    this.coordinator = new NavigationCoordinator(this.routes, this.errorRoute, this.renderer);
    this.init();
    void this.coordinator.navigate(window.location.href);
  }

  /**
   * Registers Navigation API interception with the coordinator.
   * Unsupported, hash-only, and download navigations remain browser-managed.
   */
  init(): void {
    const navigation: Navigation = window.navigation;
    navigation.addEventListener('navigate', (event: NavigateEvent) => {
      if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) {
        return;
      }

      this.coordinator.handleNavigateEvent(event);
    })
  }

  /**
   * Starts a Navigation API transition through the coordinator.
   * The browser owns interception and commit while the coordinator owns guards
   * and presentation of the approved match.
   * @param path - Destination path normalized by the browser navigation adapter.
   */
  route(path: string): void {
    DomNavigationRouter.route(path);
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
