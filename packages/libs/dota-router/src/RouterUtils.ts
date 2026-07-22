import {ComponentClass, RenderConfig, RouteConfig, Router} from "@dota/Types";
import {matchRoute} from "@dota/route/route-matcher";
import 'reflect-metadata';
import {HelperUtils, ComponentConfig} from "@ayu-sh-kr/dota-core";

/** Preserves legacy path, rendering, and route-metadata helpers for applications. */
export class RouterUtils {

  /**
   * Reads the pathname immediately before the active Navigation API entry.
   * The empty string represents a history stack without a previous destination.
   * @returns The previous pathname, or an empty string when no prior entry exists.
   * @deprecated Coordinators now receive transition context instead of reading history entries.
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
   * Reads the pathname currently visible in the document URL.
   * @returns The browser's current pathname.
   * @deprecated Coordinators expose the destination URL through NavigationContext.
   */
  static getCurrentPath(): string {
    return window.location.pathname;
  }

  /**
   * Removes a known parent prefix from a complete pathname.
   * @param previousPath - Prefix whose length should be removed.
   * @param completePath - Full pathname containing the prefix.
   * @returns The remaining path suffix, including its leading slash when present.
   * @deprecated Route matches now provide normalized path and branch data directly.
   */
  static getNextPath(previousPath: string, completePath: string): string {
    return completePath.substring(previousPath.length);
  }

  /**
   * Calculates the parent pathname by removing the final non-empty segment.
   * @param path - Pathname whose parent should be returned.
   * @returns The parent pathname, or `/` for a root or single-segment path.
   * @deprecated Route configuration and matches now represent parent branches explicitly.
   */
  static getParentPath(path: string): string {
    const segments = path.split('/').filter(segment => segment.length > 0);
    if (segments.length <= 1) {
      return '/';
    }
    segments.pop();
    return '/' + segments.join('/');
  }

  /**
   * Determines whether a pathname has at most one non-empty segment.
   * @param path - Pathname to classify.
   * @returns `true` for root and single-segment paths; otherwise `false`.
   * @deprecated Route branches now identify parent and leaf nodes structurally.
   */
  static isParent(path: string): boolean {
    const segments = path.split('/').filter(segment => segment.length > 0);
    return segments.length <= 1;
  }

  /**
   * Renders a legacy route configuration into the router's root host.
   * This preserves custom render callbacks and the historical `/error` redirect;
   * coordinator adapters use `createRouteRenderer` for new transitions.
   * @param config - Legacy path, route tree, options, and router context.
   * @deprecated Use a coordinator with a `RouteRenderer` callback for new integrations.
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

    const route = matchRoute(path, routes, router.errorRoute);
    if (route === router.errorRoute) {
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
   * Normalizes a path before delegating it to a legacy router instance.
   * @param router - Router adapter that owns browser-specific navigation.
   * @param path - Relative or absolute application path.
   * @deprecated Call the adapter's `route` method directly in coordinator-based integrations.
   */
  static route(router: Router<HTMLElement>, path: string): void {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    router.route(normalizedPath);
  }

  /**
   * Collects flat route metadata from decorated component classes.
   * Tree construction belongs to `configure`, which also receives the error route
   * needed for generated parents; keeping this method flat avoids a second hierarchy policy.
   * @param elements - Component classes that may carry `Route` metadata.
   * @returns Flat route configurations in the same order as the supplied components.
   */
  static prepareConfig(elements: ComponentClass[]): RouteConfig<HTMLElement>[] {
    const routes: RouteConfig<HTMLElement>[] = [];

    for (const element of elements) {
      if (element && Reflect.hasOwnMetadata('Route', element)) {
        const config: RouteConfig<HTMLElement> = Reflect.getOwnMetadata('Route', element);
        routes.push(config);
      }
    }

    return routes;
  }
}
