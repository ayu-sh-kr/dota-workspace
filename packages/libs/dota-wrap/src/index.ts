import { bootstrap, DotaElementConstructor } from '@ayu-sh-kr/dota-core';
import {
  ComponentClass,
  DomHistoryRouter,
  DotaRouterService,
  GlobalNavigationHooks,
  RouteConfig,
  Router,
  RouterService,
} from '@ayu-sh-kr/dota-router';

export * from './core';
export * from './event';
export * from './rest';
export * from './router';

export type AnyModule = Record<string, unknown>;

export type AppConfig = {
  modules: Record<string, unknown> | DotaElementConstructor[];
  externalComponents?: ComponentClass[];
  routes?: RouteConfig<HTMLElement>[];
  errorRoute: RouteConfig<HTMLElement>;
  defaultRoute: RouteConfig<HTMLElement>;
  root: ComponentClass;
  globalHooks?: GlobalNavigationHooks<HTMLElement>;
}

async function extractComponent(modules: Record<string, unknown>): Promise<DotaElementConstructor[]> {
  const entries = Object.values(modules);

  const loadedModules: AnyModule[] = await Promise.all(
    entries.map(async (entry) => {
      if (typeof entry === 'function') {
        const mod = await (entry as () => Promise<unknown>)();
        return (mod ?? {}) as AnyModule;
      }

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

export async function registerComponents(
  modules: Record<string, unknown> | DotaElementConstructor[],
  externalComponents: DotaElementConstructor[] = []
) {
  let components: DotaElementConstructor[];

  if (Array.isArray(modules)) {
    components = modules;
  } else {
    components = await extractComponent(modules);
  }

  if (externalComponents.length > 0) {
    components.push(...externalComponents);
  }

  bootstrap(components);
  return components;
}

export async function registerRoutes(
  components: ComponentClass[],
  errorRoute: RouteConfig<HTMLElement>,
  defaultRoute: RouteConfig<HTMLElement>,
  root: ComponentClass,
  routes: RouteConfig<HTMLElement>[] = [],
  globalHooks?: GlobalNavigationHooks<HTMLElement>
): Promise<RouterService<Router<HTMLElement>>> {
  return DotaRouterService.fromComponents({
    router: DomHistoryRouter,
    components: [...components],
    routes: routes.length > 0 ? [...routes] : undefined,
    errorRoute,
    defaultRoute,
    root,
    globalHooks
  });
}

export async function initializeApp(config: AppConfig): Promise<{
  components: ComponentClass[],
  routerService: RouterService<Router<HTMLElement>>
}> {
  const components = await registerComponents(config.modules, config.externalComponents);
  console.info(`${components.length} Components registered.`);

  const routerService = await registerRoutes(
    components,
    config.errorRoute,
    config.defaultRoute,
    config.root,
    config.routes ?? [],
    config.globalHooks
  );
  routerService.init();
  console.info(`${routerService._routes.length} Routes registered.`);

  console.info('Application initialized.');
  return { components, routerService };
}
