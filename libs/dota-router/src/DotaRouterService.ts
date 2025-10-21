import {DefaultRouterConfig, RouteConfig, Router, RouterService} from "@dota/Types";
import {RouterUtils} from "@dota/RouterUtils";


/**
 * DotaRouterService is a class that implements the RouterService interface.
 * It provides methods to initialize and manage routing in a web application.
 *
 * @template T - The type of the router instance.
 */
export class DotaRouterService<T extends Router<HTMLElement>> implements RouterService<T> {

  _router: new (...args: any[]) => T;
  _routes: RouteConfig<HTMLElement>[];
  _errorRoute: RouteConfig<HTMLElement>;
  _defaultRoute: RouteConfig<HTMLElement>;
  private instance!: T;


  constructor(
    router: new (...args: any[]) => T,
    routes: RouteConfig<HTMLElement>[],
    errorRoute: RouteConfig<HTMLElement>, defaultRoute: RouteConfig<HTMLElement>
  ) {
    this._router = router;
    this._routes = routes;
    this._errorRoute = errorRoute;
    this._defaultRoute = defaultRoute;
  }

  /**
   * Requires a router instance and returns a RouterService instance.
   *
   * This method is a factory method that helps create a RouterService instance.
   * @param config - The configuration object containing the router instance and its routes.
   */
  static of<T extends Router<HTMLElement>>(config: DefaultRouterConfig<T>): RouterService<T> {
    if (!config.routes) throw Error('Routes are required to create a RouterService instance');
    return new DotaRouterService(
      config.router,
      config.routes,
      config.errorRoute,
      config.defaultRoute
    )
  }

  /**
   * Requires a router instance and a list of components to create a RouterService instance.
   * The components are processed to generate the routing configuration.
   *
   * This method is a factory method that helps create a RouterService instance.
   * @param config - The configuration object containing the router instance and its components.
   * @throws Error if components are not provided in the configuration.
   * @returns A RouterService instance.
   */
  static fromComponents<T extends Router<HTMLElement>>(config: DefaultRouterConfig<T>): RouterService<T> {
    if (!config.components) throw Error('Elements are required to create a RouterService instance');
    const routes = RouterUtils.prepareConfig(config.components);
    return new DotaRouterService(
      config.router,
      routes,
      config.errorRoute,
      config.defaultRoute
    )
  }

  init(): RouterService<T> {
    this.instance = new this._router(
      this._routes,
      this._errorRoute,
      this._defaultRoute
    );
    return this;
  }

  /**
   * For the given path uses the router instance to navigate to the specified path.
   * Resolve the router type internally and calls the appropriate routing method.
   *
   * @param path - The path to navigate to.
   * @returns void
   */
  route(path: string): void {
    RouterUtils.route(this.instance, path);
  }

}