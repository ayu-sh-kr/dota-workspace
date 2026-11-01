import {RestClient} from "@dota/RestClient.ts";
import {HttpError, isAbortError, isHttpError, isRestError, isTimeoutError, RestError} from "@dota/RestError.ts";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const lastUrl = () => vi.mocked(global.fetch).mock.calls.at(-1)![0];

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(async () => new Response(null, {status: 204}));
});

afterEach(() => vi.resetAllMocks());

describe("query parameters (B12)", () => {
  const client = RestClient.create().baseUrl("https://api.x").build();

  it("merges params() with earlier param() calls instead of replacing them", async () => {
    await client.get().uri("/u").param("a", "1").params(new URLSearchParams({b: "2"})).retrieve().toVoid();
    expect(lastUrl()).toBe("https://api.x/u?a=1&b=2");
  });

  it("replaces only the keys given to params()", async () => {
    await client.get().uri("/u").param("page", "1").param("q", "x").params({page: 2}).retrieve().toVoid();
    expect(lastUrl()).toBe("https://api.x/u?q=x&page=2");
  });

  it("accepts numbers, booleans, and arrays and skips null and undefined", async () => {
    await client.get().uri("/u")
      .param("n", 1)
      .param("tag", ["a", "b"])
      .params({active: true, skip: undefined, none: null})
      .retrieve().toVoid();
    expect(lastUrl()).toBe("https://api.x/u?n=1&tag=a&tag=b&active=true");
  });

  it("keeps repeated keys from URLSearchParams", async () => {
    await client.get().uri("/u").params(new URLSearchParams("t=1&t=2")).retrieve().toVoid();
    expect(lastUrl()).toBe("https://api.x/u?t=1&t=2");
  });
});

describe("client builder (B13, B14)", () => {
  it("merges repeated defaultHeaders() calls", async () => {
    const client = RestClient.create().defaultHeaders({a: "1"}).defaultHeaders({b: "2"}).build();
    await client.get().uri("https://api.x").retrieve().toVoid();
    expect(vi.mocked(global.fetch).mock.calls[0][1]!.headers).toEqual({a: "1", b: "2"});
  });

  it("exposes the timeout under both the new and the deprecated config name", () => {
    const client = RestClient.create().timeout(1234).build();
    expect(client).toMatchObject({config: {timeout: 1234, timout: 1234}});
    expect(client.get()).toHaveProperty("_timeout", 1234);
  });
});

describe("HTTP errors", () => {
  const failing = () => new Response('{"title":"Not found"}', {
    status: 404, statusText: "Not Found", headers: {"Content-Type": "application/problem+json"}
  });

  it("resolves failing statuses by default, as before", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(failing());
    const entity = await RestClient.create().build().get().uri("https://api.x/u").retrieve().toEntity();
    expect(entity.status).toBe(404);
    expect(entity.data).toEqual({title: "Not found"});
  });

  it("rejects with HttpError carrying the parsed body when enabled", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(failing());
    const client = RestClient.create().baseUrl("https://api.x").throwHttpErrors().build();

    const error = await client.get().uri("/u").retrieve().toEntity().catch(e => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toBeInstanceOf(RestError);
    expect(error).toMatchObject({
      name: "HttpError", status: 404, statusText: "Not Found", method: "GET",
      url: "https://api.x/u", data: {title: "Not found"}
    });
    expect(isHttpError(error) && isRestError(error)).toBe(true);
  });

  it("applies to toVoid and toResponse too", async () => {
    const client = RestClient.create().throwHttpErrors().build();
    vi.mocked(global.fetch).mockResolvedValueOnce(failing());
    await expect(client.delete().uri("https://api.x").retrieve().toVoid()).rejects.toBeInstanceOf(HttpError);
    vi.mocked(global.fetch).mockResolvedValueOnce(failing());
    await expect(client.get().uri("https://api.x").retrieve().toResponse()).rejects.toBeInstanceOf(HttpError);
  });

  it("uses a custom status check", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(failing());
    const client = RestClient.create().throwHttpErrors(status => status < 500).build();
    await expect(client.get().uri("https://api.x").retrieve().toEntity()).resolves.toMatchObject({status: 404});
  });

  it("can be switched off again with false", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(failing());
    const client = RestClient.create().throwHttpErrors().throwHttpErrors(false).build();
    await expect(client.get().uri("https://api.x").retrieve().toVoid()).resolves.toMatchObject({status: 404});
  });

  it("runs the handler before rejecting", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(failing());
    const handler = vi.fn();
    const client = RestClient.create().handler(handler).throwHttpErrors().build();
    await expect(client.get().uri("https://api.x").retrieve().toVoid()).rejects.toBeInstanceOf(HttpError);
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("error guards", () => {
  it("tell timeouts and cancellations apart", () => {
    const timeout = new DOMException("t", "TimeoutError");
    const abort = new DOMException("a", "AbortError");
    expect([isTimeoutError(timeout), isAbortError(timeout)]).toEqual([true, false]);
    expect([isTimeoutError(abort), isAbortError(abort)]).toEqual([false, true]);
    expect(isRestError(new Error("x"))).toBe(false);
  });
});
