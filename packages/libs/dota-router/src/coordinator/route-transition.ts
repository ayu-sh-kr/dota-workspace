import {
  BranchDelta,
  NavigationContext,
  NavigationResult,
  RouteGuardResult,
  RouteConfig,
  RouteMatch
} from "@dota/Types";

/**
 * Normalizes a coordinator destination to a fresh absolute URL for browser APIs.
 * @param url - Relative pathname or absolute URL supplied by an adapter or caller.
 * @returns A cloned absolute URL that callers can safely pass between transition phases.
 */
export function toNavigationUrl(url: string | URL): URL {
  return url instanceof URL ? new URL(url.href) : new URL(url, window.location.origin);
}

/**
 * Converts a guard decision into the common adapter result contract.
 * @param result - Guard outcome indicating cancellation or a relative/absolute redirect.
 * @param match - Destination match associated with the decision.
 * @param context - Destination URL used to resolve relative redirects.
 * @returns A cancellation or redirect result for the browser-specific coordinator.
 */
export function toNavigationResult<T extends HTMLElement>(result: RouteGuardResult, match: RouteMatch<T>, context: NavigationContext<T>): NavigationResult<T> {
  return typeof result === "string"
    ? {status: "redirected", match, redirectTo: new URL(result, context.url)}
    : {status: "cancelled", match};
}

/**
 * Builds the context shared by all callbacks in one resolved transition.
 * @param url - Destination URL supplied by the browser adapter.
 * @param currentMatch - Last successfully completed route, if one exists.
 * @param nextMatch - Route match selected for the destination.
 * @param signal - Abort signal for this transition's asynchronous work.
 * @param historyState - Browser state associated with the destination entry.
 * @returns Context passed unchanged to guards, rendering, and lifecycle callbacks.
 */
export function createNavigationContext<T extends HTMLElement>(
  url: URL,
  currentMatch: RouteMatch<T> | undefined,
  nextMatch: RouteMatch<T>,
  signal: AbortSignal,
  historyState: unknown
): NavigationContext<T> {
  return {
    currentMatch,
    nextMatch,
    signal,
    params: nextMatch.params,
    url: new URL(url.href),
    historyState
  };
}

/**
 * Calculates route nodes that change between two matches without mutating either branch.
 * Shared route identity keeps unchanged parent layouts out of both lifecycle phases;
 * leaving nodes are reversed for deepest-first cleanup and entering nodes stay parent-first.
 * @param currentMatch - Last successful match, absent for initial navigation.
 * @param nextMatch - Destination match being prepared.
 * @returns Ordered entering and leaving route nodes for guard and after-hook execution.
 */
export function getBranchDelta<T extends HTMLElement>(
  currentMatch: RouteMatch<T> | undefined,
  nextMatch: RouteMatch<T>
): BranchDelta<T> {
  const currentBranch = currentMatch?.branch ?? [];
  const commonLength = getCommonBranchLength(currentBranch, nextMatch.branch);

  return {
    leaving: currentBranch.slice(commonLength).reverse(),
    entering: nextMatch.branch.slice(commonLength)
  };
}

function getCommonBranchLength<T extends HTMLElement>(
  currentBranch: readonly RouteConfig<T>[],
  nextBranch: readonly RouteConfig<T>[]
): number {
  let index = 0;
  while (currentBranch[index] && currentBranch[index] === nextBranch[index]) index += 1;
  return index;
}
