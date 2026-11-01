import {RestClient} from "@dota/RestClient.ts";
import {RestUtils} from "@dota/RestUtils.ts";
import {RestResponseResolver} from "@dota/ResponseResolver.ts";
import {afterEach, describe, expect, it, vi} from "vitest";

const resolverFor = (response: Response, handler?: (response: Response) => void | Promise<void>) =>
  new RestResponseResolver<unknown>(Promise.resolve(response), handler);

/** A fetch mock that only settles when its signal aborts, rejecting with the abort reason. */
const hangingFetch = () => vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
  }));

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("JSON media types (B6)", () => {
  it.each([
    "application/json",
    "application/problem+json",
    "application/vnd.api+json; charset=utf-8",
    "APPLICATION/JSON",
  ])("parses %s", async (contentType) => {
    const response = new Response('{"a":1}', {headers: {"Content-Type": contentType}});
    expect((await resolverFor(response).toEntity()).data).toEqual({a: 1});
  });

  it.each(["text/plain", "application/jsonp", "text/json-seq"])("keeps %s as text", async (contentType) => {
    const response = new Response('{"a":1}', {headers: {"Content-Type": contentType}});
    expect((await resolverFor(response).toEntity()).data).toBe('{"a":1}');
  });
});

describe("converter on non-JSON bodies (B7)", () => {
  it("passes text bodies to the converter", async () => {
    const response = new Response("a,b", {headers: {"Content-Type": "text/csv"}});
    const resolver = resolverFor(response).converter((text: string) => text.split(","));
    expect((await resolver.toEntity()).data).toEqual(["a", "b"]);
  });
});

describe("timeouts (B8, B9)", () => {
  it("does not abort a controller shared with other requests", async () => {
    vi.useFakeTimers();
    global.fetch = hangingFetch();
    const shared = new AbortController();
    const client = RestClient.create().timeout(50).build();

    const timedOut = client.get().uri("https://x.test/slow").abortController(shared).retrieve().toVoid();
    const assertion = expect(timedOut).rejects.toMatchObject({name: "TimeoutError"});
    await vi.advanceTimersByTimeAsync(50);
    await assertion;

    expect(shared.signal.aborted).toBe(false);
  });

  it("keeps the timeout active while the body downloads", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init!.signal!.addEventListener("abort", () => controller.error(init!.signal!.reason));
        }
      });
      return new Response(body, {headers: {"Content-Type": "application/json"}});
    });

    const entity = RestClient.create().timeout(50).build().get().uri("https://x.test/a").retrieve().toEntity();
    const assertion = expect(entity).rejects.toMatchObject({name: "TimeoutError"});
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });

  it("rejects caller cancellation with AbortError", async () => {
    global.fetch = hangingFetch();
    const controller = new AbortController();
    const request = RestUtils.performFetch({uri: "https://x.test", method: "GET", timeout: 1000, abortController: controller});
    controller.abort();
    await expect(request).rejects.toMatchObject({name: "AbortError"});
  });
});

describe("request lifecycle (B10)", () => {
  it("does not raise an unhandled rejection when the result is never read", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    global.fetch = vi.fn().mockRejectedValue(new TypeError("network down"));

    RestClient.create().build().get().uri("https://x.test").retrieve();
    await new Promise(resolve => setTimeout(resolve, 10));

    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("still rejects the terminal call with the network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("network down"));
    const request = RestClient.create().build().get().uri("https://x.test").retrieve();
    await expect(request.toEntity()).rejects.toThrow("network down");
  });

  it("returns the same entity when toEntity is called twice", async () => {
    const resolver = resolverFor(new Response('{"a":1}', {headers: {"Content-Type": "application/json"}}));
    const first = await resolver.toEntity();
    expect(await resolver.toEntity()).toBe(first);
  });
});

describe("async handlers (B11)", () => {
  it("awaits the handler before resolving", async () => {
    const order: string[] = [];
    const handler = async () => {
      await Promise.resolve();
      order.push("handler");
    };
    await resolverFor(new Response(null, {status: 204}), handler).toVoid();
    order.push("resolved");
    expect(order).toEqual(["handler", "resolved"]);
  });

  it("rejects the terminal call when the handler rejects", async () => {
    const handler = async () => {
      throw new Error("unauthorised");
    };
    await expect(resolverFor(new Response("x"), handler).toEntity()).rejects.toThrow("unauthorised");
  });
});
