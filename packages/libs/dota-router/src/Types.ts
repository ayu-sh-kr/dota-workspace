/**
 * Common runtime contract implemented by browser-specific router adapters.
 * The service supplies the compiled route tree and fallback routes; each adapter owns
 * its browser event source while preserving the same initialization and navigation API.
 * @template T - Element type produced by the adapter's route components.
 */
export interface Router<T extends HTMLElement> {

  /** Configured segment tree consumed by route matching and rendering. */
  readonly routes: RouteConfig<T>[];
  /** Route rendered or returned when a destination cannot be resolved. */
  readonly errorRoute: RouteConfig<T>;
  /** Route intended for the application's initial/default destination. */
  readonly defaultRoute: RouteConfig<T>;
  /** Root component whose host element receives route output. */
  readonly root: ComponentClass;
  /** Renderer supplied by the service or created by the adapter for route output. */
  readonly renderer?: RouteRenderer<T>;

  /**
   * Installs the adapter's browser listeners used for later navigations.
   * Implementations may invoke this during construction, but should not register
   * duplicate listeners when initialization is requested again.
   */
  init(): void;

  /**
   * Requests navigation through the selected browser adapter.
   * @param path - Application pathname; adapters normalize a missing leading slash.
   */
  route(path: string): void;
}

/**
 * Constructor shape accepted by `DotaRouterService` for selecting a browser adapter.
 * Keeping the constructor contract generic lets applications choose history,
 * Navigation API, or a compatible custom router without changing service setup.
 * Runtime arguments after `root` include the renderer and optional global hooks.
 * @template T - Router instance produced by the constructor.
 */
export type RouterConstructor<T extends Router<HTMLElement>> = new (
  routes: RouteConfig<HTMLElement>[],
  errorRoute: RouteConfig<HTMLElement>,
  defaultRoute: RouteConfig<HTMLElement>,
  root: ComponentClass,
  ...rest: any[]
) => T;

/**
 * Carries the route information declared by `@Route` before the router compiles it
 * into its segment tree. It keeps component declarations independent from a router
 * instance while preserving the navigation hooks consumed by the transition coordinators.
 */
export type RouteMeta<T extends HTMLElement = HTMLElement> = {
  path: string;
  /** Enables build-time prerendering when an SSG integration consumes decorated routes. */
  ssr?: boolean;
  default?: boolean;
  render?: (path: string) => void;
  beforeEnter?: RouteGuard<T>;
  beforeLeave?: RouteGuard<T>;
  afterEnter?: RouteLifecycleHook<T>;
  afterLeave?: RouteLifecycleHook<T>;
}

/**
 * Describes the result a route guard can use to control a pending transition.
 * `true` allows it to continue, `false` cancels it, and a string requests a redirect
 * without requiring hooks to know which browser adapter is active.
 */
export type RouteGuardResult = true | false | string;

/**
 * Gives navigation hooks the two route matches and browser state involved in one
 * transition. The coordinators create one context for the complete transition, which
 * keeps guards portable across history and Navigation API adapters.
 */
export type NavigationContext<T extends HTMLElement = HTMLElement> = {
  /** True only when no route has completed before this transition; absent means a later/custom transition. */
  readonly initial?: boolean;
  /** Last successfully rendered match, absent during initial navigation. */
  currentMatch?: RouteMatch<T>;
  /** Destination match that guards and lifecycle hooks are evaluating. */
  nextMatch: RouteMatch<T>;
  /** Signal that becomes aborted when the transition is superseded or cancelled. */
  signal: AbortSignal;
  /** Parameters extracted from the destination match for application policy. */
  params: Readonly<Record<string, string>>;
  /** Destination URL including its normalized pathname, query, and hash. */
  url: URL;
  /** State associated with the browser history entry, when supplied by an adapter. */
  historyState: unknown;
}

/**
 * Decides whether a route transition may continue before the router changes browser
 * history or the rendered DOM. Guards may wait for asynchronous application work and
 * can allow, cancel, or redirect the transition through `RouteGuardResult`.
 */
export type RouteGuard<T extends HTMLElement = HTMLElement> = (
  context: NavigationContext<T>
) => RouteGuardResult | Promise<RouteGuardResult>;

/**
 * Observes a completed route entry or exit without controlling the transition result.
 * It shares the guard context so analytics and application effects can inspect the
 * same route and URL data once lifecycle execution is introduced.
 */
export type RouteLifecycleHook<T extends HTMLElement = HTMLElement> = (
  context: NavigationContext<T>
) => void | Promise<void>;

/**
 * Defines application-wide policy that wraps every resolved navigation attempt.
 * Coordinators run each collection in registration order independently of route
 * branch changes.
 */
export type GlobalNavigationHooks<T extends HTMLElement = HTMLElement> = {
  /** Guards evaluated before route-specific leave and enter guards. */
  readonly beforeEach?: readonly RouteGuard<T>[];
  /** Observers invoked after rendering and route-specific lifecycle hooks. */
  readonly afterEach?: readonly RouteLifecycleHook<T>[];
}

/** Names the terminal state reported by a browser-independent route transition. */
export type NavigationStatus = "completed" | "cancelled" | "redirected" | "failed";

/**
 * Describes the browser-independent outcome of one coordinator transition.
 * Adapters translate this result into their browser API without duplicating route
 * lifecycle policy or making callers inspect thrown control-flow errors.
 */
export type NavigationResult<T extends HTMLElement = HTMLElement> = {
  /** Terminal transition state used by the adapter or application. */
  status: NavigationStatus;
  /** Destination match when resolution or transition work reached a route. */
  match?: RouteMatch<T>;
  /** Absolute redirect target when a guard returned a redirect path. */
  redirectTo?: URL;
  /** Original failure when transition work rejected unexpectedly. */
  error?: unknown;
}

/**
 * Controls a coordinator transition without coupling route hooks to a browser adapter.
 * `commit` is used by history-based adapters, while Navigation API adapters let the
 * browser commit the intercepted destination.
 */
export type NavigationOptions = {
  /** Signal supplied by a browser event to cancel stale asynchronous work. */
  signal?: AbortSignal;
  /** State to associate with a newly committed history entry. */
  historyState?: unknown;
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
  /** Skip a history commit when handling an already-committed popstate entry. */
  commit?: boolean;
}

/**
 * Defines the presentation boundary used after a route has passed its guards.
 * Coordinators do not assume how a custom element is mounted, which keeps rendering
 * policy separate from route matching and browser history.
 */
export type RouteRenderer<T extends HTMLElement = HTMLElement> = (
  match: RouteMatch<T>,
  context: NavigationContext<T>
) => void | Promise<void>;

/**
 * Represents one route node after configuration compiles flat page declarations into
 * segment-local paths. Routers and matchers consume this form, and coordinators invoke
 * its optional hooks during the matching transition phases.
 */
export type RouteConfig<T extends HTMLElement> = {
  path: string;
  component: ComponentClass;
  /** Whether this concrete route is eligible for build-time prerendering. */
  ssr?: boolean;
  default?: boolean;
  slug?: boolean;
  children?: RouteConfig<T>[];
  render?: (path: string) => void;
  /** Guards entry before history or DOM work; it may allow, cancel, or redirect. */
  beforeEnter?: RouteGuard<T>;
  /** Guards exit before history or DOM work; it may allow, cancel, or redirect. */
  beforeLeave?: RouteGuard<T>;
  /** Observes entry after a future navigation pipeline completes the transition. */
  afterEnter?: RouteLifecycleHook<T>;
  /** Observes exit after a future navigation pipeline completes the transition. */
  afterLeave?: RouteLifecycleHook<T>;
}

/**
 * Describes one URL resolution without changing the configured route tree.
 * The resolver supplies the selected leaf, its matched branch, extracted parameters,
 * and complete URL state so the transition coordinator can run hooks before rendering.
 */
export type RouteMatch<T extends HTMLElement> = {
  /** Selected leaf route, or the configured error route when `matched` is false. */
  route: RouteConfig<T>;
  /** Root-to-leaf route nodes used to calculate entering and leaving hooks. */
  branch: readonly RouteConfig<T>[];
  /** Whether the requested URL matched a configured route rather than the fallback. */
  matched: boolean;
  /** Dynamic values extracted from slug segments in the matched path. */
  params: Readonly<Record<string, string>>;
  /** URL pathname after leading/trailing slash normalization. */
  pathname: string;
  /** Query parameters preserved for renderers and navigation hooks. */
  searchParams: URLSearchParams;
  /** Hash fragment, including its leading `#` when present. */
  hash: string;
}

/**
 * Describes the route nodes that change between two successful matches.
 * Coordinators use the ordered lists to run exit hooks deepest-first and entry hooks
 * parent-first, while unchanged branch nodes remain outside both lifecycle phases.
 */
export type BranchDelta<T extends HTMLElement = HTMLElement> = {
  /** Routes leaving the active branch, ordered from leaf toward the root. */
  leaving: readonly RouteConfig<T>[];
  /** Routes entering the destination branch, ordered from root toward the leaf. */
  entering: readonly RouteConfig<T>[];
}

/**
 * Holds the guarded route state between browser precommit and postcommit phases.
 * Navigation API adapters prepare this value before the browser commits, then pass it
 * to completion so rendering and after-hooks use the exact match that was approved.
 */
export type PreparedNavigation<T extends HTMLElement = HTMLElement> = {
  /** Route branch and URL data approved by the before-hook phase. */
  match: RouteMatch<T>;
  /** Context shared by guards, renderer, and lifecycle hooks for this transition. */
  context: NavigationContext<T>;
  /** Routes entering and leaving relative to the previous successful match. */
  branchDelta: BranchDelta<T>;
}

/**
 * Represents the result of the coordinator's precommit preparation phase.
 * A prepared result is handed to postcommit rendering; any other result terminates
 * preparation with the same cancellation, redirect, or failure contract used by adapters.
 */
export type NavigationPreparationResult<T extends HTMLElement = HTMLElement> =
  | {status: "prepared"; prepared: PreparedNavigation<T>}
  | NavigationResult<T>;

/**
 * Legacy string options accepted by the static adapter navigation methods.
 * New coordinator callers should use `NavigationOptions` so state and history policy
 * have explicit meanings instead of an unvalidated key/value map.
 */
export type NavigationOption = {
  [key: string]: string;
}

/**
 * Input retained by the compatibility renderer while navigation moves to a coordinator.
 * It carries the old pathname-based shape so existing adapter and application callers
 * can continue rendering during the transition to `RouteMatch`.
 */
export type RenderConfig<T extends HTMLElement> = {
  /** Requested pathname passed to the legacy renderer. */
  path: string;
  /** Configured route tree from the service. */
  routes: RouteConfig<T>[];
  /** Legacy message or rendering options consumed by the current renderer. */
  options?: NavigationOption;
  /** Adapter instance providing root and error route metadata. */
  router: Router<T>;
}

/**
 * Construction input used when a service is created from explicit routes or decorated
 * components. Explicit routes take precedence; components provide flat metadata when
 * no route list is supplied.
 */
export interface DefaultRouterConfig<T extends Router<HTMLElement>> {
  /** Root component that owns the router output host. */
  root: ComponentClass
  /** Flat route declarations compiled by `configure`. */
  routes?: RouteConfig<HTMLElement>[];
  /** Fallback route used for unresolved destinations and generated parents. */
  errorRoute: RouteConfig<HTMLElement>;
  /** Route selected for the application's default destination. */
  defaultRoute: RouteConfig<HTMLElement>;
  /** Browser adapter constructor selected by the application. */
  router: RouterConstructor<T>;
  /** Decorated component classes used when explicit routes are absent. */
  components?: ComponentClass[];
  /** Application-wide guards and observers owned by this router instance. */
  globalHooks?: GlobalNavigationHooks<HTMLElement>;
  /** Optional presentation strategy; omission preserves the built-in component-tag renderer. */
  renderer?: RouteRenderer<HTMLElement>;
}

/**
 * Service facade that owns route compilation and deferred adapter initialization.
 * Its underscored fields are retained for the current implementation; applications
 * should use `init()` and `route()` rather than reading those construction details.
 */
export interface RouterService<T extends Router<HTMLElement>> {
  /** Selected browser adapter constructor. */
  _router: new (...args: any[]) => T;
  /** Compiled route tree passed to the adapter. */
  _routes: RouteConfig<HTMLElement>[];
  /** Configured error fallback passed to the adapter. */
  _errorRoute: RouteConfig<HTMLElement>;
  /** Configured default route passed to the adapter. */
  _defaultRoute: RouteConfig<HTMLElement>;
  /** Root component passed to the adapter. */
  _root: ComponentClass
  /** Coordinator-compatible renderer bound to the configured root component. */
  readonly renderer: RouteRenderer<HTMLElement>;
  /** Initialized adapter instance, available after `init()`. */
  instance: T;

  /** Creates the selected adapter and returns this service facade. */
  init(): RouterService<T>;

  /** Delegates one pathname request to the initialized adapter. */
  route(path: string): void;
}

/**
 * Constructor type for a custom-element class used as a route component.
 * The generic parameter lets route collections preserve the concrete element type
 * while remaining compatible with browser custom-element constructors.
 */
export type ComponentClass<T extends HTMLElement = HTMLElement> = new (...args: any[]) => T;
