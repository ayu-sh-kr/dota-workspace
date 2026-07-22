import {describe, expect, it, vi} from "vitest";
import {configure} from "@dota/route/route-configurer";
import {matchRoute} from "@dota/route/route-matcher";
import {ComponentClass, RouteConfig} from "@dota/Types";

class ErrorPage extends HTMLElement {}
class HomePage extends HTMLElement {}
class LandingPage extends HTMLElement {}
class CatalogItemPage extends HTMLElement {}
class GuidePage extends HTMLElement {}
class SlugPage extends HTMLElement {}
class BlogPostPage extends HTMLElement {}
class NewBlogPage extends HTMLElement {}
class FilePage extends HTMLElement {}
class TargetPage extends HTMLElement {}
class CustomRenderPage extends HTMLElement {}

const errorRoute: RouteConfig<HTMLElement> = {
  path: "/error",
  component: ErrorPage
};

type RouteScenario = {
  name: string;
  flatRoutes: RouteConfig<HTMLElement>[];
  path: string;
  expectedComponent: ComponentClass<HTMLElement>;
  expectedRender?: (path: string) => void;
}

const renderCustomPage = vi.fn<(path: string) => void>();

const routeScenarios: RouteScenario[] = [
  {
    name: "root page",
    flatRoutes: [{path: "/", component: HomePage}],
    path: "/",
    expectedComponent: HomePage
  },
  {
    name: "root leaf page",
    flatRoutes: [{path: "/landing", component: LandingPage}],
    path: "/landing",
    expectedComponent: LandingPage
  },
  {
    name: "end leaf below a generated parent",
    flatRoutes: [{path: "/catalog/item", component: CatalogItemPage}],
    path: "/catalog/item",
    expectedComponent: CatalogItemPage
  },
  {
    name: "nested literal page",
    flatRoutes: [{path: "/guides/getting-started", component: GuidePage}],
    path: "/guides/getting-started",
    expectedComponent: GuidePage
  },
  {
    name: "root slug page",
    flatRoutes: [{path: "/:page", component: SlugPage}],
    path: "/welcome",
    expectedComponent: SlugPage
  },
  {
    name: "nested slug page",
    flatRoutes: [{path: "/blogs/:slug", component: BlogPostPage}],
    path: "/blogs/route-trees",
    expectedComponent: BlogPostPage
  },
  {
    name: "literal page before sibling slug page",
    flatRoutes: [
      {path: "/blogs/:slug", component: BlogPostPage},
      {path: "/blogs/new", component: NewBlogPage}
    ],
    path: "/blogs/new",
    expectedComponent: NewBlogPage
  },
  {
    name: "bracket slug page",
    flatRoutes: [{path: "/docs/[page]", component: SlugPage}],
    path: "/docs/installation",
    expectedComponent: SlugPage
  },
  {
    name: "catch-all bracket segment",
    flatRoutes: [{path: "/files/[...path]", component: FilePage}],
    path: "/files/readme",
    expectedComponent: FilePage
  },
  {
    name: "has slash apostrophe does-not-have slash has exact graph",
    flatRoutes: [{path: "/has/don't-has/has", component: TargetPage}],
    path: "/has/don't-has/has",
    expectedComponent: TargetPage
  },
  {
    name: "missing middle segment in a configured graph",
    flatRoutes: [{path: "/has/don't-has/has", component: TargetPage}],
    path: "/has/does-not-have/has",
    expectedComponent: ErrorPage
  },
  {
    name: "route with a render callback",
    flatRoutes: [{path: "/custom", component: CustomRenderPage, render: renderCustomPage}],
    path: "/custom/",
    expectedComponent: CustomRenderPage,
    expectedRender: renderCustomPage
  }
];

describe("matchRoute", () => {
  it.each(routeScenarios)("matches the $name configuration", scenario => {
    const configuredRoutes = configure(scenario.flatRoutes, errorRoute);
    const route = matchRoute(scenario.path, configuredRoutes, errorRoute);

    expect(route.component).toBe(scenario.expectedComponent);
    expect(route.render).toBe(scenario.expectedRender);
  });
});
