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
  it('should collect route when elements with route info given', () => {
    const elements = [
      HomeComponent, AboutComponent, ContactComponent,
      ResourceComponent, ProductsComponent, DocComponent
    ];
    const routes = RouterUtils.prepareConfig(elements);

    const homeRoute = RouterUtils.findRoute('/', routes);
    expect(homeRoute).toBeDefined

    const resourceRoute = RouterUtils.findRoute('/resource', routes);
    expect(resourceRoute).toBeDefined;
    expect(resourceRoute?.children).toBeDefined;
    expect(resourceRoute?.children?.length).toBe(2);
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
    console.log(routes)
    // Only valid components should be present
    expect(routes.some(r => r.component === HomeComponent)).toBe(true);
    expect(routes.some(r => r.component === DummyComponent)).toBe(false);
    expect(routes.some(r => r.component === DocComponent)).toBe(true);
  });
});
