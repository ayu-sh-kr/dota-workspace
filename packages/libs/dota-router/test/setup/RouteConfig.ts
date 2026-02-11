import {
  AboutComponent,
  ContactComponent, ErrorComponent,
  HomeComponent,
  ProductsComponent,
  ResourceComponent
} from "@test/setup/Components";
import {ComponentClass, RouteConfig} from "@dota/Types";
import { BaseElement } from "@ayu-sh-kr/dota-core";


export const components: ComponentClass<BaseElement>[] = [
  HomeComponent, ProductsComponent, ResourceComponent,
  AboutComponent, ContactComponent, ErrorComponent
];

export const defaultRoute: RouteConfig<HTMLElement> = {
  path: '/',
  component: HomeComponent,
  default: true
}

export const errorRoute: RouteConfig<HTMLElement> = {
  path: '/error',
  component: ErrorComponent
}