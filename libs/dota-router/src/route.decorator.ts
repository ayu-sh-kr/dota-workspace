import {RouteConfig} from "@dota/Types";

function RouteDecorator(config: RouteConfig<HTMLElement>) {
  return function (target: CustomElementConstructor) {
    Reflect.defineMetadata('Route', config, target);
  }
}

export { RouteDecorator as Route};