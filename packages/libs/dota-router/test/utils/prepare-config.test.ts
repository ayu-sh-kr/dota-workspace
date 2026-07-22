import {describe, expect, it} from "vitest";
import {
  AboutComponent,
  ContactComponent, DocComponent, DummyComponent,
  HomeComponent,
  ProductsComponent,
  ResourceComponent
} from "@test/setup/Components";
import {RouterUtils} from '@dota/RouterUtils'

describe('RouteUtils.prepareConfig', () => {
  it('should collect flat routes when elements with route info given', () => {
    const elements = [
      HomeComponent, AboutComponent, ContactComponent,
      ResourceComponent, ProductsComponent, DocComponent
    ];
    const routes = RouterUtils.prepareConfig(elements);

    expect(routes.map(route => route.path)).toEqual([
      '/',
      '/resource/about',
      '/resource/contact',
      '/resource',
      '/shop/product',
      '/doc'
    ]);
  });

  it('should return empty array when no components are given', () => {
    const routes = RouterUtils.prepareConfig([]);
    expect(routes).toEqual([]);
  });

  it('should return empty array when components have no route info', () => {
    const routes = RouterUtils.prepareConfig([DummyComponent]);
    expect(routes).toEqual([]);
  });

  it('should handle mixture of valid and invalid components', () => {

    const elements = [HomeComponent, DummyComponent, DocComponent];
    const routes = RouterUtils.prepareConfig(elements);

    expect(routes.some(r => r.component === HomeComponent)).toBe(true);
    expect(routes.some(r => r.component === DummyComponent)).toBe(false);
    expect(routes.some(r => r.component === DocComponent)).toBe(true);
  });

  it('should ignore missing component entries while retaining valid metadata', () => {
    const elements = [undefined, HomeComponent, null] as unknown as typeof HomeComponent[];

    const routes = RouterUtils.prepareConfig(elements);

    expect(routes).toHaveLength(1);
    expect(routes[0].component).toBe(HomeComponent);
  });
});
