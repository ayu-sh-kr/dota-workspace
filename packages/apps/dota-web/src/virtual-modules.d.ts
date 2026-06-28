
declare module "virtual:dota-components" {
  import {DotaElementConstructor} from "@ayu-sh-kr/dota-wrap/core";
  const components: DotaElementConstructor[];
  export default components;
}

declare module "virtual:dota-routes" {
  import {RouteConfig} from "@ayu-sh-kr/dota-wrap/router";
  export const routeConfig: RouteConfig<HTMLElement>[];
}

declare module "virtual:dota-component-modules" {
  const modules: Record<string, any>;
  export default modules;
}
