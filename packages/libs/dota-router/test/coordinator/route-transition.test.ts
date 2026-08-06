import {describe, expect, it} from "vitest";
import {
  createNavigationContext,
  getBranchDelta,
  toNavigationResult,
  toNavigationUrl
} from "@dota/coordinator/route-transition";
import {NavigationContext, RouteConfig, RouteMatch} from "@dota/Types";

class Page extends HTMLElement {}

const route = (path: string): RouteConfig<HTMLElement> => ({path, component: Page});

const match = (pathname: string, branch: RouteConfig<HTMLElement>[], params: Record<string, string> = {}, search = ""): RouteMatch<HTMLElement> => ({
  route: branch[branch.length - 1] ?? route("/error"),
  branch,
  matched: true,
  params,
  pathname,
  searchParams: new URLSearchParams(search),
  hash: ""
});

describe("route transition helpers", () => {
  it("normalizes relative and absolute destinations into fresh URLs", () => {
    const absolute = new URL("/account", window.location.origin);
    const relative = toNavigationUrl("/home");
    const clone = toNavigationUrl(absolute);

    expect(relative.pathname).toBe("/home");
    expect(clone).not.toBe(absolute);
    expect(clone.href).toBe(absolute.href);
  });

  it("maps guard cancellation and redirects to navigation results", () => {
    const destination = new URL("/account", window.location.origin);
    const nextMatch = match("/account", [route("/account")]);
    const context: NavigationContext<HTMLElement> = {
      currentMatch: undefined,
      nextMatch,
      signal: new AbortController().signal,
      params: {},
      url: destination,
      historyState: undefined
    };

    expect(toNavigationResult(false, nextMatch, context)).toMatchObject({
      status: "cancelled",
      match: nextMatch
    });
    expect(toNavigationResult("/sign-in", nextMatch, context)).toMatchObject({
      status: "redirected",
      redirectTo: new URL("/sign-in", destination)
    });
  });

  it("creates an isolated context with destination data", () => {
    const destination = new URL("/account?id=1", window.location.origin);
    const nextMatch = match("/account", [route("/account")]);
    const context = createNavigationContext(
      destination,
      undefined,
      nextMatch,
      new AbortController().signal,
      {source: "test"}
    );

    expect(context.url).not.toBe(destination);
    expect(context.url.href).toBe(destination.href);
    expect(context.nextMatch).toBe(nextMatch);
    expect(context.historyState).toEqual({source: "test"});
    expect(context.initial).toBe(true);
    expect(createNavigationContext(
      destination,
      nextMatch,
      nextMatch,
      new AbortController().signal,
      undefined
    ).initial).toBe(false);
  });

  it("orders leaving routes deepest-first and entering routes parent-first", () => {
    const parent = route("/account");
    const currentLeaf = route("/profile");
    const nextLeaf = route("/settings");
    const delta = getBranchDelta(
      match("/account/profile", [parent, currentLeaf]),
      match("/account/settings", [parent, nextLeaf])
    );

    expect(delta.leaving).toEqual([currentLeaf]);
    expect(delta.entering).toEqual([nextLeaf]);
  });

  it("re-runs the leaf hooks when a parameterized route receives a new destination", () => {
    const project = route("/projects/:slug");
    const delta = getBranchDelta(
      match("/projects/alpha", [project], {slug: "alpha"}),
      match("/projects/beta", [project], {slug: "beta"})
    );

    expect(delta.leaving).toEqual([project]);
    expect(delta.entering).toEqual([project]);
  });

  it("re-runs the leaf hooks when only the query changes, but ignores hash changes", () => {
    const projects = route("/projects");
    const queryDelta = getBranchDelta(
      match("/projects", [projects], {}, "page=1"),
      match("/projects", [projects], {}, "page=2")
    );
    const hashDelta = getBranchDelta(
      {...match("/projects", [projects]), hash: "#one"},
      {...match("/projects", [projects]), hash: "#two"}
    );

    expect(queryDelta.leaving).toEqual([projects]);
    expect(queryDelta.entering).toEqual([projects]);
    expect(hashDelta.leaving).toEqual([]);
    expect(hashDelta.entering).toEqual([]);
  });
});
