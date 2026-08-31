import {RestUtils} from "@dota/RestUtils.ts";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

describe("RestUtils", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("should pass the request abort controller signal to fetch", async () => {
    const abortController = new AbortController();
    const response = new Response(null, {status: 204});
    vi.mocked(global.fetch).mockResolvedValueOnce(response);

    const result = await RestUtils.performFetch({
      uri: "https://api.example.com/users",
      method: "GET",
      abortController
    });

    expect(result).toBe(response);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/users",
      expect.objectContaining({
        method: "GET",
        signal: abortController.signal
      })
    );
  });

  it("should abort the request controller when the timeout expires", async () => {
    vi.useFakeTimers();
    const abortController = new AbortController();
    global.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The request was aborted", "AbortError"));
        });
      });
    });

    const response = RestUtils.performFetch({
      uri: "https://api.example.com/users",
      method: "GET",
      timeout: 100,
      abortController
    });
    const rejection = expect(response).rejects.toMatchObject({name: "AbortError"});

    await vi.advanceTimersByTimeAsync(100);

    await rejection;
    expect(abortController.signal.aborted).toBe(true);
  });
});
