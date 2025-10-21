import { bootstrap } from '@ayu-sh-kr/dota-core';
import {
  DomHistoryRouter,
  DotaRouterService,
  RouteConfig,
  Router,
  RouterService,
} from '@ayu-sh-kr/dota-router';

/**
 * Extracts all custom element constructors from the provided dynamic import modules.
 *
 * This function iterates over each module, dynamically imports it, and inspects its exports.
 * If an export is a constructor function whose prototype extends HTMLElement, it is considered
 * a custom element and added to the result array. The intention is to automate the discovery
 * of custom elements for registration or bootstrapping in the application.
 *
 * @param modules - An object mapping module paths to functions that dynamically import the module.
 * @returns A promise that resolves to an array of CustomElementConstructor instances found in the modules.
 */
async function extractComponent(modules: Record<string, () => Promise<unknown>>): Promise<CustomElementConstructor[]> {
  const components: CustomElementConstructor[] = [];

  for (const path in modules) {
    const mod = await modules[path]();
    if (mod && typeof mod === 'object') {
      for (const key in mod as Record<string, unknown>) {
        const exported = (mod as Record<string, unknown>)[key];
        if (
          typeof exported === 'function' &&
          exported.prototype instanceof HTMLElement
        ) {
          components.push(exported as CustomElementConstructor);
        }
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
  modules: Record<string, () => Promise<unknown>>, externalComponents: CustomElementConstructor[] = []
) {
  const components: CustomElementConstructor[] = await extractComponent(modules);
  console.log(`Scanned ${components.length} for bootstrapping...`);
  bootstrap([...components, ...externalComponents]);
}

/**
 * Registers routes for the application using discovered custom elements and returns a router service.
 *
 * This function discovers custom elements from the provided modules, combines them with any external components,
 * and initializes a router service using the specified error and default routes. The intention is to automate
 * the setup of application routing based on dynamically loaded components.
 *
 * @typeParam T - The router type, extending Router<HTMLElement>.
 * @param modules - An object mapping module paths to functions that dynamically import the module.
 * @param externalComponents - An optional array of CustomElementConstructor instances to include in routing.
 * @param errorRoute - The route configuration to use for error handling.
 * @param defaultRoute - The route configuration to use as the default route.
 * @returns A promise that resolves to an instance of DotaRouterService configured with the discovered components and routes.
 */
export async function registerRoutes(
  modules: Record<string, () => Promise<unknown>>,
  externalComponents: CustomElementConstructor[] = [],
  errorRoute: RouteConfig<HTMLElement>,
  defaultRoute: RouteConfig<HTMLElement>,
): Promise<RouterService<Router<HTMLElement>>> {
  const components: CustomElementConstructor[] = await extractComponent(modules);
  return DotaRouterService.fromComponents({
    router: DomHistoryRouter,
    components: [...components, ...externalComponents],
    errorRoute,
    defaultRoute,
  });
}

/**
 * Initializes the application by registering components and routes.
 *
 * This function calls both `registerComponents` and `registerRoutes` with the provided arguments,
 * and returns their results in an object. The intention is to provide a single entry point for
 * bootstrapping the application's components and routing configuration.
 *
 * @param modules - An object mapping module paths to functions that dynamically import the module.
 * @param externalComponents - An optional array of CustomElementConstructor instances to include in registration and routing.
 * @param errorRoute - The route configuration to use for error handling.
 * @param defaultRoute - The route configuration to use as the default route.
 * @returns A promise that resolves to an object containing the results of component registration and route registration.
 */
export async function initializeApp(
  modules: Record<string, () => Promise<unknown>>,
  externalComponents: CustomElementConstructor[] = [],
  errorRoute: RouteConfig<HTMLElement>,
  defaultRoute: RouteConfig<HTMLElement>
): Promise<{
  components: void,
  routerService: RouterService<Router<HTMLElement>>
}> {
  console.info('Initializing application...');
  const components = await registerComponents(modules, externalComponents);
  console.info('Components registered.');
  console.info('Registering routes...');
  const routerService = await registerRoutes(modules, externalComponents, errorRoute, defaultRoute);
  console.info(`Routes registered with available routes size: ${routerService._routes.length}`);
  routerService.init();
  console.info('Application initialized.');
  return { components, routerService };
}
