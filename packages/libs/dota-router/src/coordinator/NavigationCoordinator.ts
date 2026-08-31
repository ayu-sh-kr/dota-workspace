import {
  GlobalNavigationHooks,
  NavigationOptions,
  NavigationPreparationResult,
  NavigationResult,
  PreparedNavigation,
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

/** Provides the redirect operation exposed by a Navigation API precommit callback. */
type NavigationPrecommitController = {
  redirect(url: string): void;
}

/** Bridges newer Navigation API precommit options to the current DOM library types. */
type NavigationInterceptWithPrecommit = NavigationInterceptOptions & {
  precommitHandler(controller: NavigationPrecommitController): Promise<void>;
}

/**
 * Coordinates the Navigation API's precommit and post-commit callbacks.
 * Browser navigation remains responsible for committing the URL; this class only
 * resolves routes, runs hooks, and renders the match approved by precommit guards.
 */
export class NavigationCoordinator<T extends HTMLElement = HTMLElement> implements Coordinator<T> {
  private currentMatch?: RouteMatch<T>;

  /**
   * Creates a Navigation API coordinator around a configured tree and renderer.
   * @param routes - Segment tree used to resolve navigation destinations.
   * @param errorRoute - Fallback route used when a destination is unmatched.
   * @param renderer - Callback that mounts an approved route match.
   * @param globalHooks - Application-wide callbacks wrapped around route lifecycle work.
   */
  constructor(public readonly routes: RouteConfig<T>[], public readonly errorRoute: RouteConfig<T>, public readonly renderer: RouteRenderer<T>, public readonly globalHooks: GlobalNavigationHooks<T> = {}) {}

  /**
   * Installs an intercept handler for one Navigation API event.
   * Guards run in `precommitHandler`; rendering and after-hooks run only after the
   * browser commits, preventing canceled routes from changing application output.
   * @param event - Browser navigation event to intercept when eligible.
   */
  handleNavigateEvent(event: NavigateEvent): void {
    if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) return;

    const destination = toNavigationUrl(event.destination.url);
    const coordinator = this;
    let prepared: PreparedNavigation<T> | undefined;

    const interceptOptions: NavigationInterceptWithPrecommit = {
      async precommitHandler(controller) {
        const result = await coordinator.prepare(destination, event.signal, event.destination.getState());

        if (result.status !== "prepared") {
          if (result.status === "redirected") {
            controller.redirect(result.redirectTo.href);
            return;
          }

          if (result.status === "cancelled") {
            throw new DOMException("Navigation canceled by route guard", "AbortError");
          }

          if (result.status === "failed") throw result.error;
          throw new Error(`Unexpected navigation preparation result: ${result.status}`);
        }

        prepared = result.prepared;
      },
      async handler() {
        if (!prepared) throw new Error("Navigation completed without a prepared route");
        const result = await coordinator.complete(prepared);
        if (result.status === "failed") throw result.error;
      }
    };

    // TypeScript's DOM library may lag browsers that already expose precommitHandler.
    event.intercept(interceptOptions as NavigationInterceptOptions);
  }

  /**
   * Resolves a destination and runs before-hooks without changing the browser state.
   * This phase is separated so Navigation API cancellation can be rejected before commit.
   * @param url - Absolute destination URL supplied by the navigation event.
   * @param signal - Event signal used to cancel pending guard work.
   * @param historyState - State associated with the destination entry.
   * @returns A prepared transition or a typed guard outcome.
   */
  async prepare(url: URL, signal: AbortSignal, historyState: unknown): Promise<NavigationPreparationResult<T>> {
    const match = resolveRoute(url, this.routes, this.errorRoute);
    const context = createNavigationContext(url, this.currentMatch, match, signal, historyState);
    const branchDelta = getBranchDelta(this.currentMatch, match);

    try {
      const globalResult = await runGlobalGuards(this.globalHooks.beforeEach ?? [], context);
      if (globalResult !== true) return toNavigationResult(globalResult, match, context);

      const leaveResult = await runRouteGuards(branchDelta.leaving, "beforeLeave", context);
      if (leaveResult !== true) return toNavigationResult(leaveResult, match, context);

      const enterResult = await runRouteGuards(branchDelta.entering, "beforeEnter", context);
      if (enterResult !== true) return toNavigationResult(enterResult, match, context);
      if (signal.aborted) return {status: "cancelled"};

      return {status: "prepared", prepared: {match, context, branchDelta}};
    } catch (error) {
      if (signal.aborted) return {status: "cancelled"};
      return {status: "failed", match, phase: "guards", error};
    }
  }

  /**
   * Renders a prepared match and runs after-hooks after the browser commit succeeds.
   * @param prepared - Exact guarded match retained from the precommit phase.
   * @returns Completed navigation result, or a failed result when rendering rejects.
   */
  async complete(prepared: PreparedNavigation<T>): Promise<NavigationResult<T>> {
    if (prepared.context.signal.aborted) return {status: "cancelled", match: prepared.match};

    try {
      await this.renderer(prepared.match, prepared.context);
    } catch (error) {
      return {status: "failed", match: prepared.match, phase: "render", error};
    }

    if (prepared.context.signal.aborted) return {status: "cancelled", match: prepared.match};
    this.currentMatch = prepared.match;

    try {
      await runRouteLifecycleHooks(prepared.branchDelta.leaving, "afterLeave", prepared.context);
      await runRouteLifecycleHooks(prepared.branchDelta.entering, "afterEnter", prepared.context);
      await runGlobalLifecycleHooks(this.globalHooks.afterEach ?? [], prepared.context);
    } catch (error) {
      return {status: "failed", match: prepared.match, phase: "lifecycle", error};
    }

    return {status: "completed", match: prepared.match};
  }

  /**
   * Provides a direct initial-navigation entry point without creating a browser commit.
   * @param url - Current document URL to resolve and render.
   * @param options - Optional abort signal and history state for the context.
   * @returns The prepared or completed navigation result.
   */
  async navigate(url: string | URL, options: NavigationOptions = {}): Promise<NavigationResult<T>> {
    const destination = toNavigationUrl(url);
    const result = await this.prepare(destination, options.signal ?? new AbortController().signal, options.historyState);
    if (result.status !== "prepared") return result;
    return this.complete(result.prepared);
  }

}
