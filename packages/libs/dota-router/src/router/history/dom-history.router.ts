import {
  ComponentClass,
  GlobalNavigationHooks,
  NavigationOption,
  RouteConfig,
  RouteRenderer,
  Router
} from "@dota/Types";
import {HistoryCoordinator} from "@dota/coordinator/HistoryCoordinator";
import {createRouteRenderer} from "@dota/coordinator/route-renderer";
import {
  handleHistoryPopState,
  HistoryTransitionRuntime,
  navigateHistory,
  prepareHistoryTransition
} from "@dota/router/history/history-transition";

/**
 * Routes applications through the standard DOM History API when the newer Navigation
 * API is unavailable or deliberately not selected. New destinations are guarded before
 * `pushState`; back and forth traversals are processed after the browser emits `popstate`,
 * with rejected router-owned entries restored to the last accepted position.
 * @typeParam T - Route element type produced by the configured renderer.
 */
export class DomHistoryRouter<T extends HTMLElement> implements Router<T> {

  /** Segment tree consulted by the coordinator for every requested destination. */
  readonly routes: RouteConfig<T>[];
  /** Fallback rendered when the selected URL does not match the configured tree. */
  readonly errorRoute: RouteConfig<T>;
  /** Default route retained as part of the shared router contract for consumers. */
  readonly defaultRoute: RouteConfig<T>;
  /** Application component whose route outlet receives the default rendered element. */
  readonly root: ComponentClass;
  /** Presentation boundary invoked after guards approve a resolved route match. */
  readonly renderer: RouteRenderer<T>;
  /** Mutable traversal state shared by programmatic and browser-selected transitions. */
  private readonly historyTransition: HistoryTransitionRuntime<T>;

  /**
   * Prepares an application to use guarded routing through `window.history`.
   * Construction indexes the current entry, subscribes to `popstate`, and processes
   * the current URL without creating a duplicate entry. Indexing must happen first so
   * a later rejected back or forth traversal can recover the accepted destination.
   * @param routes - Configured segment tree used by the history coordinator.
   * @param errorRoute - Fallback route for unresolved destinations.
   * @param defaultRoute - Default route exposed through the shared router contract.
   * @param root - Component whose host receives rendered route elements.
   * @param renderer - Presentation callback; omitted to render into `root` automatically.
   * @param globalHooks - Guards and after-hooks applied around every route transition.
   * @throws Error when no routes are available to resolve the current or future URLs.
   */
  constructor(
    routes: RouteConfig<T>[],
    errorRoute: RouteConfig<T>,
    defaultRoute: RouteConfig<T>,
    root: ComponentClass,
    renderer?: RouteRenderer<T>,
    globalHooks?: GlobalNavigationHooks<T>
  ) {
    if (!routes || routes.length === 0) {
      throw new Error('Routes configuration cannot be empty.');
    }

    this.defaultRoute = defaultRoute;
    this.errorRoute = errorRoute;
    this.routes = routes;
    this.root = root;
    this.renderer = renderer ?? createRouteRenderer(root);

    const coordinator = new HistoryCoordinator(this.routes, this.errorRoute, this.renderer, globalHooks);
    const preparedTransition = prepareHistoryTransition(coordinator, window.history, window.location.href);
    this.historyTransition = preparedTransition.runtime;

    this.init();
    void coordinator.navigate(window.location.href, {
      commit: false,
      historyState: preparedTransition.applicationState
    });
  }

  /**
   * Registers the event boundary required for browser-controlled history traversal.
   * `history.back()`, `history.forward()`, and `history.go()` move before router policy
   * can run, so their `popstate` event is forwarded through guards, rendering, lifecycle,
   * and rejected-entry recovery. Construction invokes this method automatically; calling
   * it again would register another listener for the same traversal.
   */
  init(): void {
    window.addEventListener('popstate', (event: PopStateEvent) => {
      void handleHistoryPopState(this.historyTransition, event);
    });
  }

  /**
   * Navigates to a new application destination, such as from a link or menu action.
   * Unlike `back()` and `forth()`, this creates an indexed history entry, but only after
   * guards approve the destination. Rendering and after-hooks then complete asynchronously.
   * @param path - Relative application path or absolute URL accepted by route resolution.
   */
  route(path: string): void {
    navigateHistory(this.historyTransition, path);
  }

  /**
   * Traverses to the preceding entry for application back buttons or equivalent actions.
   * The command is fire-and-forget: the resulting `popstate` runs route guards, rendering,
   * and lifecycle hooks. A rejected router-owned destination is restored automatically;
   * at the beginning of browser history no event or callbacks occur.
   */
  back(): void {
    window.history.back();
  }

  /**
   * Traverses to the succeeding entry for application forward buttons or equivalent actions.
   * The command is fire-and-forget: the resulting `popstate` runs route guards, rendering,
   * and lifecycle hooks. A rejected router-owned destination is restored automatically;
   * at the end of browser history no event or callbacks occur.
   */
  forth(): void {
    window.history.forward();
  }

  /**
   * Supports legacy callers that cannot access an initialized router or router service.
   * It commits an unindexed entry before emitting `popstate`, so guards cannot run before
   * the URL changes and rejected traversal recovery is unavailable for that entry. New
   * application code should use the instance `route()` method instead.
   * @param path - Same-origin application path normalized with a leading slash.
   * @param options - Compatibility argument retained for callers; it has no effect.
   */
  static route(path: string, options?: NavigationOption): void {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const navigationDestination = {
      url: new URL(normalizedPath, window.location.origin).toString()
    };

    window.history.pushState(null, '', navigationDestination.url);
    window.dispatchEvent(new PopStateEvent('popstate', {state: null}));
  }

}
