import {
  GlobalNavigationHooks,
  NavigationContext,
  NavigationOptions,
  NavigationResult,
  RouteConfig,
  RouteMatch,
  RouteRenderer
} from "@dota/Types";
import {resolveRoute} from "@dota/route/route-resolver";
import {
  runGlobalGuards,
  runGlobalLifecycleHooks,
  runRouteGuards,
  runRouteLifecycleHooks
} from "@dota/coordinator/navigation-lifecycle";
import {createNavigationContext, getBranchDelta, toNavigationResult, toNavigationUrl} from "@dota/coordinator/route-transition";
import type {Coordinator} from "@dota/coordinator/Coordinator";

/**
 * Coordinates history-based transitions independently of the Navigation API.
 * It runs guards before writing browser history, then renders and runs after-hooks
 * after the entry is committed; `popstate` callers can disable the second commit.
 */
export class HistoryCoordinator<T extends HTMLElement = HTMLElement> implements Coordinator<T> {
  private currentMatch?: RouteMatch<T>;

  /**
   * Creates a history coordinator with the route and rendering contracts it owns.
   * @param routes - Segment tree used to resolve history destinations.
   * @param errorRoute - Fallback route used when a history destination is unmatched.
   * @param renderer - Callback that mounts an approved route match.
   * @param globalHooks - Application-wide callbacks wrapped around route lifecycle work.
   */
  constructor(public readonly routes: RouteConfig<T>[], public readonly errorRoute: RouteConfig<T>, public readonly renderer: RouteRenderer<T>, public readonly globalHooks: GlobalNavigationHooks<T> = {}) {}

  /**
   * Runs guards, commits a new history entry, renders, and runs after-hooks.
   * @param url - Destination pathname or absolute URL.
   * @param options - History state, replacement policy, and optional signal.
   * @returns The completed, canceled, redirected, or failed transition result.
   */
  async navigate(url: string | URL, options: NavigationOptions = {}): Promise<NavigationResult<T>> {
    const destination = toNavigationUrl(url);
    const signal = options.signal ?? new AbortController().signal;
    const match = resolveRoute(destination, this.routes, this.errorRoute);
    const context = createNavigationContext(destination, this.currentMatch, match, signal, options.historyState);
    const branchDelta = getBranchDelta(this.currentMatch, match);

    try {
      const globalResult = await runGlobalGuards(this.globalHooks.beforeEach ?? [], context);
      if (globalResult !== true) return toNavigationResult(globalResult, match, context);

      const leaveResult = await runRouteGuards(branchDelta.leaving, "beforeLeave", context);
      if (leaveResult !== true) return toNavigationResult(leaveResult, match, context);

      const enterResult = await runRouteGuards(branchDelta.entering, "beforeEnter", context);
      if (enterResult !== true) return toNavigationResult(enterResult, match, context);
      if (signal.aborted) return {status: "cancelled"};

      if (options.commit !== false) this.commit(destination, options);
      await this.renderer(match, context);
      this.currentMatch = match;
      await runRouteLifecycleHooks(branchDelta.leaving, "afterLeave", context);
      await runRouteLifecycleHooks(branchDelta.entering, "afterEnter", context);
      await runGlobalLifecycleHooks(this.globalHooks.afterEach ?? [], context);

      return {status: "completed", match};
    } catch (error) {
      if (signal.aborted) return {status: "cancelled"};
      return {status: "failed", match, error};
    }
  }

  /**
   * Handles a browser-selected history entry without pushing a duplicate entry.
   * @param event - Popstate event carrying the browser entry state.
   * @returns The transition result after resolving and rendering the selected entry.
   */
  handlePopState(event: PopStateEvent): Promise<NavigationResult<T>> {
    return this.navigate(window.location.href, {
      commit: false,
      historyState: event.state
    });
  }

  /**
   * Writes the accepted destination before rendering so the visible URL and route agree.
   * Popstate transitions pass `commit: false` and skip this method because the browser
   * has already selected their history entry.
   * @param url - Absolute destination URL to write into the current history entry.
   * @param options - State and replace policy supplied by the navigation caller.
   */
  public commit(url: URL, options: NavigationOptions): void {
    const state = options.historyState ?? null;
    if (options.replace) {
      window.history.replaceState(state, "", url.href);
    } else {
      window.history.pushState(state, "", url.href);
    }
  }

}
