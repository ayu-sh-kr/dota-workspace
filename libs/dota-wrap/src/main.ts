import { bootstrap, DotaElementConstructor } from '@ayu-sh-kr/dota-core';
import {
  ComponentClass,
  DomHistoryRouter,
  DotaRouterService,
  RouteConfig,
  Router,
  RouterService,
} from '@ayu-sh-kr/dota-router';


export type AnyModule = Record<string, unknown>;

export type AppConfig = {
  modules: AnyModule;
  externalComponents?: ComponentClass[];
  errorRoute: RouteConfig<HTMLElement>;
  defaultRoute: RouteConfig<HTMLElement>;
  root: ComponentClass;
}

/**
 * Extract component constructors from either:
 * - eager modules: Record<string, moduleObject>
 * - lazy modules:  Record<string, () => Promise<moduleObject>>
 *
 * Optimizations:
 * - Parallelize lazy imports with Promise.all
 * - Avoid sequential awaits
 */
async function extractComponent(modules: Record<string, unknown>): Promise<DotaElementConstructor[]> {
  const entries = Object.values(modules);

  const loadedModules: AnyModule[] = await Promise.all(
    entries.map(async (entry) => {
      if (typeof entry === 'function') {
        // lazy module loader
        const mod = await (entry as () => Promise<unknown>)();
        return (mod ?? {}) as AnyModule;
      }
      // eager module object
      return (entry ?? {}) as AnyModule;
    })
  );

  const components: CustomElementConstructor[] = [];
  for (const mod of loadedModules) {
    for (const exported of Object.values(mod)) {
      if (typeof exported === 'function' && (exported as any).prototype instanceof HTMLElement) {
        components.push(exported as CustomElementConstructor);
      }
    }
  }

  return components;
}

/**
 * Registers custom elements for use in the application by bootstrapping them.
 *
 * This function uses `extractComponent` to discover custom elements from the provided modules,
 * combines them with any externally provided components, and passes the complete list to the
 * `bootstrap` function. The intention is to ensure all relevant custom elements are registered
 * and available for use in the application.
 *
 * @param modules - An object mapping module paths to functions that dynamically import the module.
 * @param externalComponents - An optional array of CustomElementConstructor instances to include in registration.
 *
 */
export async function registerComponents(
  modules: Record<string, unknown>,
  externalComponents: DotaElementConstructor[] = []
) {
  const components = await extractComponent(modules);

  // Avoid extra spreads; keep it tight
  if (externalComponents.length > 0) {
    components.push(...externalComponents);
  }

  bootstrap(components);
  return components;
}
/**
 * Registers routes for the application using discovered custom elements and returns a router service.
 *
 * This function discovers custom elements from the provided modules, combines them with any external components,
 * and initializes a router service using the specified error and default routes. The intention is to automate
 * the setup of application routing based on dynamically loaded components.
 *
 * @typeParam T - The router type, extending Router<HTMLElement>.
 * @param components - The array of custom element constructors to use for route registration.
 * @param errorRoute - The route configuration to use for error handling.
 * @param defaultRoute - The route configuration to use as the default route.
 * @param root - The root component class for the application.
 * @returns A promise that resolves to an instance of DotaRouterService configured with the discovered components and routes.
 */
export async function registerRoutes(
  components: ComponentClass[],
  errorRoute: RouteConfig<HTMLElement>,
  defaultRoute: RouteConfig<HTMLElement>,
  root: ComponentClass
): Promise<RouterService<Router<HTMLElement>>> {
  return DotaRouterService.fromComponents({
    router: DomHistoryRouter,
    components: [...components],
    errorRoute: errorRoute,
    defaultRoute: defaultRoute,
    root: root
  });
}

/**
 * Initializes the application by registering components and routes.
 *
 * This function calls both `registerComponents` and `registerRoutes` with the provided arguments,
 * and returns their results in an object. The intention is to provide a single entry point for
 * bootstrapping the application's components and routing configuration.
 *
 * @param config - The application configuration containing modules, external components, error route, default route, and root component.
 * @returns A promise that resolves to an object containing the results of component registration and route registration.
 */
export async function initializeApp(config: AppConfig): Promise<{
  components: ComponentClass[],
  routerService: RouterService<Router<HTMLElement>>
}> {
  const components = await registerComponents(config.modules, config.externalComponents);
  console.info(`${components.length} Components registered.`);

  const routerService = await registerRoutes(
    components, config.errorRoute, config.defaultRoute, config.root
  );
  routerService.init();
  console.info(`${routerService._routes.length} Routes registered.`);

  console.info('Application initialized.');
  return { components, routerService };
}
