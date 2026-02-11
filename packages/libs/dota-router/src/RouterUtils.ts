import {ComponentClass, RenderConfig, RouteConfig, Router} from "@dota/Types";
import 'reflect-metadata';
import {BaseElement, HelperUtils, ComponentConfig} from "@ayu-sh-kr/dota-core";

export class RouterUtils {

  /**
   * Get the previous path from the navigation entries.
   * This method retrieves the previous path from the navigation entries using the Navigation API.
   * It checks if there are more than one entry and returns the pathname of the second-to-last entry.
   *
   * @returns The previous path as a string or an empty string if not found.
   */
  static getPreviousPath(): string {
    const navigation = window.navigation;
    const entries = navigation.entries();
    if (entries.length > 1) {
      return new URL(entries[entries.length - 2].url || '').pathname;
    }
    return '';
  }

  /**
   * Get the current path from the navigation entries.
   * This method retrieves the current path from the navigation entries using the Navigation API.
   * It checks if there are any entries and returns the pathname of the last entry.
   *
   * @returns The current path as a string or an empty string if not found.
   */
  static getCurrentPath(): string {
    return window.location.pathname;
  }

  /**
   * Get the child path from the given path and route configuration.
   * This method extracts the child path from the given path based on the route configuration.
   * It checks if the path starts with the route's path and returns the remaining part of the path.
   *
   * @param path - The path to extract the child path from.
   * @param route - The route configuration to check against.
   * @returns The child path as a string or '/' if not found.
   */
  static getChildPath<T extends HTMLElement>(path: string, route: RouteConfig<T>) {
    return path.substring(route.path.length) || '/';
  }

  /**
   *
   * @param previousPath
   * @param completePath
   */
  static getNextPath(previousPath: string, completePath: string): string {
    return completePath.substring(previousPath.length);
  }

  /**
   * Get the parent path from the given path and route configuration.
   * This method extracts the parent path from the given path based on the route configuration.
   * It splits the path into segments and removes the last segment to get the parent path.
   *
   * @param path - The path to extract the parent path from.
   * @returns The parent path as a string or '/' if not found.
   */
  static getParentPath(path: string) {
    const segments = path.split('/').filter(segment => segment.length > 0);
    if (segments.length <= 1) {
      return '/';
    }
    segments.pop(); // Remove the last segment to get the parent path
    return '/' + segments.join('/');
  }

  /**
   * Check if the given path is a parent path (i.e., has no child segments).
   * This method checks if the given path is a parent path by splitting it into segments
   * and checking if there is only one or no segments.
   *
   * @param path - The path to check.
   * @returns True if the path is a parent path, false otherwise.
   */
  static isParent(path: string) {
    const segments = path.split('/').filter(segment => segment.length > 0);
    return segments.length <= 1;
  }

  /**
   * Finds the most appropriate route configuration for a given path in a routing hierarchy.
   *
   * @template T - Type parameter extending BaseElement to ensure type safety with route components
   * @param path - The URL path to find a route for (e.g., "/users/profile")
   * @param routes - Array of route configurations to search through
   * @returns The matching RouteConfig or undefined if no match is found
   *
   * @algorithm
   * 1. Exact Match Phase:
   *    - First attempts to find a route with a path exactly matching the requested path
   *    - If an exact match is found: return it
   *
   * 2. Prefix Match Phase (only executed if no exact match was found):
   *    - For each route configuration:
   *      a. Check if the request path starts with the route's path
   *      b. For routes with children:
   *         - If route has a render function, return it immediately
   *         - Calculate the remaining child path by removing the parent path
   *         - Recursively search for a matching child route
   *         - Return matching child route if found, otherwise return the parent route
   *
   * 3. Return undefined if no matches are found
   *
   * @example
   * With routes configuration:
   * [
   *   { path: "/dashboard", component: DashboardComponent },
   *   { path: "/users", component: UsersComponent, children: [
   *     { path: "/users/profile", component: ProfileComponent },
   *     { path: "/users/settings", component: SettingsComponent }
   *   ]}
   * ]
   *
   * // Simple exact match
   * findRoute("/dashboard", routes) -> Returns DashboardComponent route
   *
   * // Child route exact match
   * findRoute("/users/profile", routes) -> Returns ProfileComponent route
   *
   * // Non-existent path with valid parent prefix
   * findRoute("/users/unknown", routes) -> May return UsersComponent as fallback
   */
  static findRoute<T extends HTMLElement>(path: string, routes: RouteConfig<T>[]): RouteConfig<T> | undefined {
    // Phase 1: Exact Match Phase
    const exactMatch = routes.find(route => route.path === path);
    if (exactMatch) return exactMatch;

    // Phase 2: Prefix Match Phase (only if no exact match was found)
    for (const route of routes) {
      // Check if the path starts with this route's path and the route has children
      if (path.startsWith(route.path) && route.children && route.children.length > 0) {
        // If the route has a render function, prioritize it
        if (route.render) {
          return route;
        }

        // Calculate the remaining path after removing the parent path
        const childPath = RouterUtils.getChildPath(path, route);

        // Recursively search for a matching child route
        const childRoute = RouterUtils.findRoute(childPath, route.children);

        // Return the child route if found, otherwise fall back to the parent route
        if (childRoute) {
          return childRoute;
        }

        return route;
      }
    }

    // If no match found in either phase, return undefined
    return undefined;
  }

  /**
   * Render the component based on the current path and route configuration.
   * This method is responsible for rendering the appropriate component based on the current path.
   * It checks if the route has a custom render function or if it has a component associated with it.
   * If a component is found, it renders it in the app root element.
   *
   * @param config - The configuration object containing the path, routes, options, and router instance.
   * @returns void
   */
  static render<T extends HTMLElement>(config: RenderConfig<T>): void {
    const {path, routes, options} = config;
    const router = config.router as Router<T>;
    const rootConfig: ComponentConfig = HelperUtils.getComponentMetadata(router.root, 'Component');
    const rootElement = document.querySelector(`#${rootConfig.selector}`)
    if (!rootElement) {
      console.error(`Root element not found for selector: ${rootConfig.selector}`);
      return;
    }

    if (path === '/error') {
      if (Reflect.hasOwnMetadata('Component', router.errorRoute.component)) {
        const config: ComponentConfig = Reflect.getOwnMetadata('Component', router.errorRoute.component);
        rootElement.innerHTML = `
            <${config.selector} message="${options?.message || 'Path not found'}"></${config.selector}>
        `;
        return;
      }
      console.error(`Error route component not found for path: ${path}`);
    }

    const route = RouterUtils.findRoute(path, routes);
    if (!route) {
      console.warn(`Route not found for path: ${path}`);
      RouterUtils.route(router, '/error');
      return;
    }

    if (route.render) {
      console.info(`Using custom render for path: ${path}`);
      route.render(path);
      return;
    }

    if (Reflect.hasOwnMetadata('Component', route.component)) {
      const config: ComponentConfig = Reflect.getOwnMetadata('Component', route.component);
      rootElement.innerHTML = `<${config.selector} path="${path}"></${config.selector}>`;
      return;
    }

    console.error(`Component not found for path: ${path}`);
  }

  /**
   * Navigate to a specific path using the provided router instance.
   * This method uses the router instance to navigate to the specified path.
   * It checks the type of router and calls the appropriate routing method.
   *
   * @param router - The router instance to use for navigation.
   * @param path - The path to navigate to.
   * @returns void
   */
  static route(router: Router<HTMLElement>, path: string) {
    // Normalize the path to ensure it starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    router.route(normalizedPath);
  }

  /**
   * Prepare a hierarchical route configuration from a flat array of component classes.
   * This method takes an array of component classes and extracts their route configurations
   * using metadata. It then builds a hierarchical structure of routes based on their paths.
   * The resulting array contains only the top-level routes, with their children nested appropriately.
   * This allows for easy management of nested routes in a routing system.
   *
   *
   * @param elements - An array of component classes to extract route configurations from.
   * @returns An array of top-level route configurations with nested children.
   */
  static prepareConfig(elements: ComponentClass[]): RouteConfig<HTMLElement>[] {
    const routes: RouteConfig<HTMLElement>[] = [];
    const routeMap: Map<string, RouteConfig<HTMLElement>> = new Map();

    // Step 1 - Extract all the routes
    for (const element of elements) {
      if (element && Reflect.hasOwnMetadata('Route', element)) {
        const config: RouteConfig<HTMLElement> = Reflect.getOwnMetadata('Route', element);
        routeMap.set(config.path, config);
      }
    }

    // find the root path and add it to the routes and remove it from the map
    const rootComponent = routeMap.get('/');
    if (rootComponent) {
      routes.push(rootComponent)
      routeMap.delete('/')
    }

    // Step 2 - Build the hierarchy
    for (const route of routeMap.values()) {
      RouterUtils.addRoute(route.path, routes, route)
    }

    // Step 3 - Return the top-level routes
    if (routes.length > 0) {
      return routes;
    }

    return [];
  }

  /**
   * Recursively builds a nested route hierarchy from a flat route configuration.
   *
   * This method takes a full route path, the current array of routes (which may be top-level or nested),
   * and a route configuration. It splits the path into segments and determines whether the route should be
   * added as a top-level route or nested under a parent. If the route is nested, it finds or creates the parent,
   * then recurses to add the route to the parent's children.
   *
   * - If the path has only one segment, the route is added directly to the current routes array.
   * - If the path has multiple segments, the method finds or creates the parent route for the first segment,
   *   then recurses with the remaining segments to nest the route appropriately.
   *
   * @template T - Type parameter extending HTMLElement for route component type safety
   * @param completePath - The full path of the route to add (e.g., "/resource/about")
   * @param routes - The current array of route configurations (top-level or nested)
   * @param route - The route configuration to add to the hierarchy
   */
  private static addRoute<T extends HTMLElement>(
    completePath: string, routes: RouteConfig<T>[], route: RouteConfig<T>
  ) {
    // break the complete path into segments
    const segments = completePath.replace(/^\//, '')
      .split('/')
      .filter(Boolean);

    // one segment means top level route, add directly to routes
    // fix the path as the route might have full path but should be only segment
    if (segments.length === 1) {
      route.path = '/' + segments[0];
      // check if the path already exists, then update it
      const existingRoute = routes.find(r => r.path === route.path);
      if (existingRoute) {
        existingRoute.component = route.component;
        existingRoute.default = route.default;
        existingRoute.render = route.render;
        return;
      }
      // else add the route directly
      routes.push(route);
      return;
    }

    // more than one segment means nested route
    // find the parent route and add the route to its children
    const parentRoute = routes.find(r => r.path === '/' + segments[0]);
    const remainingPath = segments.slice(1)
      .join('/');

    if (!parentRoute) {
      const items = {
        path: '/' + segments[0],
        component: UnknownComponent,
        children: []
      };
      routes.push(items)
      RouterUtils.addRoute(`/${remainingPath}`, items.children!, route);
      return;
    }

    if (!parentRoute.children) parentRoute.children = []
    RouterUtils.addRoute(`/${remainingPath}`, parentRoute.children, route)
  }
}

class UnknownComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
    throw new Error("Method not implemented.");
  }
}