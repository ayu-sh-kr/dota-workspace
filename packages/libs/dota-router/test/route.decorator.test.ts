import "reflect-metadata";
import {describe, expect, it} from "vitest";
import {Route} from "@dota/route.decorator";
import {NavigationContext, RouteConfig} from "@dota/Types";

class GuardedComponent extends HTMLElement {}

describe("Route", () => {
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

    const route = Reflect.getOwnMetadata("Route", GuardedComponent) as RouteConfig<HTMLElement>;
    expect(route).toMatchObject({
      path: "/account",
      component: GuardedComponent,
      beforeEnter,
      beforeLeave,
      afterEnter,
      afterLeave
    });
  });
});
