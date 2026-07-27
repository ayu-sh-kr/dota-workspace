import {GlobalNavigationHooks, RouteConfig, RouteRenderer} from "@dota/Types";

/**
 * Describes the shared route and rendering dependencies owned by a coordinator.
 * Browser-specific coordinators implement this property contract while keeping
 * their navigation methods and transition policies independent.
 */
export interface Coordinator<T extends HTMLElement = HTMLElement> {
  /** Configured segment tree resolved for each destination. */
  readonly routes: RouteConfig<T>[];
  /** Fallback route returned when no configured branch matches. */
  readonly errorRoute: RouteConfig<T>;
  /** Presentation callback invoked after a transition is approved. */
  readonly renderer: RouteRenderer<T>;
  /** Application-wide callbacks wrapped around route-specific lifecycle work. */
  readonly globalHooks: GlobalNavigationHooks<T>;
}
