import {RestResponseResolver} from "@dota/ResponseResolver.ts";
import {describe, expect, it, vi} from "vitest";

describe('ResponseResolver', () => {

  const createResolver = () => {
    const response = Promise.resolve(new Response());
    const handler = vi.fn();
    return new RestResponseResolver(response, handler);
  }

  it('should create a RestResponseResolver instance', () => {
    const resolver = createResolver();
    expect(resolver).toBeInstanceOf(RestResponseResolver);
  });

  it('should set a custom response converter', () => {
    const resolver = createResolver();
    const converter = vi.fn();
    resolver.converter(converter);
    expect(resolver['_converter']).toBe(converter);
  });

  it('should set a custom response handler', () => {
    const resolver = createResolver();
    const handler = vi.fn();
    resolver.handler(handler);
    expect(resolver['_handler']).toBe(handler);
  });

  it('should resolve the response to given entity upon calling toEntity', async () => {
    const response = Promise.resolve(new Response(JSON.stringify({data: 'test'}), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
    }));

    const resolver = new RestResponseResolver(response, (response) => {
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    const entity = await resolver.toEntity();
    expect(entity).toBeDefined();
    expect(entity.data).toEqual({data: 'test'});
  });

  it('should resolve the response to given response upon calling toResponse', async () => {
    const response = Promise.resolve(new Response(JSON.stringify({data: 'test'}), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
    }));

    const resolver = new RestResponseResolver(response, (response) => {
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    const res = await resolver.toResponse();
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
  });

  it('should resolve the response to void upon calling toVoid', async () => {
    const response = Promise.resolve(new Response(null, {
      status: 204,
      headers: {
        'Content-Type': 'application/json'
      },
    }));

    const resolver = new RestResponseResolver(response, (response) => {
      expect(response.status).toBe(204);
      expect(response.ok).toBe(true);
    });

    const res = await resolver.toVoid();
    expect(res).toBeDefined();
    expect(res.status).toBe(204);
  });

});
