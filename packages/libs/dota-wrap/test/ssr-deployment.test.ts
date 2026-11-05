// @vitest-environment node
// End to end: `vite build` of a fixture app through dotaVitePlugins produces a working
// server for each deployment target, rendering `ssr` routes and leaving the rest static.
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
    const {createNodeServer, handler} = await load<{createNodeServer: Function; handler: Handler & {isKnownPath: Function}}>('dist-server/index.mjs');
    // As the generated dist-server/server.mjs starts it.
    const server = createNodeServer({handler, clientDirectory: resolve(fixture, 'dist'), isKnownPath: handler.isKnownPath});
    await new Promise<void>((done) => server.listen(0, done));
    const origin = `http://localhost:${(server.address() as AddressInfo).port}`;
    try {
      const page = await (await fetch(`${origin}/tasks/42`)).text();
      const shell = await (await fetch(`${origin}/about`)).text();
      const missing = await fetch(`${origin}/tasks/missing`);
      const unknown = await fetch(`${origin}/nowhere`);
      const slashForm = await fetch(`${origin}/tasks/42/`);

      expect(page).toContain('<title>Task 42</title>');
      expect(page).not.toContain('Fixture shell');
      expect(page).toMatch(/<app-root id="app-root"><task-page path="\/tasks\/42" data-dh-route="true"[^>]* task-id="42" seen-path="\/tasks\/42"/);
      expect(shell).toContain('<title>Fixture shell</title>');
      expect(shell).toContain('<app-root id="app-root"></app-root>');
      expect(missing.status).toBe(404);
      expect(await missing.text()).toContain('<title>Task missing</title>');
      // No slash policy without SSG: both forms render, as before.
      expect(slashForm.status).toBe(200);
      expect(unknown.status).toBe(404);
      expect(await unknown.text()).toContain('<title>Fixture shell</title>');
      expect(await readFile(resolve(fixture, 'dist-server/server.mjs'), 'utf8')).toContain('isKnownPath: handler.isKnownPath');
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

    // Browser routes rewrite to the clean shell, so unknown paths can fall through to 404.html.
    expect(config.rewrites).toEqual([
      {source: '/tasks/:id', destination: '/api/dota-ssr?__dota_path=/tasks/:id'},
      {source: '/tasks/:id/edit', destination: '/api/dota-ssr?__dota_path=/tasks/:id/edit'},
      {source: '/about', destination: '/dota-shell.html'},
      {source: '/error', destination: '/dota-shell.html'},
      {source: '/about/', destination: '/dota-shell.html'},
      {source: '/error/', destination: '/dota-shell.html'},
      {source: '/(.*)', destination: '/index.html'}
    ]);
    expect(await readFile(resolve(fixture, 'dist/404.html'), 'utf8')).toContain('<title>Fixture shell</title>');
    expect(await readFile(resolve(fixture, 'dist/dota-shell.html'), 'utf8')).toContain('<title>Fixture shell</title>');
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
    // Browser routes reach the worker too, which answers them with the shell.
    expect(JSON.parse(await readFile(resolve(fixture, 'dist/_routes.json'), 'utf8'))).toEqual({
      version: 1,
      include: ['/tasks/*', '/about', '/error', '/about/', '/error/'],
      exclude: []
    });
    expect(await readFile(resolve(fixture, 'dist/404.html'), 'utf8')).toContain('<title>Fixture shell</title>');
    expect(await readFile(resolve(fixture, 'wrangler.toml'), 'utf8')).toContain('compatibility_flags = ["nodejs_compat"]');
  });

  it('vercel with SSG: redirects ssr routes to one slash form through vercel.json', async () => {
    await writeFile(resolve(fixture, 'vercel.json'), '{}');
    await buildFor('vercel', true);
    // The function's own `./_dota-ssr/index.mjs` import would reuse an earlier test's bundle.
    const {handler} = await load<{handler: Handler}>('api/_dota-ssr/index.mjs');

    const config = JSON.parse(await readFile(resolve(fixture, 'vercel.json'), 'utf8'));

    expect((await handler(new Request('https://app.test/tasks/7')))!.status).toBe(200);
    // Vercel enforces SSG's slash policy for ssr routes: a redirect, then a canonical rewrite.
    expect(config.redirects).toContainEqual({source: '/tasks/:id', destination: '/tasks/:id/', permanent: true});
    expect(config.rewrites[0]).toEqual({source: '/tasks/:id/', destination: '/api/dota-ssr?__dota_path=/tasks/:id/'});
  });

  it('cloudflare-pages with SSG: keeps a prerendered page static under a server route', async () => {
    await buildFor('cloudflare-pages', true);
    // The worker's own `./server.js` import would reuse the bundle an earlier test loaded.
    const {handler} = await load<{handler: Handler}>('dist/_worker.js/server.js');
    const bare = (await handler(new Request('https://app.test/tasks/9?tab=a')))!;

    expect(await readFile(resolve(fixture, 'dist/tasks/42/index.html'), 'utf8')).toContain('<task-page path="/tasks/42"');
    expect(JSON.parse(await readFile(resolve(fixture, 'dist/_routes.json'), 'utf8'))).toEqual({
      version: 1,
      include: ['/tasks/*', '/about', '/error', '/about/', '/error/'],
      exclude: ['/tasks/42', '/tasks/42/']
    });
    expect(await readFile(resolve(fixture, 'dist/_redirects'), 'utf8')).toBe('# BEGIN dota-ssg\n# END dota-ssg\n');
    // SSR follows SSG's default slash policy, so both kinds of page share one URL form.
    expect(bare.status).toBe(308);
    expect(bare.headers.get('location')).toBe('/tasks/9/?tab=a');
    expect((await handler(new Request('https://app.test/tasks/9/')))!.status).toBe(200);
  });
}, 120_000);
