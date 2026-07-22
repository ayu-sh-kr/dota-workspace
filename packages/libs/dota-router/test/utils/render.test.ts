import {afterEach, beforeEach, describe, expect, vi} from "vitest";
import {
  AboutComponent,
  AppComponent,
  ContactComponent, CustomRenderComponent,
  ErrorComponent,
  HomeComponent,
  ResourceComponent
} from "@test/setup/Components";
import {RenderConfig, RouteConfig, Router} from "@dota/Types";
import {RouterUtils} from "@dota/RouterUtils";
import {configure} from "@dota/route/route-configurer";
import {defaultRoute, errorRoute} from "@test/setup/RouteConfig";

class UndecoratedComponent extends HTMLElement {}


describe('RouterUtils.render', () => {

  const components = [
    AppComponent, HomeComponent, ErrorComponent,
    ResourceComponent, ContactComponent, AboutComponent,
    CustomRenderComponent
  ];

  let routes: RouteConfig<HTMLElement>[];

  beforeEach(() => {
    document.body.innerHTML = '';
    const root = document.createElement('app-root');
    root.id = 'app-root';
    document.body.appendChild(root);
    routes = configure(RouterUtils.prepareConfig(components), errorRoute);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  })

  const prepareRenderConfig = (path: string): RenderConfig<HTMLElement> => {
    const mockRouter: Router<HTMLElement> = {
      defaultRoute: defaultRoute,
      errorRoute: errorRoute,
      routes: routes,
      root: AppComponent,
      init: vi.fn(),
      route: vi.fn()
    }

    return {
      path: path,
      routes: routes,
      router: mockRouter
    };
  }


  it('should render component for a valid route', () => {
    const renderConfig = prepareRenderConfig('/resource/contact');
    RouterUtils.render(renderConfig);
    const appRoot = document.getElementById('app-root');
    expect(appRoot?.innerHTML).toContain('dota-contact');
  });

  it('should render default route component for root path', () => {
    const renderConfig = prepareRenderConfig('/');
    RouterUtils.render(renderConfig);
    const appRoot = document.getElementById('app-root');
    expect(appRoot?.innerHTML).toContain('dota-home');
  });

  it('should render error route for unknown path', () => {
    const renderConfig = prepareRenderConfig('/unknown/path');
    RouterUtils.render(renderConfig);

    expect(renderConfig.router.route).toHaveBeenCalledWith('/error');
  });

  it('should render the component using render function', () => {
    const renderConfig = prepareRenderConfig('/custom-render');
    RouterUtils.render(renderConfig);
    const appRoot = document.getElementById('app-root');
    expect(appRoot?.innerHTML).toContain(`Custom Render Function ${renderConfig.path}`);
  });

  it('should render the explicit error route with a supplied message', () => {
    const renderConfig = prepareRenderConfig('/error');
    renderConfig.options = {message: 'Access denied'};

    RouterUtils.render(renderConfig);

    expect(document.getElementById('app-root')?.innerHTML).toContain('message="Access denied"');
  });

  it('should report a missing root host without invoking route rendering', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('app-root')?.remove();

    RouterUtils.render(prepareRenderConfig('/resource'));

    expect(error).toHaveBeenCalledWith('Root element not found for selector: app-root');
  });

  it('should report a route component without component metadata', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderConfig = prepareRenderConfig('/dummy');
    renderConfig.routes.push({path: '/dummy', component: UndecoratedComponent});

    RouterUtils.render(renderConfig);

    expect(error).toHaveBeenCalledWith('Component not found for path: /dummy');
  });

})
