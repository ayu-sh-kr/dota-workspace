import {RestClient} from "@dota/RestClient.ts";
import {RestUtils} from "@dota/RestUtils.ts";
import {RestResponseResolver} from "@dota/ResponseResolver.ts";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const lastInit = () => vi.mocked(global.fetch).mock.calls.at(-1)![1] as RequestInit;
const lastUrl = () => vi.mocked(global.fetch).mock.calls.at(-1)![0];

describe("request bodies", () => {
  const client = RestClient.create().baseUrl("https://api.example.com").build();

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
  });

  afterEach(() => vi.resetAllMocks());

  it.each([0, false, "", null])("sends the falsy body %j", async (value) => {
    await client.post().uri("/items").body(value).retrieve().toVoid();
    expect(lastInit().body).toBe(typeof value === "string" ? value : JSON.stringify(value));
  });

  it("serializes plain objects as JSON with a JSON content type", async () => {
    await client.post().uri("/items").body({a: 1}).retrieve().toVoid();
    expect(lastInit().body).toBe('{"a":1}');
    expect(lastInit().headers).toEqual({"content-type": "application/json"});
  });

  it("sends FormData unchanged without a JSON content type", async () => {
    const form = new FormData();
    form.append("file", new Blob(["x"]), "x.txt");
    await client.post().uri("/upload").body(form).retrieve().toVoid();
    expect(lastInit().body).toBe(form);
    expect(lastInit().headers).toEqual({});
  });

  it("sends strings, URLSearchParams, and Blobs unchanged", async () => {
    for (const body of ["raw text", new URLSearchParams("a=1"), new Blob(["b"])]) {
      await client.put().uri("/raw").body(body).retrieve().toVoid();
      expect(lastInit().body).toBe(body);
    }
  });

  it("lets a caller Content-Type replace the default regardless of case", async () => {
    const jsonClient = RestClient.create().defaultHeaders({"Content-type": "application/json"}).build();
    await jsonClient.post().uri("https://x.test/a").header("Content-Type", "text/csv").body("a,b").retrieve().toVoid();
    expect(lastInit().headers).toEqual({"content-type": "text/csv"});
  });

  it("does not send a body when none was set", async () => {
    await client.get().uri("/items").retrieve().toVoid();
    expect(lastInit().body).toBeUndefined();
    expect(lastUrl()).toBe("https://api.example.com/items");
  });
});

describe("RestUtils.createURI", () => {
  it.each([
    ["https://api.x", "users", "https://api.x/users"],
    ["https://api.x/", "/users", "https://api.x/users"],
    ["https://api.x//", "//users", "https://api.x/users"],
    ["https://api.x", "https://other.y/z", "https://other.y/z"],
    ["/api", "users", "/api/users"],
    ["https://api.x", "", "https://api.x"],
    ["", "/users", "/users"],
  ])("joins %s and %s", (baseURI, uri, expected) => {
    expect(RestUtils.createURI({baseURI, uri})).toBe(expected);
  });

  it("merges params into an existing query string and keeps the fragment last", () => {
    const params = new URLSearchParams({b: "2"});
    expect(RestUtils.createURI({baseURI: "https://api.x", uri: "/u?a=1#top", params}))
      .toBe("https://api.x/u?a=1&b=2#top");
    expect(RestUtils.createURI({uri: "/u", params})).toBe("/u?b=2");
  });

  it("uses the base URI alone when no URI was set", () => {
    expect(RestUtils.createURI({baseURI: "https://api.x"})).toBe("https://api.x");
  });
});

describe("empty responses", () => {
  it.each([204, 200])("resolves an empty %i JSON response without throwing", async (status) => {
    const response = new Response(null, {status, headers: {"Content-Type": "application/json"}});
    const entity = await new RestResponseResolver(Promise.resolve(response), undefined).toEntity();
    expect(entity.status).toBe(status);
    expect(entity.data).toBeUndefined();
  });
});
