import {
  NavigationContext,
  RouteConfig,
  RouteGuard,
  RouteGuardResult,
  RouteLifecycleHook
} from "@dota/Types";

/**
 * Runs application-wide guards sequentially before route-specific guards.
 * The first cancellation or redirect stops the chain, while an abort after an
 * allowed asynchronous guard cancels the pending transition.
 * @param guards - Global guards in application registration order.
 * @param context - Navigation state shared with route-specific callbacks.
 * @returns Allow, cancellation, or the first redirect requested by a guard.
 */
export async function runGlobalGuards<T extends HTMLElement>(
  guards: readonly RouteGuard<T>[],
  context: NavigationContext<T>
): Promise<RouteGuardResult> {
  for (const guard of guards) {
    const result = await guard(context);
    if (result !== true) return result;
    if (context.signal.aborted) return false;
  }

  return true;
}

/**
 * Runs application-wide observers after rendering and route lifecycle callbacks.
 * Awaiting each callback preserves registration order and surfaces failures through
 * the coordinator's existing post-commit failure result.
 * @param hooks - Global observers in application registration order.
 * @param context - Completed transition state shared with route callbacks.
 */
export async function runGlobalLifecycleHooks<T extends HTMLElement>(
  hooks: readonly RouteLifecycleHook<T>[],
  context: NavigationContext<T>
): Promise<void> {
  for (const hook of hooks) {
    await hook(context);
  }
}

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
