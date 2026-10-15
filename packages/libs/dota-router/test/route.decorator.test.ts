import "reflect-metadata";
import {describe, expect, it} from "vitest";
import {Metadata} from "@ayu-sh-kr/dota-core";
import {Route} from "@dota/route.decorator";
import {RouterMetadata} from "@dota/router-metadata";
import {NavigationContext, RouteConfig} from "@dota/Types";

class GuardedComponent extends HTMLElement {}
class StaticComponent extends HTMLElement {}

describe("Route", () => {
  it("keeps static generation disabled unless explicitly enabled", () => {
    Route({path: "/client"})(GuardedComponent);
    Route({path: "/static", ssr: true})(StaticComponent);

    expect(Metadata.for(GuardedComponent).own(RouterMetadata.route)).toMatchObject({ssr: false});
    expect(Metadata.for(StaticComponent).own(RouterMetadata.route)).toMatchObject({ssr: true});
  });

  it("keeps declared guards and lifecycle hooks in route metadata", () => {
    const beforeEnter = (_context: NavigationContext) => true as const;
    const beforeLeave = (_context: NavigationContext) => "/sign-in";
    const afterEnter = (_context: NavigationContext) => undefined;
    const afterLeave = (_context: NavigationContext) => Promise.resolve();

    Route({
      path: "/account",
      beforeEnter,
      beforeLeave,
      afterEnter,
      afterLeave
    })(GuardedComponent);

    const route = Metadata.for(GuardedComponent).own(RouterMetadata.route) as RouteConfig<HTMLElement>;
    expect(route).toMatchObject({
      path: "/account",
      component: GuardedComponent,
      beforeEnter,
      beforeLeave,
      afterEnter,
      afterLeave
    });
  });

  it("keeps declared SEO metadata in the route configuration", () => {
    const seo = {
      title: "Account",
      description: "Manage your account",
      keywords: "account, profile"
    };

    Route({path: "/account", seo})(GuardedComponent);

    const route = Metadata.for(GuardedComponent).own(RouterMetadata.route) as RouteConfig<HTMLElement>;
    expect(route.seo).toBe(seo);
  });
});

describe("Route metadata", () => {
  it("does not treat a subclass of a routed page as a route", async () => {
    const {RouterUtils} = await import("@dota/RouterUtils");
    class RoutedPage extends HTMLElement {}
    class DerivedPage extends RoutedPage {}
    Route({path: "/routed"})(RoutedPage);

    expect(RouterUtils.prepareConfig([RoutedPage, DerivedPage]).map((route) => route.path)).toEqual(["/routed"]);
  });
});
