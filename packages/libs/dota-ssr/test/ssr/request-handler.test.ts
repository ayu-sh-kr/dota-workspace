// @vitest-environment node
import {createServer, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {
  BODY_OUTLET,
  HEAD_OUTLET,
  createRequestHandler,
  matchRoute,
  toNodeListener,
  type RenderAdapter,
  type RenderContext
} from '@dota/ssr/index';

const TEMPLATE = `<!doctype html><html><head>${HEAD_OUTLET}</head><body>${BODY_OUTLET}</body></html>`;

/** Adapter that records the context it receives and echoes the selector. */
function createEchoAdapter(): RenderAdapter & {contexts: RenderContext[]} {
  const contexts: RenderContext[] = [];
  return {
    name: 'echo',
    contexts,
    async render(selector, context) {
      contexts.push(context);
      return {html: `<${selector}>${context.params.id ?? ''}</${selector}>`, head: {title: 'Echo & co', description: ''}};
    }
  };
}

describe('matchRoute', () => {
  const routes = [{path: '/', page: 'home-page'}, {path: '/users/:id', page: 'user-page'}];

  it('matches static and parameterised paths, ignoring trailing slashes', () => {
    expect(matchRoute(routes, '/')?.route.page).toBe('home-page');
    expect(matchRoute(routes, '/users/a%20b/')).toEqual({route: routes[1], params: {id: 'a b'}});
    expect(matchRoute(routes, '/users')).toBeUndefined();
  });
});

describe('createRequestHandler', () => {
  it('writes the adapter output and head into the document shell', async () => {
    const adapter = createEchoAdapter();
    const handler = createRequestHandler({adapter, routes: [{path: '/users/:id', page: 'user-page'}], template: TEMPLATE});

    const response = await handler(new Request('http://localhost/users/42'));

    expect(response?.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await response?.text()).toBe(
      '<!doctype html><html><head><title>Echo &amp; co</title></head><body><user-page>42</user-page></body></html>'
    );
  });

  it('gives each request a fresh state and a fetch bound to the request origin', async () => {
    const baseFetch = vi.fn(async () => new Response('ok'));
    const adapter = createEchoAdapter();
    const handler = createRequestHandler({adapter, routes: [{path: '/', page: 'home-page'}], template: TEMPLATE, fetch: baseFetch});

    await handler(new Request('http://example.test:8080/'));
    await handler(new Request('http://example.test:8080/'));
    await adapter.contexts[0].fetch('/api/data');

    expect(adapter.contexts[0].state).not.toBe(adapter.contexts[1].state);
    expect(baseFetch).toHaveBeenCalledWith(new URL('http://example.test:8080/api/data'), undefined);
  });

  it('declines non-page and non-GET requests so the server can fall through', async () => {
    const handler = createRequestHandler({adapter: createEchoAdapter(), routes: [{path: '/', page: 'home-page'}], template: TEMPLATE});

    expect(await handler(new Request('http://localhost/assets/app.js'))).toBeUndefined();
    expect(await handler(new Request('http://localhost/', {method: 'POST'}))).toBeUndefined();
  });
});

describe('toNodeListener', () => {
  let server: Server;
  let origin: string;

  beforeEach(async () => {
    const handler = createRequestHandler({adapter: createEchoAdapter(), routes: [{path: '/', page: 'home-page'}], template: TEMPLATE});
    server = createServer(toNodeListener(handler));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('serves rendered pages over node:http and 404s declined requests', async () => {
    const page = await fetch(`${origin}/`);
    const missing = await fetch(`${origin}/missing`);

    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<home-page></home-page>');
    expect(missing.status).toBe(404);
  });
});
