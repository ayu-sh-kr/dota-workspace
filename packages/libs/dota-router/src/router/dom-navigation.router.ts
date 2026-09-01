import {
  ComponentClass,
  GlobalNavigationHooks,
  NavigationOption,
  RouteConfig,
  RouteRenderer,
  Router
} from "@dota/Types";
import {NavigationCoordinator} from "@dota/coordinator/NavigationCoordinator";
import {createRouteRenderer} from "@dota/coordinator/route-renderer";

/** Native Navigation API result tracked by fire-and-forget traversal commands. */
type BrowserTraversalResult = ReturnType<Navigation["back"]>;

/** Connects the Navigation API event source to guarded route transitions. */
export class DomNavigationRouter<T extends HTMLElement> implements Router<T> {

  public readonly routes: RouteConfig<T>[];
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
   * @param globalHooks - Optional application-wide navigation callbacks.
   */
  constructor(
    routes: RouteConfig<T>[],
    errorRoute: RouteConfig<T>,
    defaultRoute: RouteConfig<T>,
    root: ComponentClass,
    renderer?: RouteRenderer<T>,
    globalHooks?: GlobalNavigationHooks<T>
  ) {
    if (!routes || routes.length === 0) throw new Error('Routes configuration cannot be empty.');
    this.routes = routes;
    this.errorRoute = errorRoute;
    this.defaultRoute = defaultRoute;
    this.root = root;
    this.renderer = renderer ?? createRouteRenderer(root);
    this.coordinator = new NavigationCoordinator(this.routes, this.errorRoute, this.renderer, globalHooks);
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
    });
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
   * Requests the preceding Navigation API entry when one is available.
   * The resulting `navigate` event runs guards before commit and lifecycle hooks
   * after the browser accepts the traversal.
   */
  back(): void {
    if (!window.navigation.canGoBack) return;
    this.observeTraversal(window.navigation.back());
  }

  /**
   * Requests the succeeding Navigation API entry when one is available.
   * The resulting `navigate` event runs guards before commit and lifecycle hooks
   * after the browser accepts the traversal.
   */
  forth(): void {
    if (!window.navigation.canGoForward) return;
    this.observeTraversal(window.navigation.forward());
  }

  /**
   * Prevents expected guard cancellation from becoming an unhandled rejection.
   * Unexpected browser or lifecycle failures remain visible through a scoped error.
   * @param traversal - Native result whose completion represents the full traversal.
   */
  private observeTraversal(traversal: BrowserTraversalResult): void {
    if (!traversal.finished) return;

    void traversal.finished.catch(error => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("[dota-router] History traversal failed.", error);
    });
  }

  /**
   * Preserves the legacy static Navigation API helper for instance-free callers.
   * The browser-generated `navigate` event remains responsible for interception.
   * @param path - Application path normalized against the current origin.
   * @param options - Retained legacy options; currently ignored.
   */
  static route(path: string, options?: NavigationOption): void {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const navigationDestination = {
      url: new URL(normalizedPath, window.location.origin).toString()
    };
    window.navigation.navigate(navigationDestination.url);
  }
}
