import {RouteConfig, RouteMeta} from "@dota/Types";

function RouteDecorator(config: RouteMeta) {
  return function (target: CustomElementConstructor) {
    const routeConfig: RouteConfig<HTMLElement> = {
      path: config.path,
      component: target,
      default: config.default,
      render: config.render
    }

    Reflect.defineMetadata('Route', routeConfig, target);
  }
}

export { RouteDecorator as Route};