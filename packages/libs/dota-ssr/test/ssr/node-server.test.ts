// @vitest-environment node
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
import type {Server} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createNodeServer} from '@dota/ssr/node';

let directory: string;
let server: Server;
let origin: string;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'dota-node-server-'));
  await mkdir(join(directory, 'docs'));
  await writeFile(join(directory, 'index.html'), 'shell');
  await writeFile(join(directory, 'docs', 'index.html'), 'prerendered docs');
  await writeFile(join(directory, 'app.js'), 'console.log(1)');
  server = createNodeServer({
    clientDirectory: directory,
    handler: async (request) => {
      const {pathname} = new URL(request.url);
      if (pathname === '/broken') throw new Error('render failed');
      return pathname === '/live' ? new Response('rendered', {headers: {'content-type': 'text/html'}}) : undefined;
    }
  });
  await new Promise<void>((done) => server.listen(0, done));
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.close();
  await rm(directory, {recursive: true, force: true});
});

describe('createNodeServer', () => {
  it('serves built files first, then server-rendered routes, then the SPA shell', async () => {
    const asset = await fetch(`${origin}/app.js`);

    expect(asset.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(await asset.text()).toBe('console.log(1)');
    expect(await (await fetch(`${origin}/docs`)).text()).toBe('prerendered docs');
    expect(await (await fetch(`${origin}/live`)).text()).toBe('rendered');
    expect(await (await fetch(`${origin}/client/route`)).text()).toBe('shell');
  });

  it('renders a server route at "/" instead of serving the unrendered shell', async () => {
    const shellOnly = await mkdtemp(join(tmpdir(), 'dota-node-shell-'));
    await writeFile(join(shellOnly, 'index.html'), 'shell');
    await writeFile(join(shellOnly, 'shell.html'), 'shell');
    const home = createNodeServer({clientDirectory: shellOnly, fallback: join(shellOnly, 'shell.html'), handler: async () => new Response('rendered home')});
    await new Promise<void>((done) => home.listen(0, done));
    try {
      expect(await (await fetch(`http://localhost:${(home.address() as AddressInfo).port}/`)).text()).toBe('rendered home');
    } finally {
      home.close();
      await rm(shellOnly, {recursive: true, force: true});
    }
  });

  it('never serves files outside the client directory', async () => {
    const response = await fetch(`${origin}/%2e%2e/%2e%2e/etc/passwd`);

    expect(await response.text()).toBe('shell');
  });

  it('answers a render error with 500 instead of the shell', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await fetch(`${origin}/broken`);

    expect(response.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });

  it('rejects non-GET requests the handler does not answer', async () => {
    expect((await fetch(`${origin}/client`, {method: 'POST'})).status).toBe(405);
  });
});
