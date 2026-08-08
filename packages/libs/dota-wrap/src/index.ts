import { bootstrap, DotaElementConstructor, setMountStrategy } from '@ayu-sh-kr/dota-core';
import {
  ComponentClass,
  DomHistoryRouter,
  DotaRouterService,
  GlobalNavigationHooks,
  RouteConfig,
  Router,
  RouterService,
  RouteRenderer,
  createRouteRenderer,
} from '@ayu-sh-kr/dota-router';
import type {DotaRuntimeContext, DotaRuntimePlugin} from './runtime-plugin';

export * from './core';
export * from './event';
export * from './rest';
export * from './router';
export * from './runtime-plugin';

/** Export map returned by eager or lazily imported application modules. */
export type AnyModule = Record<string, unknown>;

/**
 * Defines the application inputs consumed by Dota Wrap's composition root.
 * Runtime plugins are optional and additive; omitting them preserves the existing
 * component registration, default mount, and route-rendering behavior.
 */
export type AppConfig = {
  /** Component modules or already resolved constructors registered by Dota Core. */
  modules: Record<string, unknown> | DotaElementConstructor[];
  /** Additional constructors supplied by external UI packages. */
  externalComponents?: ComponentClass[];
  /** Explicit flat route declarations; decorated routes remain the fallback. */
  routes?: RouteConfig<HTMLElement>[];
  /** Route shown when the requested destination cannot be resolved. */
  errorRoute: RouteConfig<HTMLElement>;
  /** Route selected for the application's default destination. */
  defaultRoute: RouteConfig<HTMLElement>;
  /** Root component whose host receives routed page elements. */
  root: ComponentClass;
  /** Application-wide guards and lifecycle observers. */
  globalHooks?: GlobalNavigationHooks<HTMLElement>;
  /**
   * Ordered opt-in runtime extensions; omission preserves all built-in defaults.
   *
   * **Constraint:** at most one plugin in this array may call `context.setMountStrategy()`
   * during its `setup()`. The mount strategy slot is exclusive — a second claim crashes the
   * application at startup. If two hydration-capable plugins are both listed here, remove one;
   * they cannot coexist. `initializeApp` throws a clear error naming both conflicting plugins
   * so the misconfiguration is immediately identifiable in the console.
   */
  plugins?: readonly DotaRuntimePlugin[];
}

/**
 * Resolves eager or lazy module records into browser custom-element constructors.
 * Non-component exports are ignored so generated virtual modules may expose related
 * helpers without changing application registration.
 * @param modules Eager exports or lazy import functions supplied by the application.
 * @returns Constructors whose prototypes inherit from the active browser HTMLElement.
 */
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

/**
 * Registers application and external component constructors with Dota Core.
 * Module loading finishes before one bootstrap call so custom-element upgrades occur
 * only after runtime plugins have configured the application sockets.
 * @param modules Generated module map or already resolved application constructors.
 * @param externalComponents Additional constructors supplied by UI libraries.
 * @returns Complete constructor list passed to bootstrap.
 */
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

/**
 * Creates a router service from the registered components and optional explicit routes.
 * The renderer parameter is additive DI; omission preserves Dota Router's default
 * component-tag presentation behavior for existing callers.
 * @param components Constructors available to metadata-based route discovery.
 * @param errorRoute Fallback route for unresolved destinations.
 * @param defaultRoute Application default destination.
 * @param root Component whose host owns the route outlet.
 * @param routes Optional explicit flat route declarations.
 * @param globalHooks Application-wide navigation guards and observers.
 * @param renderer Optional presentation strategy supplied by runtime plugins.
 * @returns Deferred router service ready for initialization.
 */
export async function registerRoutes(
  components: ComponentClass[],
  errorRoute: RouteConfig<HTMLElement>,
  defaultRoute: RouteConfig<HTMLElement>,
  root: ComponentClass,
  routes: RouteConfig<HTMLElement>[] = [],
  globalHooks?: GlobalNavigationHooks<HTMLElement>,
  renderer?: RouteRenderer<HTMLElement>
): Promise<RouterService<Router<HTMLElement>>> {
  return DotaRouterService.fromComponents({
    router: DomHistoryRouter,
    components: [...components],
    routes: routes.length > 0 ? [...routes] : undefined,
    errorRoute,
    defaultRoute,
    root,
    globalHooks,
    renderer
  });
}

/**
 * Composes runtime extensions, registers elements, and initializes application routing.
 * Plugin setup intentionally precedes custom-element definition so an existing static
 * document can hydrate during upgrade instead of taking the default client mount path.
 * @param config Components, routes, root, hooks, and opt-in runtime plugins.
 * @returns Registered constructors and initialized router service.
 */
export async function initializeApp(config: AppConfig): Promise<{
  components: ComponentClass[],
  routerService: RouterService<Router<HTMLElement>>
}> {
  let routeRenderer = createRouteRenderer(config.root);

  // Track which plugin owns the mount strategy slot so a double-registration
  // surfaces a diagnostic naming both plugins instead of dota-core's generic throw.
  let mountStrategyOwner: string | null = null;
  let currentPlugin = '<unknown>';

  const runtimeContext: DotaRuntimeContext = {
    setMountStrategy(strategy) {
      if (mountStrategyOwner !== null) {
        throw new Error(
          `dota-wrap: two hydration-capable plugins both claim the exclusive mount strategy slot: ` +
          `"${mountStrategyOwner}" (already registered) and "${currentPlugin}" (attempted). ` +
          `Remove one from the plugins array — they cannot coexist.`
        );
      }
      mountStrategyOwner = currentPlugin;
      setMountStrategy(strategy);
    },
    wrapRouteRenderer(wrapper) {
      routeRenderer = wrapper(routeRenderer, config.root);
    }
  };

  config.plugins?.forEach((plugin) => {
    currentPlugin = plugin.name;
    plugin.setup?.(runtimeContext);
  });

  const components = await registerComponents(config.modules, config.externalComponents);
  console.info(`${components.length} Components registered.`);

  const routerService = await registerRoutes(
    components,
    config.errorRoute,
    config.defaultRoute,
    config.root,
    config.routes ?? [],
    config.globalHooks,
    routeRenderer
  );
  routerService.init();
  console.info(`${routerService._routes.length} Routes registered.`);

  console.info('Application initialized.');
  return { components, routerService };
}
