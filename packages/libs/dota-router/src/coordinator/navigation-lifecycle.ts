import {
  NavigationContext,
  RouteConfig,
  RouteGuardResult
} from "@dota/Types";

/**
 * Executes one guard phase for the supplied route order.
 * The function has no coordinator state: callers choose the entering or leaving
 * branch order, and each route callback receives only the shared navigation context.
 * @param routes - Routes whose guards should run in the supplied order.
 * @param hook - Guard phase to invoke on each route.
 * @param context - Current and destination navigation state visible to every guard.
 * @returns Allow, cancellation, or the first redirect requested by a guard.
 */
export async function runRouteGuards<T extends HTMLElement>(
  routes: readonly RouteConfig<T>[],
  hook: "beforeEnter" | "beforeLeave",
  context: NavigationContext<T>
): Promise<RouteGuardResult> {
  for (const route of routes) {
    const guard = route[hook];
    if (!guard) continue;

    const result = await guard(context);
    if (result !== true) return result;
    if (context.signal.aborted) return false;
  }

  return true;
}

/**
 * Executes lifecycle callbacks for the supplied route order after a transition has
 * been accepted. Like guard execution, it depends only on the routes and context;
 * reversing leave order or selecting an entering branch is the caller's policy.
 * @param routes - Routes whose lifecycle callbacks should run in the supplied order.
 * @param hook - Lifecycle phase to invoke on each route.
 * @param context - Completed transition state shared with every callback.
 */
export async function runRouteLifecycleHooks<T extends HTMLElement>(
  routes: readonly RouteConfig<T>[],
  hook: "afterEnter" | "afterLeave",
  context: NavigationContext<T>
): Promise<void> {
  for (const route of routes) {
    await route[hook]?.(context);
  }
}
