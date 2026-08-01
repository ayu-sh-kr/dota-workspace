import {RestRequestRetriever} from "@dota/RequestRetriever.ts";
import {RestRequestBuilder} from "@dota/RequestBuilder.ts";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

describe("RequestRetriever", () => {

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({success: true}),
      text: async () => JSON.stringify({success: true}),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should create a request retriever", () => {
    const handler = vi.fn(); // Mock response handler
    const retriever = new RestRequestRetriever(handler);

    expect(retriever).toBeInstanceOf(RestRequestRetriever);
  });

  it("should retrieve a request", () => {
    const handler = vi.fn(); // Mock response handler
    const retriever = new RestRequestRetriever(handler);
    const builder = new RestRequestBuilder({
      baseUri: "https://api.example.com",
      method: "GET",
      headers: {"Content-Type": "application/json"},
      timeout: 5000,
      handler: handler
    })

    builder.uri("/endpoint")

    const responseResolver = retriever.retrieve(builder);

    expect(responseResolver).toBeDefined();
  });
});
