import {describe, expect, it, vi} from "vitest";
import {
  runGlobalGuards,
  runGlobalLifecycleHooks
} from "@dota/coordinator/navigation-lifecycle";
import {NavigationContext, RouteConfig} from "@dota/Types";

class AccountPage extends HTMLElement {}

const route: RouteConfig<HTMLElement> = {
  path: "/account",
  component: AccountPage
};
const context: NavigationContext = {
  nextMatch: {
    route,
    branch: [route],
    matched: true,
    params: {},
    pathname: "/account",
    searchParams: new URLSearchParams(),
    hash: ""
  },
  signal: new AbortController().signal,
  params: {},
  url: new URL("http://dota-router.local/account"),
  historyState: undefined
};

describe("global navigation lifecycle", () => {
  it("stops global guards at the first non-allow result", async () => {
    const laterGuard = vi.fn(() => true as const);

    const result = await runGlobalGuards([
      vi.fn(() => true as const),
      vi.fn(() => "/sign-in"),
      laterGuard
    ], context);

    expect(result).toBe("/sign-in");
    expect(laterGuard).not.toHaveBeenCalled();
  });

  it("awaits global lifecycle hooks in registration order", async () => {
    const events: string[] = [];

    await runGlobalLifecycleHooks([
      async () => {
        await Promise.resolve();
        events.push("first");
      },
      () => {
        events.push("second");
      }
    ], context);

    expect(events).toEqual(["first", "second"]);
  });
});
