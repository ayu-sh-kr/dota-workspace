import {describe, expect, it} from "vitest";
import {configure} from "@dota/route/route-configurer";
import {RouteConfig} from "@dota/Types";

class ErrorComponent extends HTMLElement {}
class BlogComponent extends HTMLElement {}
class ContentComponent extends HTMLElement {}
class CommentsComponent extends HTMLElement {}

const errorRoute: RouteConfig<HTMLElement> = {path: "/error", component: ErrorComponent};

describe("configure", () => {
  it("builds segment nodes and uses the error component for missing parents", () => {
    const routes = configure([
      {path: "/blogs/content", component: ContentComponent}
    ], errorRoute);

    expect(routes).toEqual([
      {
        path: "/blogs",
        component: ErrorComponent,
        children: [{path: "/content", component: ContentComponent}]
      }
    ]);
  });

  it("keeps a configured parent component and marks slug segments", () => {
    const routes = configure([
      {path: "/blogs", component: BlogComponent},
      {path: "/blogs/:slug", component: ContentComponent}
    ], errorRoute);

    expect(routes[0]).toMatchObject({path: "/blogs", component: BlogComponent});
    expect(routes[0].children).toEqual([
      {path: "/:slug", component: ContentComponent, slug: true}
    ]);
  });

  it("marks slug segment at the start of a path", () => {
    const routes = configure([
      {path: "/:slug/details", component: ContentComponent}
    ], errorRoute);

    expect(routes).toEqual([
      {
        path: "/:slug",
        component: ErrorComponent,
        slug: true,
        children: [{path: "/details", component: ContentComponent}]
      }
    ]);
  });

  it("marks slug segment in the middle of a path", () => {
    const routes = configure([
      {path: "/blogs/:slug/comments", component: CommentsComponent}
    ], errorRoute);

    expect(routes).toEqual([
      {
        path: "/blogs",
        component: ErrorComponent,
        children: [
          {
            path: "/:slug",
            component: ErrorComponent,
            slug: true,
            children: [{path: "/comments", component: CommentsComponent}]
          }
        ]
      }
    ]);
  });

  it("builds a deep chain filling all intermediate segments with the error component", () => {
    const routes = configure([
      {path: "/a/b/c/d/page", component: ContentComponent}
    ], errorRoute);

    expect(routes).toEqual([
      {
        path: "/a",
        component: ErrorComponent,
        children: [
          {
            path: "/b",
            component: ErrorComponent,
            children: [
              {
                path: "/c",
                component: ErrorComponent,
                children: [
                  {
                    path: "/d",
                    component: ErrorComponent,
                    children: [{path: "/page", component: ContentComponent}]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);
  });

  it("supports bracket-style [param] slug syntax", () => {
    const routes = configure([
      {path: "/blogs/[id]", component: ContentComponent}
    ], errorRoute);

    expect(routes[0].children).toEqual([
      {path: "/[id]", component: ContentComponent, slug: true}
    ]);
  });

  it("supports catch-all [...param] slug syntax", () => {
    const routes = configure([
      {path: "/files/[...rest]", component: ContentComponent}
    ], errorRoute);

    expect(routes[0].children).toEqual([
      {path: "/[...rest]", component: ContentComponent, slug: true}
    ]);
  });

  it("retains children when a parent route is declared after its descendants", () => {
    const routes = configure([
      {path: "/blogs/content", component: ContentComponent},
      {path: "/blogs", component: BlogComponent}
    ], errorRoute);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({path: "/blogs", component: BlogComponent});
    expect(routes[0].children).toEqual([
      {path: "/content", component: ContentComponent}
    ]);
  });

  it("merges multiple siblings under a shared parent", () => {
    const routes = configure([
      {path: "/blogs", component: BlogComponent},
      {path: "/blogs/content", component: ContentComponent},
      {path: "/blogs/:slug", component: ContentComponent}
    ], errorRoute);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({path: "/blogs", component: BlogComponent});
    expect(routes[0].children).toHaveLength(2);
    expect(routes[0].children).toContainEqual({path: "/content", component: ContentComponent});
    expect(routes[0].children).toContainEqual({path: "/:slug", component: ContentComponent, slug: true});
  });

  it("handles a bare root route", () => {
    const routes = configure([
      {path: "/", component: BlogComponent}
    ], errorRoute);

    expect(routes).toEqual([{path: "/", component: BlogComponent}]);
  });

  it("handles multiple top-level routes with no shared parent", () => {
    const routes = configure([
      {path: "/about", component: BlogComponent},
      {path: "/contact", component: ContentComponent}
    ], errorRoute);

    expect(routes).toHaveLength(2);
    expect(routes).toContainEqual({path: "/about", component: BlogComponent});
    expect(routes).toContainEqual({path: "/contact", component: ContentComponent});
  });

  it("retains declared guard and lifecycle hooks without invoking them", () => {
    const beforeEnter = () => true as const;
    const beforeLeave = () => "/sign-in";
    const afterEnter = () => undefined;
    const afterLeave = () => undefined;

    const routes = configure([{
      path: "/account/profile",
      component: ContentComponent,
      beforeEnter,
      beforeLeave,
      afterEnter,
      afterLeave
    }], errorRoute);

    expect(routes[0].children?.[0]).toMatchObject({
      path: "/profile",
      beforeEnter,
      beforeLeave,
      afterEnter,
      afterLeave
    });
  });
});
