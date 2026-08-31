import {RequestInterceptorProcessor} from "@dota/RequestInterceptor.ts";
import type {HttpRequestBody} from "@dota/RestUtils.ts";
import {describe, expect, it, vi} from "vitest";

const createRequest = (): HttpRequestBody => ({
  uri: "https://api.example.com/users",
  method: "GET",
  headers: {},
  abortController: new AbortController()
});

describe("RequestInterceptorProcessor", () => {
  it("should return the same request when no interceptors are registered", async () => {
    const request = createRequest();
    const processor = new RequestInterceptorProcessor();

    const result = await processor.process(request);

    expect(result).toBe(request);
  });

  it("should process mutation and replacement interceptors in order", async () => {
    const executionOrder: string[] = [];
    const processor = new RequestInterceptorProcessor([
      (request) => {
        executionOrder.push("authorization");
        request.headers = {Authorization: "Bearer token"};
      },
      async (request) => {
        executionOrder.push("trace");
        return {
          ...request,
          headers: {...request.headers, "X-Trace-Id": "trace-id"}
        };
      }
    ]);

    const result = await processor.process(createRequest());

    expect(result.headers).toEqual({
      Authorization: "Bearer token",
      "X-Trace-Id": "trace-id"
    });
    expect(executionOrder).toEqual(["authorization", "trace"]);
  });

  it("should stop processing after an interceptor rejects", async () => {
    const interceptorError = new Error("Could not obtain access token");
    const skippedInterceptor = vi.fn();
    const processor = new RequestInterceptorProcessor([
      async () => {
        throw interceptorError;
      },
      skippedInterceptor
    ]);

    const result = processor.process(createRequest());

    await expect(result).rejects.toBe(interceptorError);
    expect(skippedInterceptor).not.toHaveBeenCalled();
  });
});
