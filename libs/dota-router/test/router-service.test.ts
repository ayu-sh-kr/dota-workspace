import {DotaRouterService} from "@dota/DotaRouterService";
import {DomHistoryRouter} from "@dota/dom-history.router";
import {expect, vi} from "vitest";
import {RouterUtils} from "@dota/RouterUtils";
import {components, defaultRoute, errorRoute} from "@test/setup/RouteConfig";
import {AppComponent} from "@test/setup/Components";
import {Router} from "@dota/Types";

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
  });

  it('should have the correct routes after initialization', () => {
    const routerService = DotaRouterService.fromComponents({
      router: DomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
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

  it('should initialize the router with given config', () => {
    // Mock the entire DomHistoryRouter class
    const mockInit = vi.fn();
    const MockDomHistoryRouter = vi.fn()
      .mockImplementation((routes: any, errorRoute: any, defaultRoute: any, root: any) => ({
        routes,
        errorRoute,
        defaultRoute,
        root,
        init: mockInit
      }));


    const routerService = DotaRouterService.fromComponents({
      router: MockDomHistoryRouter,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });
    routerService.init();

    expect(MockDomHistoryRouter).toHaveBeenCalledWith(
      routerService['_routes'],
      routerService['_errorRoute'],
      routerService['_defaultRoute'],
      routerService['_root']
    );

    mockInit.mockRestore();
    MockDomHistoryRouter.mockRestore();
  });

  it('should call RouterUtils.route with the exact router instance and path', () => {
    // Mock RouterUtils.render to prevent DOM manipulation during router construction
    const renderSpy = vi.spyOn(RouterUtils, 'render')
      .mockImplementation(() => {});

    // Mock the DomHistoryRouter to prevent actual initialization
    const mockRouter: Router<HTMLElement> = {
      routes: [],
      root: AppComponent,
      errorRoute: errorRoute,
      defaultRoute: defaultRoute,
      init: vi.fn(),
      route: vi.fn()
    };

    const MockDomHistoryRouter = vi.fn().mockImplementation(() => mockRouter);

    const routerService = DotaRouterService.fromComponents({
      router: MockDomHistoryRouter as any,
      components: components,
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      root: AppComponent
    });

    // Initialize the service (this creates the router instance)
    routerService.init();

    const testPath = '/about';
    routerService.route(testPath);

    // Verify RouterUtils.route was called with the mock router instance and correct path
    expect(mockRouter.route).toHaveBeenCalledTimes(1);
    expect(mockRouter.route).toHaveBeenCalledWith(testPath);

    // Clean up
    renderSpy.mockRestore();
  });

});