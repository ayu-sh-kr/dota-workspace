import {ComponentClass, DefaultRouterConfig, RouteConfig, RouteRenderer, Router, RouterConstructor, RouterService} from "@dota/Types";
import {RouterUtils} from "@dota/RouterUtils";
import {configure} from "@dota/route/route-configurer";
import {createRouteRenderer} from "@dota/coordinator";


/**
 * Owns the shared router configuration until a concrete router is initialized.
 * Keeping construction here gives applications one consistent entry point for
 * metadata-derived routes and directly supplied flat route configurations.
 * @template T - Router implementation created by this service.
 */
export class DotaRouterService<T extends Router<HTMLElement>> implements RouterService<T> {

  _router: RouterConstructor<T>;
  _routes: RouteConfig<HTMLElement>[];
  _errorRoute: RouteConfig<HTMLElement>;
  _defaultRoute: RouteConfig<HTMLElement>;
  _root: ComponentClass
  readonly renderer: RouteRenderer;
  instance!: T;


  constructor(
    router: RouterConstructor<T>,
    routes: RouteConfig<HTMLElement>[],
    errorRoute: RouteConfig<HTMLElement>, defaultRoute: RouteConfig<HTMLElement>,
    root: ComponentClass
  ) {
    this._router = router;
    this._routes = routes;
    this._errorRoute = errorRoute;
    this._defaultRoute = defaultRoute;
    this._root = root;
    this.renderer = createRouteRenderer(root);
  }

  /**
   * Creates a service from flat routes or component route metadata.
   * Explicit routes take precedence; both route sources are compiled through the
   * same configurer, so router implementations always receive a segment tree.
   * @param config - Router constructor, flat route source, and fallback components.
   * @throws Error when neither a non-empty route list nor components are supplied.
   * @returns A service ready to initialize the configured router.
   */
  static fromComponents<T extends Router<HTMLElement>>(config: DefaultRouterConfig<T>): RouterService<T> {
    const flatRoutes = config.routes && config.routes.length > 0
      ? config.routes
      : (() => {
          if (!config.components || config.components.length === 0) {
            throw Error('Elements are required to create a RouterService instance');
          }
          return RouterUtils.prepareConfig(config.components);
        })();
    return new DotaRouterService(
      config.router,
      configure(flatRoutes, config.errorRoute),
      config.errorRoute,
      config.defaultRoute,
      config.root
    )
  }

  /**
   * Creates the configured router and retains it for subsequent navigation.
   * Construction is deferred so applications can finish registering elements
   * before the router receives its route tree and fallback routes.
   * @returns This service with its router instance initialized.
   */
  init(): RouterService<T> {
    this.instance = new this._router(this._routes, this._errorRoute, this._defaultRoute, this._root, this.renderer);
    return this;
  }

  /**
   * Delegates navigation to the initialized router implementation.
   * The service deliberately leaves path normalization to that implementation
   * so browser-specific routers retain control over their navigation behavior.
   * @param path - Application path requested by the caller.
   */
  route(path: string): void {
    this.instance.route(path)
  }

}
