
declare module "virtual:dota-components" {
  import {DotaElementConstructor} from "@ayu-sh-kr/dota-core";
  const components: DotaElementConstructor[];
  export default components;
}


declare module "virtual:dota-component-modules" {
  const modules: Record<string, any>;
  export default modules;
}