import {DotaRouterService} from "@dota/DotaRouterService";
import {DomHistoryRouter} from "@dota/dom-history.router";
import {expect, vi} from "vitest";
import {RouterUtils} from "@dota/RouterUtils";
import {components, defaultRoute, errorRoute} from "@test/setup/RouteConfig";

describe('RouterService', () => {

  it('should throw error when initialized with no components', () => {
    const routerConfig = () => DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
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
    });

    expect(routerService).toBeInstanceOf(DotaRouterService);
  });

  it('should have the correct routes after initialization', () => {
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
    });

    const routes = RouterUtils.prepareConfig(components);
    expect(routerService['_routes'].length).toBe(routes.length);
    expect(routerService._routes).toStrictEqual(routes)
  });

  it('should have the correct default and error route after initialization', () => {
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
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
    });

    expect(routerService['_router']).toBe(DomHistoryRouter);
  });

  it('should initialize the router with given config', () => {
    // Mock the entire DomHistoryRouter class
    const mockInit = vi.fn();
    const MockDomHistoryRouter = vi.fn().mockImplementation((routes: any, errorRoute: any, defaultRoute: any) => ({
      routes,
      errorRoute,
      defaultRoute,
      init: mockInit
    }));

    const routerService = DotaRouterService.fromComponents({
      router: MockDomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
    });
    routerService.init();

    expect(MockDomHistoryRouter).toHaveBeenCalledWith(
      routerService['_routes'],
      routerService['_errorRoute'],
      routerService['_defaultRoute']
    );

    mockInit.mockRestore();
    MockDomHistoryRouter.mockRestore();
  });

  it('should call RouterUtils.route with the exact router instance and path', () => {
    // Mock RouterUtils.render to prevent DOM manipulation during router construction
    const renderSpy = vi.spyOn(RouterUtils, 'render').mockImplementation(() => {});

    // Mock RouterUtils.route to capture the call
    const routeSpy = vi.spyOn(RouterUtils, 'route').mockImplementation(() => {});

    // Mock the DomHistoryRouter to prevent actual initialization
    const mockRouter = {
      routes: [],
      errorRoute: errorRoute,
      defaultRoute: defaultRoute,
      init: vi.fn()
    };

    const MockDomHistoryRouter = vi.fn().mockImplementation(() => mockRouter);

    const routerService = DotaRouterService.fromComponents({
      router: MockDomHistoryRouter as any,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
    });

    // Initialize the service (this creates the router instance)
    routerService.init();

    const testPath = '/about';
    routerService.route(testPath);

    // Verify RouterUtils.route was called with the mock router instance and correct path
    expect(routeSpy).toHaveBeenCalledTimes(1);
    expect(routeSpy).toHaveBeenCalledWith(mockRouter, testPath);

    // Clean up
    renderSpy.mockRestore();
    routeSpy.mockRestore();
  });

});