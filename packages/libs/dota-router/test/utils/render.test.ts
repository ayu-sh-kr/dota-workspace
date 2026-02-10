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
import {defaultRoute, errorRoute} from "@test/setup/RouteConfig";


describe('RouterUtils.render', () => {

  const components = [
    AppComponent, HomeComponent, ErrorComponent,
    ResourceComponent, ContactComponent, AboutComponent,
    CustomRenderComponent
  ];

  let routes: RouteConfig<HTMLElement>[];

  beforeEach(() => {
    const root = document.createElement('app-root');
    root.id = 'app-root';
    document.body.appendChild(root);
    routes = RouterUtils.prepareConfig(components);
  });

  afterEach(() => {
    vi.clearAllMocks();
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

})