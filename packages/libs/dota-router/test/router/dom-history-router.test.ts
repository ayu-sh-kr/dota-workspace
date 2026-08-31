import {RouterUtils} from "@dota/RouterUtils";
import {components, defaultRoute, errorRoute} from "@test/setup/RouteConfig";
import {DomHistoryRouter} from "@dota/router/history";
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
  const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  const forwardSpy = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
  const goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});

  // mock windows.location.href to return a fixed url
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost/',
      origin: 'http://localhost'
    },
    writable: true
  });

  beforeEach(() => {
    window.location.href = 'http://localhost/';
    window.history.replaceState(
      {__dotaRouter: {position: 0, applicationState: null}},
      '',
      '/'
    );
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

    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        __dotaRouter: expect.objectContaining({applicationState: null})
      }),
      '',
      'http://localhost/resource'
    );
    expect(renderer).toHaveBeenCalledWith(
      expect.objectContaining({pathname: '/resource', matched: true}),
      expect.objectContaining({url: expect.any(URL)})
    );
  });

  it('should request the preceding browser-history entry', () => {
    const router = new DomHistoryRouter<BaseElement>(
      RouterUtils.prepareConfig(components),
      errorRoute,
      defaultRoute,
      AppComponent,
      vi.fn()
    );
    vi.clearAllMocks();

    router.back();

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('should request the succeeding browser-history entry', () => {
    const router = new DomHistoryRouter<BaseElement>(
      RouterUtils.prepareConfig(components),
      errorRoute,
      defaultRoute,
      AppComponent,
      vi.fn()
    );
    vi.clearAllMocks();

    router.forth();

    expect(forwardSpy).toHaveBeenCalledTimes(1);
  });

  it('should run popstate through guards and expose destination application state', async () => {
    const historyState = {source: 'browser'};
    const beforeEach = vi.fn(() => true as const);
    const afterEach = vi.fn();
    const renderer = vi.fn();
    new DomHistoryRouter<BaseElement>(
      RouterUtils.prepareConfig(components),
      errorRoute,
      defaultRoute,
      AppComponent,
      renderer,
      {beforeEach: [beforeEach], afterEach: [afterEach]}
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const popStateHandler = addEventListenerSpy.mock.calls
      .filter(call => call[0] === 'popstate')
      .slice(-1)[0]?.[1] as EventListener;
    vi.clearAllMocks();
    window.location.href = 'http://localhost/resource';

    popStateHandler(new PopStateEvent('popstate', {
      state: {__dotaRouter: {position: -1, applicationState: historyState}}
    }));
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(beforeEach).toHaveBeenCalledWith(expect.objectContaining({historyState}));
    expect(renderer).toHaveBeenCalledWith(
      expect.objectContaining({pathname: '/resource'}),
      expect.objectContaining({historyState})
    );
    expect(afterEach).toHaveBeenCalledWith(expect.objectContaining({historyState}));
  });

  it('should restore the accepted entry when a popstate guard cancels', async () => {
    let allowRoot = true;
    class HomePage extends HTMLElement {}
    class AccountPage extends HTMLElement {}
    const renderer = vi.fn();
    const router = new DomHistoryRouter<HTMLElement>(
      [
        {path: '/', component: HomePage, beforeEnter: () => allowRoot},
        {path: '/account', component: AccountPage}
      ],
      errorRoute,
      defaultRoute,
      AppComponent,
      renderer
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    router.route('/account');
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const popStateHandler = addEventListenerSpy.mock.calls
      .filter(call => call[0] === 'popstate')
      .slice(-1)[0]?.[1] as EventListener;
    allowRoot = false;
    vi.clearAllMocks();
    window.location.href = 'http://localhost/';

    popStateHandler(new PopStateEvent('popstate', {
      state: {__dotaRouter: {position: 0, applicationState: null}}
    }));
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(goSpy).toHaveBeenCalledWith(1);
    expect(renderer).not.toHaveBeenCalled();

    window.location.href = 'http://localhost/account';
    popStateHandler(new PopStateEvent('popstate', {
      state: {__dotaRouter: {position: 1, applicationState: null}}
    }));
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(renderer).not.toHaveBeenCalled();
  });

  it('should restore before following a popstate guard redirect', async () => {
    let rootGuardResult: true | string = true;
    class HomePage extends HTMLElement {}
    class AccountPage extends HTMLElement {}
    class SignInPage extends HTMLElement {}
    const renderer = vi.fn();
    const router = new DomHistoryRouter<HTMLElement>(
      [
        {path: '/', component: HomePage, beforeEnter: () => rootGuardResult},
        {path: '/account', component: AccountPage},
        {path: '/sign-in', component: SignInPage}
      ],
      errorRoute,
      defaultRoute,
      AppComponent,
      renderer
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    router.route('/account');
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const popStateHandler = addEventListenerSpy.mock.calls
      .filter(call => call[0] === 'popstate')
      .slice(-1)[0]?.[1] as EventListener;
    rootGuardResult = '/sign-in';
    vi.clearAllMocks();
    window.location.href = 'http://localhost/';

    popStateHandler(new PopStateEvent('popstate', {
      state: {__dotaRouter: {position: 0, applicationState: null}}
    }));
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(goSpy).toHaveBeenCalledWith(1);
    expect(renderer).not.toHaveBeenCalled();

    window.location.href = 'http://localhost/account';
    popStateHandler(new PopStateEvent('popstate', {
      state: {__dotaRouter: {position: 1, applicationState: null}}
    }));
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({__dotaRouter: expect.any(Object)}),
      '',
      'http://localhost/sign-in'
    );
    expect(renderer).toHaveBeenCalledWith(
      expect.objectContaining({pathname: '/sign-in'}),
      expect.any(Object)
    );
  });

});
