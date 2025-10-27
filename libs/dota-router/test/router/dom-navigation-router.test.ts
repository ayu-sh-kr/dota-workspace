import { RouterUtils } from "@dota/RouterUtils";
import { components, defaultRoute, errorRoute } from "@test/setup/RouteConfig";
import { DomNavigationRouter } from "@dota/dom-navigation.router";
import {afterAll, expect, vi} from "vitest";
import { BaseElement } from "@ayu-sh-kr/dota-core";

describe('DomNavigationRouter', () => {

  // Mock RouterUtils.render to prevent DOM manipulation during test
  const renderSpy = vi.spyOn(RouterUtils, 'render').mockImplementation(() => {});

  // Mock window.navigation for Navigation API
  const mockNavigation = {
    addEventListener: vi.fn(),
    navigate: vi.fn().mockResolvedValue(undefined)
  };

  // Mock NavigateEvent for testing
  const createMockNavigateEvent = (url: string, canIntercept = true, hashChange = false) => ({
    canIntercept,
    hashChange,
    downloadRequest: null,
    destination: { url },
    intercept: vi.fn()
  });

  // Set up window.navigation mock
  Object.defineProperty(window, 'navigation', {
    value: mockNavigation,
    writable: true,
    configurable: true
  });

  // Mock window.location.href to return a fixed url
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost/',
      origin: 'http://localhost',
      pathname: '/'
    },
    writable: true
  });

  afterAll(() => {
    renderSpy.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an instance of DomNavigationRouter', () => {
    const routes = RouterUtils.prepareConfig(components);
    const router = new DomNavigationRouter<BaseElement>(
      routes,
      errorRoute,
      defaultRoute
    );

    // Verify the instance was created successfully
    expect(router).toBeInstanceOf(DomNavigationRouter);
    expect(router.routes.length).toBe(routes.length);
    expect(router.errorRoute).toBe(errorRoute);
    expect(router.defaultRoute).toBe(defaultRoute);

    // Verify RouterUtils.render was called during construction
    expect(renderSpy).toHaveBeenCalledWith({
      router: router,
      routes: routes,
      options: {},
      path: '/'
    });

    // Verify navigation event listener was added during init
    expect(mockNavigation.addEventListener).toHaveBeenCalledWith('navigate', expect.any(Function));
  });

  it('should throw error when initialized with null or empty route configs', () => {
    const routerInit = () => new DomNavigationRouter([], errorRoute, defaultRoute);
    expect(routerInit).toThrow('Routes configuration cannot be empty.');
  });

  it('should navigate with correct path using Navigation API', () => {
    const testPath = '/products';
    const expectedUrl = 'http://localhost/products';

    // Call the static route method
    DomNavigationRouter.route(testPath);

    // Verify navigation.navigate was called with correct URL
    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
  });

  it('should normalize path without leading slash', () => {
    const testPath = 'products/123';
    const expectedUrl = 'http://localhost/products/123';

    DomNavigationRouter.route(testPath);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
  });

  it('should handle empty path', () => {
    const testPath = '';
    const expectedUrl = 'http://localhost/';

    DomNavigationRouter.route(testPath);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
  });

  it('should handle root path', () => {
    const testPath = '/';
    const expectedUrl = 'http://localhost/';

    DomNavigationRouter.route(testPath);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
  });

  it('should handle path with query parameters', () => {
    const testPath = '/search?q=test&page=1';
    const expectedUrl = 'http://localhost/search?q=test&page=1';

    DomNavigationRouter.route(testPath);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
  });

  it('should handle path with hash fragments', () => {
    const testPath = '/docs#section1';
    const expectedUrl = 'http://localhost/docs#section1';

    DomNavigationRouter.route(testPath);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
  });

  it('should intercept navigate events when canIntercept is true', () => {
    const routes = RouterUtils.prepareConfig(components);
    const router = new DomNavigationRouter<BaseElement>(
      routes,
      errorRoute,
      defaultRoute
    );

    expect(router).toBeInstanceOf(DomNavigationRouter);

    // Get the navigate event handler
    const navigateHandler = mockNavigation.addEventListener.mock.calls
      .find(call => call[0] === 'navigate')?.[1] as Function;

    expect(navigateHandler).toBeDefined();

    // Create a mock navigate event
    const mockEvent = createMockNavigateEvent('http://localhost/test-path');

    // Call the navigate handler
    navigateHandler(mockEvent);

    // Verify event.intercept was called
    expect(mockEvent.intercept).toHaveBeenCalledWith({
      handler: expect.any(Function)
    });
  });

  it('should not intercept navigate events when canIntercept is false', () => {
    const routes = RouterUtils.prepareConfig(components);
    new DomNavigationRouter<BaseElement>(
      routes,
      errorRoute,
      defaultRoute
    );

    const navigateHandler = mockNavigation.addEventListener.mock.calls
      .find(call => call[0] === 'navigate')?.[1] as Function;

    const mockEvent = createMockNavigateEvent('http://localhost/test', false);

    navigateHandler(mockEvent);

    expect(mockEvent.intercept).not.toHaveBeenCalled();
  });

  it('should not intercept navigate events for hash changes', () => {
    const routes = RouterUtils.prepareConfig(components);
    new DomNavigationRouter<BaseElement>(
      routes,
      errorRoute,
      defaultRoute
    );

    const navigateHandler = mockNavigation.addEventListener.mock.calls
      .find(call => call[0] === 'navigate')?.[1] as Function;

    const mockEvent = createMockNavigateEvent('http://localhost/test#hash', true, true);

    navigateHandler(mockEvent);

    expect(mockEvent.intercept).not.toHaveBeenCalled();
  });

  it('should not intercept navigate events for download requests', () => {
    const routes = RouterUtils.prepareConfig(components);
    new DomNavigationRouter<BaseElement>(
      routes,
      errorRoute,
      defaultRoute
    );

    const navigateHandler = mockNavigation.addEventListener.mock.calls
      .find(call => call[0] === 'navigate')?.[1] as Function;

    const mockEvent = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: 'file.pdf',
      destination: { url: 'http://localhost/download' },
      intercept: vi.fn()
    };

    navigateHandler(mockEvent);

    expect(mockEvent.intercept).not.toHaveBeenCalled();
  });

  it('should call RouterUtils.render in intercept handler', async () => {
    const routes = RouterUtils.prepareConfig(components);
    const router = new DomNavigationRouter<BaseElement>(
      routes,
      errorRoute,
      defaultRoute
    );

    const navigateHandler = mockNavigation.addEventListener.mock.calls
      .find(call => call[0] === 'navigate')?.[1] as Function;

    const mockEvent = createMockNavigateEvent('http://localhost/test-route');

    navigateHandler(mockEvent);

    // Get the handler function from intercept call
    const interceptCall = mockEvent.intercept.mock.calls[0][0];
    const handler = interceptCall.handler;

    // Execute the async handler
    await handler();

    // Verify RouterUtils.render was called with correct parameters
    expect(renderSpy).toHaveBeenCalledWith({
      path: '/test-route',
      routes: routes,
      router: router
    });
  });

  it('should handle complex nested paths', () => {
    const testPath = '/api/v1/users/123/posts/456';
    const expectedUrl = 'http://localhost/api/v1/users/123/posts/456';

    DomNavigationRouter.route(testPath);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
  });

  it('should handle special characters in path', () => {
    const testPath = '/search/hello%20world';
    const expectedUrl = 'http://localhost/search/hello%20world';

    DomNavigationRouter.route(testPath);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(expectedUrl);
  });

  it('should handle navigation API failure gracefully', () => {
    // Make navigation.navigate throw an error
    mockNavigation.navigate.mockRejectedValueOnce(new Error('Navigation failed'));

    expect(() => {
      DomNavigationRouter.route('/test');
    }).not.toThrow();

    expect(mockNavigation.navigate).toHaveBeenCalledWith('http://localhost/test');
  });
});
