// @vitest-environment node
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createConsola} from 'consola';
import {prepareServerDeployment} from '@dota/vite/deployment/server';
import {resolveSsgRoutes} from '@dota/ssg/route-output';
import type {ServerDeployment} from '@dota/vite/ssr/types';

const logger = createConsola({level: -999});
const warn = vi.spyOn(logger, 'warn');

/** Server bundle stand-in: renders `/tasks/1`, declares `/tasks/:id` and `/about`. */
const BUNDLE = `export const handler = Object.assign(
  async (request) => new URL(request.url).pathname === '/tasks/1' ? new Response('page', {headers: {'cache-control': 'public, s-maxage=60'}}) : undefined,
  {isKnownPath: async (path) => /^\\/tasks\\/[^/]+\\/?$|^\\/about$/.test(path)}
);
`;

type Worker = {fetch: (request: Request, env: object, context?: object) => Promise<Response>};

describe('prepareServerDeployment with prerendered pages', () => {
  let root: string;
  let deployment: ServerDeployment;

  beforeEach(async () => {
    root = await mkdtemp(resolve(tmpdir(), 'dota-server-deployment-'));
    await mkdir(resolve(root, 'dist'));
    await writeFile(resolve(root, 'bundle.mjs'), BUNDLE);
    await writeFile(resolve(root, 'wrangler.toml'), 'compatibility_flags = ["nodejs_compat"]\n');
    deployment = {
      root,
      outputDirectory: resolve(root, 'dist'),
      bundleFile: resolve(root, 'bundle.mjs'),
      shell: '<!doctype html>',
      routes: ['/tasks/:id', '/tasks/:id/edit'],
      staticRoutes: resolveSsgRoutes(['/tasks/42', '/about']),
      base: '/',
      options: {}
    };
  });

  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it('cloudflare-pages: collapses overlapping wildcards and excludes covered prerendered pages', async () => {
    await prepareServerDeployment('cloudflare-pages', deployment, logger);

    expect(JSON.parse(await readFile(resolve(root, 'dist/_routes.json'), 'utf8'))).toEqual({
      version: 1,
      include: ['/tasks/*'],
      exclude: ['/tasks/42', '/tasks/42/']
    });
  });

  it('cloudflare-pages: warns but still writes when the rules exceed the platform limit', async () => {
    const pages = Array.from({length: 50}, (_, index) => `/tasks/${index}`);
    warn.mockClear();

    await prepareServerDeployment('cloudflare-pages', {...deployment, staticRoutes: resolveSsgRoutes(pages)}, logger);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('_routes.json has 101 rules (1 include, 100 exclude), but Cloudflare Pages accepts 100'));
    expect(JSON.parse(await readFile(resolve(root, 'dist/_routes.json'), 'utf8')).exclude).toHaveLength(100);
  });

  it('cloudflare-pages: stays quiet within the limit', async () => {
    warn.mockClear();

    await prepareServerDeployment('cloudflare-pages', deployment, logger);

    expect(warn).not.toHaveBeenCalled();
  });

  it('cloudflare-pages: routes both slash forms of literal routes when a slash policy is set', async () => {
    await prepareServerDeployment('cloudflare-pages', {...deployment, routes: ['/about', '/tasks/:id', '/'], staticRoutes: [], options: {trailingSlash: true}}, logger);

    expect(JSON.parse(await readFile(resolve(root, 'dist/_routes.json'), 'utf8')).include).toEqual(['/about', '/tasks/*', '/', '/about/']);
  });

  it('cloudflare-pages: answers unknown paths under ssr patterns with the shell and 404', async () => {
    await prepareServerDeployment('cloudflare-pages', deployment, logger);
    const worker = (await import(`${pathToFileURL(resolve(root, 'dist/_worker.js/index.js')).href}?plain`)).default as Worker;
    const env = {ASSETS: {fetch: async () => new Response('shell', {headers: {'content-type': 'text/html'}})}};

    expect(await (await worker.fetch(new Request('https://app.test/tasks/1'), env)).text()).toBe('page');
    expect((await worker.fetch(new Request('https://app.test/tasks/2'), env)).status).toBe(200);
    const missing = await worker.fetch(new Request('https://app.test/tasks/2/extra'), env);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe('shell');
    const redirect = {ASSETS: {fetch: async () => new Response(null, {status: 308, headers: {location: '/x/', 'content-type': 'text/html'}})}};
    expect((await worker.fetch(new Request('https://app.test/tasks/2/extra'), redirect)).status).toBe(308);
  });

  it('cloudflare-pages: serves cached pages without rendering only when caching is on', async () => {
    const store = new Map<string, Response>();
    vi.stubGlobal('caches', {default: {
      match: async (request: Request) => store.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => void store.set(request.url, response)
    }});
    try {
      await prepareServerDeployment('cloudflare-pages', {...deployment, options: {cacheControl: 'public, s-maxage=60'}}, logger);
      const source = await readFile(resolve(root, 'dist/_worker.js/index.js'), 'utf8');
      const worker = (await import(`${pathToFileURL(resolve(root, 'dist/_worker.js/index.js')).href}?cached`)).default as Worker;
      const pending: Promise<unknown>[] = [];
      const context = {waitUntil: (work: Promise<unknown>) => pending.push(work)};
      const env = {ASSETS: {fetch: async () => new Response('shell')}};

      await worker.fetch(new Request('https://app.test/tasks/1'), env, context);
      await Promise.all(pending);
      store.set('https://app.test/tasks/1', new Response('from cache'));

      expect(source).toContain('caches.default');
      expect(await (await worker.fetch(new Request('https://app.test/tasks/1'), env, context)).text()).toBe('from cache');
      await prepareServerDeployment('cloudflare-pages', deployment, logger);
      expect(await readFile(resolve(root, 'dist/_worker.js/index.js'), 'utf8')).not.toContain('caches');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('netlify: claims both slash forms when a slash policy is set', async () => {
    await prepareServerDeployment('netlify', {...deployment, staticRoutes: [], options: {trailingSlash: false}}, logger);

    expect(await readFile(resolve(root, '.netlify/v1/functions/dota-ssr/dota-ssr.mjs'), 'utf8')).toContain(
      'export const config = {"path":["/tasks/:id","/tasks/:id/edit","/tasks/:id/","/tasks/:id/edit/"]};'
    );
  });

  it('netlify: excludes covered prerendered pages from the function paths', async () => {
    await prepareServerDeployment('netlify', {...deployment, base: '/app/'}, logger);

    expect(await readFile(resolve(root, '.netlify/v1/functions/dota-ssr/dota-ssr.mjs'), 'utf8')).toContain(
      'export const config = {"path":["/app/tasks/:id","/app/tasks/:id/edit"],"excludedPath":["/app/tasks/42","/app/tasks/42/"]};'
    );
  });

  it('vercel: adds rewrites to the configured file that static generation updated', async () => {
    await writeFile(resolve(root, 'site.json'), JSON.stringify({redirects: [{source: '/tasks/42', destination: '/tasks/42/', permanent: true}]}));

    await prepareServerDeployment('vercel', {...deployment, options: {vercelConfigFile: 'site.json'}}, logger);

    expect(JSON.parse(await readFile(resolve(root, 'site.json'), 'utf8'))).toEqual({
      redirects: [{source: '/tasks/42', destination: '/tasks/42/', permanent: true}],
      rewrites: [
        {source: '/tasks/:id', destination: '/api/dota-ssr?__dota_path=/tasks/:id'},
        {source: '/tasks/:id/edit', destination: '/api/dota-ssr?__dota_path=/tasks/:id/edit'}
      ]
    });
    await expect(readFile(resolve(root, 'vercel.json'), 'utf8')).rejects.toThrow('ENOENT');
  });
});
