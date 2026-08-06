import {DotaRouterService} from "@dota/DotaRouterService";
import {DomHistoryRouter} from "@dota/router/dom-history.router";
import {expect, vi} from "vitest";
import {RouterUtils} from "@dota/RouterUtils";
import {configure} from "@dota/route/route-configurer";
import {components, defaultRoute, errorRoute} from "@test/setup/RouteConfig";
import {AppComponent} from "@test/setup/Components";
import {MockRouter} from "@test/setup/MockRouter";

describe('RouterService', () => {

  it('should throw error when initialized with no components', () => {
    const routerConfig = () => DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    })

    expect(routerConfig)
      .toThrowError('Elements are required to create a RouterService instance')
  });

  it('should throw error when initialized with empty components', () => {
    const routerConfig = () => DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: [],
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    })

    expect(routerConfig)
      .toThrowError('Elements are required to create a RouterService instance')
  });

  it('should return a configured DotaRouterService instance', () => {
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });

    expect(routerService).toBeInstanceOf(DotaRouterService);
    expect(routerService.renderer).toEqual(expect.any(Function));
  });

  it('uses an injected route renderer without changing default service wiring', () => {
    const renderer = vi.fn();
    const routerService = DotaRouterService.fromComponents({
      router: MockRouter,
      components,
      defaultRoute,
      errorRoute,
      root: AppComponent,
      renderer
    });

    routerService.init();

    expect(routerService.renderer).toBe(renderer);
    expect(routerService.instance.renderer).toBe(renderer);
  });

  it('should have the correct routes after initialization', () => {
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });

    const routes = configure(RouterUtils.prepareConfig(components), errorRoute);
    expect(routerService['_routes'].length).toBe(routes.length);
    expect(routerService._routes).toStrictEqual(routes)
  });

  it('should configure supplied flat routes before creating the service', () => {
    const flatRoutes = [
      {
        path: '/generated/child',
        component: AppComponent
      }
    ];
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      routes: flatRoutes,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });

    expect(routerService._routes).toStrictEqual(configure(flatRoutes, errorRoute));
  });

  it('should have the correct default and error route after initialization', () => {
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });

    expect(routerService['_defaultRoute']).toBe(defaultRoute);
    expect(routerService['_errorRoute']).toBe(errorRoute);
  });

  it('should have correct router after initialization', () => {
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });

    expect(routerService['_router']).toBe(DomHistoryRouter);
  });

  it('should initialize the router with the configured route dependencies', () => {
    const globalHooks = {
      beforeEach: [vi.fn(() => true as const)],
      afterEach: [vi.fn()]
    };
    const routerService = DotaRouterService.fromComponents({
      router: MockRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent,
      globalHooks
    });
    routerService.init();

    expect(routerService.instance).toBeInstanceOf(MockRouter);
    expect(routerService.instance.routes).toStrictEqual(routerService._routes);
    expect(routerService.instance.errorRoute).toBe(errorRoute);
    expect(routerService.instance.defaultRoute).toBe(defaultRoute);
    expect(routerService.instance.root).toBe(AppComponent);
    expect(routerService.instance.renderer).toBe(routerService.renderer);
    expect(routerService.instance.globalHooks).toBe(globalHooks);
  });

  it('should call RouterUtils.route with the exact router instance and path', () => {
    const routerService = DotaRouterService.fromComponents({
      router: MockRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });

    routerService.init();

    const testPath = '/about';
    routerService.route(testPath);

    expect(routerService.instance.route).toHaveBeenCalledTimes(1);
    expect(routerService.instance.route).toHaveBeenCalledWith(testPath);
  });

});
