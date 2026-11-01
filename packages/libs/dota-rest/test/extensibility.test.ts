import {RestClient} from "@dota/index.ts";
import {afterEach, describe, expect, it, vi} from "vitest";

const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), {
  status: 200,
  ...init,
  headers: {'Content-Type': 'application/json', ...init.headers}
});

const lastInit = (fetchFn: ReturnType<typeof vi.fn>): RequestInit => fetchFn.mock.calls.at(-1)![1];

describe('custom fetch', () => {
  it('sends requests through the injected fetch instead of the global one', async () => {
    const globalFetch = vi.spyOn(globalThis, 'fetch');
    const fetchFn = vi.fn().mockResolvedValue(json({ok: true}));
    const client = RestClient.builder().baseUrl('https://api.test').fetch(fetchFn).build();

    const entity = await client.get<{ ok: boolean }>().uri('/a').retrieve().toEntity();

    expect(entity.data).toEqual({ok: true});
    expect(fetchFn).toHaveBeenCalledWith('https://api.test/a', expect.objectContaining({method: 'GET'}));
    expect(globalFetch).not.toHaveBeenCalled();
    globalFetch.mockRestore();
  });
});

describe('fetch options', () => {
  it('passes client options through and lets a request override them', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    const client = RestClient.builder()
      .fetch(fetchFn)
      .fetchOptions({credentials: 'include', cache: 'no-store'})
      .build();

    await client.get().uri('https://api.test').fetchOptions({cache: 'reload'}).retrieve().toVoid();

    expect(lastInit(fetchFn)).toMatchObject({credentials: 'include', cache: 'reload', method: 'GET'});
  });
});

describe('headers', () => {
  it('removes a client default header for one request only', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    const client = RestClient.builder()
      .fetch(fetchFn)
      .defaultHeaders({Authorization: 'Bearer t', 'X-App': 'dota'})
      .build();

    await client.get().uri('https://api.test').removeHeader('authorization').retrieve().toVoid();
    expect(lastInit(fetchFn).headers).toEqual({'x-app': 'dota'});

    await client.get().uri('https://api.test').retrieve().toVoid();
    expect(lastInit(fetchFn).headers).toEqual({authorization: 'Bearer t', 'x-app': 'dota'});
  });

  it('sends a removed header again when it is set afterwards', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    const client = RestClient.builder().fetch(fetchFn).defaultHeaders({Authorization: 'a'}).build();

    await client.get().uri('https://api.test')
      .removeHeader('Authorization')
      .header('Authorization', 'b')
      .retrieve()
      .toVoid();

    expect(lastInit(fetchFn).headers).toEqual({authorization: 'b'});
  });
});

describe('methods', () => {
  it('supports HEAD, OPTIONS, and a generic request method', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, {status: 204})));
    const client = RestClient.builder().fetch(fetchFn).build();

    await client.head().uri('https://api.test').retrieve().toVoid();
    await client.options().uri('https://api.test').retrieve().toVoid();
    await client.request('PATCH').uri('https://api.test').retrieve().toVoid();

    expect(fetchFn.mock.calls.map(([, init]) => init.method)).toEqual(['HEAD', 'OPTIONS', 'PATCH']);
  });
});

describe('extend', () => {
  it('derives a client with merged headers and appended interceptors without changing the parent', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, {status: 204})));
    const order: string[] = [];
    const parent = RestClient.builder()
      .baseUrl('https://api.test')
      .fetch(fetchFn)
      .defaultHeaders({'X-App': 'dota'})
      .requestInterceptor(() => void order.push('parent'))
      .build();

    const child = parent.extend()
      .defaultHeaders({Authorization: 'Bearer t'})
      .requestInterceptor(() => void order.push('child'))
      .build();

    await child.get().uri('/me').retrieve().toVoid();
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.test/me');
    expect(lastInit(fetchFn).headers).toEqual({'x-app': 'dota', authorization: 'Bearer t'});
    expect(order).toEqual(['parent', 'child']);

    order.length = 0;
    await parent.get().uri('/me').retrieve().toVoid();
    expect(lastInit(fetchFn).headers).toEqual({'x-app': 'dota'});
    expect(order).toEqual(['parent']);
  });
});

describe('retry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const noDelay = {delay: () => 0};

  it('does not retry by default', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, {status: 503}));
    const client = RestClient.builder().fetch(fetchFn).build();

    const response = await client.get().uri('https://api.test').retrieve().toResponse();

    expect(response.status).toBe(503);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries retryable statuses up to the limit and calls beforeRetry', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(null, {status: 503}))
      .mockResolvedValueOnce(new Response(null, {status: 429}))
      .mockResolvedValueOnce(json({ok: true}));
    const beforeRetry = vi.fn();
    const client = RestClient.builder().fetch(fetchFn).retry({limit: 2, ...noDelay, beforeRetry}).build();

    const entity = await client.get().uri('https://api.test').retrieve().toEntity();

    expect(entity.data).toEqual({ok: true});
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(beforeRetry.mock.calls.map(([context]) => [context.attempt, context.response?.status]))
      .toEqual([[1, 503], [2, 429]]);
  });

  it('returns the last response once retries run out', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, {status: 500})));
    const client = RestClient.builder().fetch(fetchFn).retry({limit: 2, ...noDelay}).build();

    const response = await client.get().uri('https://api.test').retrieve().toResponse();

    expect(response.status).toBe(500);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('retries network errors but not non-retryable statuses or methods', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(null, {status: 404}));
    const client = RestClient.builder().fetch(fetchFn).retry({limit: 3, ...noDelay}).build();

    const response = await client.get().uri('https://api.test').retrieve().toResponse();
    expect(response.status).toBe(404);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    fetchFn.mockReset().mockResolvedValue(new Response(null, {status: 503}));
    await client.post().uri('https://api.test').body({a: 1}).retrieve().toResponse();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('lets a request override or disable the client policy', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, {status: 503})));
    const client = RestClient.builder().fetch(fetchFn).retry({limit: 2, ...noDelay}).build();

    await client.get().uri('https://api.test').retry(false).retrieve().toResponse();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    fetchFn.mockClear();
    await client.post().uri('https://api.test').retry({limit: 1, methods: ['POST'], ...noDelay}).retrieve().toResponse();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('waits for Retry-After before retrying', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(null, {status: 429, headers: {'Retry-After': '2'}}))
      .mockResolvedValueOnce(new Response(null, {status: 204}));
    const client = RestClient.builder().fetch(fetchFn).retry(1).build();

    const pending = client.get().uri('https://api.test').retrieve().toResponse();
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    expect((await pending).status).toBe(204);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns the response without waiting when Retry-After exceeds maxDelay', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, {status: 503, headers: {'Retry-After': '120'}}));
    const client = RestClient.builder().fetch(fetchFn).retry({limit: 1, maxDelay: 1000}).build();

    const response = await client.get().uri('https://api.test').retrieve().toResponse();

    expect(response.status).toBe(503);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('caps a computed delay at maxDelay instead of skipping the retry', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(null, {status: 503}))
      .mockResolvedValueOnce(new Response(null, {status: 204}));
    const client = RestClient.builder().fetch(fetchFn).retry({limit: 1, delay: () => 60000, maxDelay: 100}).build();

    const pending = client.get().uri('https://api.test').retrieve().toResponse();
    await vi.advanceTimersByTimeAsync(100);

    expect((await pending).status).toBe(204);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('stops waiting and rejects when the caller aborts during the delay', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, {status: 503}));
    const controller = new AbortController();
    const client = RestClient.builder()
      .fetch(fetchFn)
      .retry({limit: 1, delay: () => 10000, beforeRetry: () => controller.abort()})
      .build();

    const request = client.get().uri('https://api.test').abortController(controller).retrieve().toResponse();

    await expect(request).rejects.toMatchObject({name: 'AbortError'});
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
