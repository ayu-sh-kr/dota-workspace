/**
 * RouterService interface defines the methods that a router service should implement.
 * It includes an init method to initialize the router and a render method to render the appropriate component based on the current path.
 *
 * @template T - The type of the component that the router will render.
 */
export interface Router<T extends HTMLElement> {

  readonly routes: RouteConfig<T>[];
  readonly errorRoute: RouteConfig<T>;
  readonly defaultRoute: RouteConfig<T>;

  /**
   * Initialize the router and set up event listeners for navigation events.
   * This method is called when the router is created.
   * It sets up the event listener for the 'navigate' event on the Navigation API.
   * The event listener intercepts navigation requests and renders the appropriate component based on the current path.
   *
   * @returns void
   */
  init(): void;
}

export type RouteConfig<T extends HTMLElement> = {
  path: string;
  component: ComponentClass<T>;
  default?: boolean;
  children?: RouteConfig<T>[];
  render?: (path: string) => void;
}

export type NavigationOption = {
  [key: string]: string;
}

export type RenderConfig<T extends HTMLElement> = {
  path: string;
  routes: RouteConfig<T>[];
  options?: NavigationOption;
  router: Router<T>;
}


export interface DefaultRouterConfig<T extends Router<HTMLElement>> {
  routes?: RouteConfig<HTMLElement>[];
  errorRoute: RouteConfig<HTMLElement>;
  defaultRoute: RouteConfig<HTMLElement>;
  router: new (...args: any[]) => T;
  components?: ComponentClass<HTMLElement>[];
}


export interface RouterService<T extends Router<HTMLElement>> {
  _router: new (...args: any[]) => T;
  _routes: RouteConfig<HTMLElement>[];
  _errorRoute: RouteConfig<HTMLElement>;
  _defaultRoute: RouteConfig<HTMLElement>;

  init(): RouterService<T>;

  route(path: string): void;
}

export type ComponentClass<T> = new (...args: any[]) => T;
