import {describe, expect, it} from "vitest";
import {configure} from "@dota/route/route-configurer";
import {resolveRoute} from "@dota/route/route-resolver";
import {RouteConfig} from "@dota/Types";

class ErrorPage extends HTMLElement {}
class HomePage extends HTMLElement {}
class UserPage extends HTMLElement {}
class FilePage extends HTMLElement {}

const errorRoute: RouteConfig<HTMLElement> = {path: "/error", component: ErrorPage};

describe("resolveRoute", () => {
  it("returns the complete match for a literal route", () => {
    const routes = configure([{path: "/users/profile", component: UserPage}], errorRoute);

    const match = resolveRoute("/users/profile?tab=activity#summary", routes, errorRoute);

    expect(match).toMatchObject({
      route: {path: "/profile", component: UserPage},
      matched: true,
      pathname: "/users/profile",
      hash: "#summary"
    });
    expect(match.branch.map(route => route.path)).toEqual(["/users", "/profile"]);
    expect(match.searchParams.get("tab")).toBe("activity");
    expect(match.params).toEqual({});
  });

  it("prefers literal routes and extracts a slug parameter", () => {
    const routes = configure([
      {path: "/users/:id", component: UserPage},
      {path: "/users/profile", component: HomePage}
    ], errorRoute);

    const literal = resolveRoute("/users/profile", routes, errorRoute);
    const slug = resolveRoute("/users/ada%20lovelace", routes, errorRoute);

    expect(literal.route.component).toBe(HomePage);
    expect(slug.route.component).toBe(UserPage);
    expect(slug.params).toEqual({id: "ada lovelace"});
  });

  it("captures the remainder for a catch-all slug", () => {
    const routes = configure([{path: "/files/[...path]", component: FilePage}], errorRoute);

    const match = resolveRoute("/files/docs/getting-started", routes, errorRoute);

    expect(match.route.component).toBe(FilePage);
    expect(match.params).toEqual({path: "docs/getting-started"});
  });

  it("returns an explicit unmatched error match", () => {
    const routes = configure([{path: "/", component: HomePage}], errorRoute);

    const match = resolveRoute("/missing", routes, errorRoute);

    expect(match.route).toBe(errorRoute);
    expect(match.branch).toEqual([]);
    expect(match.matched).toBe(false);
    expect(match.params).toEqual({});
  });
});
