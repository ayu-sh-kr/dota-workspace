import {RouterUtils} from "@dota/RouterUtils";
import {components, defaultRoute, errorRoute} from "@test/setup/RouteConfig";
import {DomHistoryRouter} from "@dota/router/dom-history.router";
import {afterAll, beforeEach, vi} from "vitest";
import { BaseElement } from "@ayu-sh-kr/dota-core";
import {AppComponent} from "@test/setup/Components";

describe('DomHistoryRouter', () => {

  // Mock window.addEventListener to prevent actual event binding for the init method
  const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(() => {});

  // Mock window.dispatchEvent to prevent actual event dispatching
  const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);

  // Mock window.history.pushState to prevent actual history manipulation
  const pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});

  // mock windows.location.href to return a fixed url
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost/',
      origin: 'http://localhost'
    },
    writable: true
  });

  beforeEach(() => {
    vi.clearAllMocks();
  })

  afterAll(() => {
    vi.restoreAllMocks();
  })

  it('should create a instance of DomHistoryRouter and render the initial route through its coordinator', async () => {
    const routes = RouterUtils.prepareConfig(components);
    const renderer = vi.fn();
    const beforeEach = vi.fn(() => true as const);
    const afterEach = vi.fn();
    const router = new DomHistoryRouter<BaseElement>(
      routes,
      errorRoute,
      defaultRoute,
      AppComponent,
      renderer,
      {beforeEach: [beforeEach], afterEach: [afterEach]}
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    // Verify the instance was created successfully
    expect(router).toBeInstanceOf(DomHistoryRouter);
    expect(router.routes.length).toBe(routes.length);
    expect(router.errorRoute).toBe(errorRoute);
    expect(router.defaultRoute).toBe(defaultRoute);

    expect(renderer).toHaveBeenCalledWith(
      expect.objectContaining({pathname: "/", matched: true}),
      expect.objectContaining({url: expect.any(URL)})
    );
    expect(beforeEach).toHaveBeenCalledWith(expect.objectContaining({
      nextMatch: expect.objectContaining({pathname: "/"})
    }));
    expect(afterEach).toHaveBeenCalledTimes(1);

    // Verify event listener was added during init
    expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('should throw error when initialized with null or empty route configs', () => {
    const routerInit = () => new DomHistoryRouter([], errorRoute, defaultRoute, AppComponent);
    expect(routerInit).toThrow('Routes configuration cannot be empty.');
  });

  it('should route with correct path', () => {
    const testPath = '/products';
    const expectedUrl = 'http://localhost/products';

    // Call the static route method
    DomHistoryRouter.route(testPath);

    // Verify pushState was called with correct parameters
    expect(pushStateSpy).toHaveBeenCalledWith(
      null,           // state
      '',             // title
      expectedUrl     // url
    );

    // Verify dispatchEvent was called with PopStateEvent
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'popstate',
        state: null
      })
    );

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
  });

  it('should normalize path without leading slash', () => {
    const testPath = 'products/123';
    const expectedUrl = 'http://localhost/products/123';

    DomHistoryRouter.route(testPath);

    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      '',
      expectedUrl
    );
  });

  it('should handle empty path', () => {
    const testPath = '';
    const expectedUrl = 'http://localhost/';

    DomHistoryRouter.route(testPath);

    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      '',
      expectedUrl
    );
  });

  it('should handle root path', () => {
    const testPath = '/';
    const expectedUrl = 'http://localhost/';

    DomHistoryRouter.route(testPath);

    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      '',
      expectedUrl
    );
  });

  it('should handle path with query parameters', () => {
    const testPath = '/search?q=test&page=1';
    const expectedUrl = 'http://localhost/search?q=test&page=1';

    DomHistoryRouter.route(testPath);

    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      '',
      expectedUrl
    );
  });

  it('should route instance calls through the history coordinator', async () => {
    const renderer = vi.fn();
    const router = new DomHistoryRouter<BaseElement>(
      RouterUtils.prepareConfig(components),
      errorRoute,
      defaultRoute,
      AppComponent,
      renderer
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    vi.clearAllMocks();

    router.route('/resource');
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(pushStateSpy).toHaveBeenCalledWith(null, '', 'http://localhost/resource');
    expect(renderer).toHaveBeenCalledWith(
      expect.objectContaining({pathname: '/resource', matched: true}),
      expect.objectContaining({url: expect.any(URL)})
    );
  });

});
