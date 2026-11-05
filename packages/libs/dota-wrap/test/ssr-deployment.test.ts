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

/**
 * Builds the fixture for one target, the way `vite build` would; with `ssg`, the way
 * `vite build --ssg` would, prerendering `/tasks/42` in the same build as the server.
 */
async function buildFor(target: string, ssg = false): Promise<void> {
  process.env.DOTA_FIXTURE_TARGET = target;
  process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
  if (ssg) {
    process.env.DOTA_FIXTURE_SSG = 'true';
    process.argv.push('--ssg');
  }
  try {
    await build({configFile: resolve(fixture, 'vite.config.ts'), logLevel: 'silent'});
  } finally {
    delete process.env.DOTA_FIXTURE_SSG;
    if (ssg) process.argv.splice(process.argv.indexOf('--ssg'), 1);
  }
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
      const missing = await fetch(`${origin}/tasks/missing`);

      expect(page).toContain('<title>Task 42</title>');
      expect(page).not.toContain('Fixture shell');
      expect(page).toMatch(/<app-root id="app-root"><task-page path="\/tasks\/42" data-dh-route="true"[^>]* task-id="42" seen-path="\/tasks\/42"/);
      expect(shell).toContain('<title>Fixture shell</title>');
      expect(shell).toContain('<app-root id="app-root"></app-root>');
      expect(missing.status).toBe(404);
      expect(await missing.text()).toContain('<title>Task missing</title>');
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

    const missing = await GET(new Request('https://app.test/api/dota-ssr?__dota_path=/tasks/missing'));

    expect(config.rewrites).toEqual([
      {source: '/tasks/:id', destination: '/api/dota-ssr?__dota_path=/tasks/:id'},
      {source: '/tasks/:id/edit', destination: '/api/dota-ssr?__dota_path=/tasks/:id/edit'},
      {source: '/(.*)', destination: '/index.html'}
    ]);
    expect(await response!.text()).toContain('seen-path="/tasks/7"');
    expect(missing!.status).toBe(404);
  });

  it('netlify: writes a function that claims only ssr paths', async () => {
    await buildFor('netlify');
    const fn = await load<{default: Handler; config: object}>('.netlify/v1/functions/dota-ssr/dota-ssr.mjs');

    const response = await fn.default(new Request('https://app.test/tasks/8'));

    expect(fn.config).toEqual({path: ['/tasks/:id', '/tasks/:id/edit']});
    expect(await response!.text()).toContain('<title>Task 8</title>');
  });

  it('cloudflare-pages: writes a worker that falls back to static assets', async () => {
    await buildFor('cloudflare-pages');
    const {default: worker} = await load<{default: {fetch: (request: Request, env: object) => Promise<Response>}}>('dist/_worker.js/index.js');
    const env = {ASSETS: {fetch: async (request: Request) => new Response(`asset ${new URL(request.url).pathname}`)}};

    const page = await worker.fetch(new Request('https://app.test/tasks/9'), env);
    const edit = await worker.fetch(new Request('https://app.test/tasks/9/edit'), env);
    const missing = await worker.fetch(new Request('https://app.test/tasks/missing'), env);
    const other = await worker.fetch(new Request('https://app.test/about'), env);

    expect(await page.text()).toContain('<title>Task 9</title>');
    expect(await edit.text()).toContain('<title>Edit task</title>');
    expect(missing.status).toBe(404);
    expect(await other.text()).toBe('asset /about');
    // `/tasks/*` already matches every `/tasks/:id/edit` URL; Cloudflare rejects the pair.
    expect(JSON.parse(await readFile(resolve(fixture, 'dist/_routes.json'), 'utf8'))).toEqual({version: 1, include: ['/tasks/*'], exclude: []});
    expect(await readFile(resolve(fixture, 'wrangler.toml'), 'utf8')).toContain('compatibility_flags = ["nodejs_compat"]');
  });

  it('cloudflare-pages with SSG: keeps a prerendered page static under a server route', async () => {
    await buildFor('cloudflare-pages', true);

    expect(await readFile(resolve(fixture, 'dist/tasks/42/index.html'), 'utf8')).toContain('<task-page path="/tasks/42"');
    expect(JSON.parse(await readFile(resolve(fixture, 'dist/_routes.json'), 'utf8'))).toEqual({
      version: 1,
      include: ['/tasks/*'],
      exclude: ['/tasks/42', '/tasks/42/']
    });
    expect(await readFile(resolve(fixture, 'dist/_redirects'), 'utf8')).toBe('# BEGIN dota-ssg\n# END dota-ssg\n');
  });
}, 120_000);
