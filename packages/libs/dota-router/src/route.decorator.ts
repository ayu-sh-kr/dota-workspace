import {RouteConfig, RouteMeta} from "@dota/Types";

/**
 * Declares a component as a route and preserves its transition behavior in metadata.
 *
 * The router compiles this metadata into its route tree during startup. Guards run
 * before a navigation commits, while lifecycle hooks run after the approved match
 * has rendered, so a page can keep navigation policy next to its route declaration
 * without depending on a browser-specific router adapter.
 *
 * @param config - Path, fallback behavior, renderer, and optional transition hooks.
 * @returns A class decorator that stores the route configuration on the component.
 */
function RouteDecorator(config: RouteMeta) {
  return function (target: CustomElementConstructor) {
    const routeConfig: RouteConfig<HTMLElement> = {
      path: config.path,
      component: target,
      ssr: config.ssr === true,
      default: config.default,
      render: config.render,
      beforeEnter: config.beforeEnter,
      beforeLeave: config.beforeLeave,
      afterEnter: config.afterEnter,
      afterLeave: config.afterLeave
    }

    Reflect.defineMetadata('Route', routeConfig, target);
  }
}

export { RouteDecorator as Route};
