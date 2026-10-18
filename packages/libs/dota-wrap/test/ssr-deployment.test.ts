// @vitest-environment node
// End to end: `vite build` of a fixture app through dotaVitePlugins produces a working
// server for each deployment target, rendering `ssr` routes and leaving the rest static.
import {existsSync} from 'node:fs';
import {readFile, rm, writeFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'vite';

const fixture = resolve(import.meta.dirname, 'fixtures/ssr-app');
const GENERATED = ['dist', 'dist-server', '.netlify', 'api', 'vercel.json', 'wrangler.toml', 'node_modules'];

/** Builds the fixture for one target, the way `vite build` would. */
async function buildFor(target: string): Promise<void> {
  process.env.DOTA_FIXTURE_TARGET = target;
  process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
  await build({configFile: resolve(fixture, 'vite.config.ts'), logLevel: 'silent'});
}

/** Imports a generated module fresh, since every build rewrites the same paths. */
async function load<T>(file: string): Promise<T> {
  return import(`${pathToFileURL(resolve(fixture, file)).href}?build=${Date.now()}`) as Promise<T>;
}

type Handler = (request: Request) => Promise<Response | undefined>;

describe('server deployment', () => {
  beforeAll(() => Promise.all(GENERATED.map((path) => rm(resolve(fixture, path), {recursive: true, force: true}))));
  afterAll(() => Promise.all(GENERATED.map((path) => rm(resolve(fixture, path), {recursive: true, force: true}))));

  it('node: serves ssr routes, static files, and the SPA shell for csr routes', async () => {
    await buildFor('node');
    const {createNodeServer, handler} = await load<{createNodeServer: Function; handler: Handler}>('dist-server/index.mjs');
    const server = createNodeServer({handler, clientDirectory: resolve(fixture, 'dist')});
    await new Promise<void>((done) => server.listen(0, done));
    const origin = `http://localhost:${(server.address() as AddressInfo).port}`;
    try {
      const page = await (await fetch(`${origin}/tasks/42`)).text();
      const shell = await (await fetch(`${origin}/about`)).text();

      expect(page).toContain('<title>Task 42</title>');
      expect(page).not.toContain('Fixture shell');
      expect(page).toMatch(/<app-root id="app-root"><task-page path="\/tasks\/42" data-dh-route="true"[^>]* task-id="42" seen-path="\/tasks\/42"/);
      expect(shell).toContain('<title>Fixture shell</title>');
      expect(shell).toContain('<app-root id="app-root"></app-root>');
      expect(existsSync(resolve(fixture, 'dist-server/server.mjs'))).toBe(true);
    } finally {
      server.close();
    }
  });

  it('vercel: adds a function and rewrites ahead of authored ones', async () => {
    await writeFile(resolve(fixture, 'vercel.json'), JSON.stringify({rewrites: [{source: '/(.*)', destination: '/index.html'}]}));
    await buildFor('vercel');
    const config = JSON.parse(await readFile(resolve(fixture, 'vercel.json'), 'utf8'));
    const {GET} = await load<{GET: Handler}>('api/dota-ssr.mjs');

    const response = await GET(new Request('https://app.test/api/dota-ssr?__dota_path=/tasks/7'));

    expect(config.rewrites).toEqual([
      {source: '/tasks/:id', destination: '/api/dota-ssr?__dota_path=/tasks/:id'},
      {source: '/(.*)', destination: '/index.html'}
    ]);
    expect(await response!.text()).toContain('seen-path="/tasks/7"');
  });

  it('netlify: writes a function that claims only ssr paths', async () => {
    await buildFor('netlify');
    const fn = await load<{default: Handler; config: object}>('.netlify/v1/functions/dota-ssr/dota-ssr.mjs');

    const response = await fn.default(new Request('https://app.test/tasks/8'));

    expect(fn.config).toEqual({path: ['/tasks/:id']});
    expect(await response!.text()).toContain('<title>Task 8</title>');
  });

  it('cloudflare-pages: writes a worker that falls back to static assets', async () => {
    await buildFor('cloudflare-pages');
    const {default: worker} = await load<{default: {fetch: (request: Request, env: object) => Promise<Response>}}>('dist/_worker.js/index.js');
    const env = {ASSETS: {fetch: async (request: Request) => new Response(`asset ${new URL(request.url).pathname}`)}};

    const page = await worker.fetch(new Request('https://app.test/tasks/9'), env);
    const other = await worker.fetch(new Request('https://app.test/about'), env);

    expect(await page.text()).toContain('<title>Task 9</title>');
    expect(await other.text()).toBe('asset /about');
    expect(JSON.parse(await readFile(resolve(fixture, 'dist/_routes.json'), 'utf8'))).toEqual({version: 1, include: ['/tasks/*'], exclude: []});
    expect(await readFile(resolve(fixture, 'wrangler.toml'), 'utf8')).toContain('compatibility_flags = ["nodejs_compat"]');
  });
}, 120_000);
