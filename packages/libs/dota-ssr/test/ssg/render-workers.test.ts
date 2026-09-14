// @vitest-environment node
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {build} from 'vite';
import {renderRoutesInWorkers, type RenderWorkerData} from '@dota/ssg/render-workers';
import {resolveSsgRoutes} from '@dota/ssg/route-output';

describe('renderRoutesInWorkers', () => {
  let workerBuild: string;
  let workerFile: string;
  let root: string;
  let data: RenderWorkerData;

  beforeAll(async () => {
    // Build the current source rather than testing a possibly stale dist worker.
    workerBuild = await mkdtemp(join(import.meta.dirname, '.worker-test-'));
    await build({
      configFile: false,
      root: resolve(import.meta.dirname, '../..'),
      logLevel: 'silent',
      build: {
        target: 'node22',
        outDir: workerBuild,
        lib: {
          entry: resolve(import.meta.dirname, '../../src/ssg/render-worker.ts'),
          formats: ['cjs'],
          fileName: () => 'worker.cjs'
        },
        rolldownOptions: {platform: 'node', external: [/^node:/, 'vite', 'happy-dom', 'consola']}
      }
    });
    workerFile = join(workerBuild, 'worker.cjs');
  });

  afterAll(async () => {
    await rm(workerBuild, {recursive: true, force: true});
  });

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dota-render-workers-'));
    await mkdir(join(root, 'src'));
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'rendering.js'), `
      export function configureDotaRenderingLogger() {}
      export function setHydrationEmit() {}
    `);
    data = {
      root,
      config: {configFile: undefined, mode: 'production'},
      template: '<html><head></head><body><app-root></app-root></body></html>',
      outputDirectory: join(root, 'dist'),
      outputs: [],
      options: {renderingModule: join(root, 'rendering.js'), logType: 'silent'}
    };
  });

  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  it('reports startup failures without writing output', async () => {
    data.options.renderingModule = 'missing-rendering-package';
    const write = vi.fn(async () => {});

    await expect(renderRoutesInWorkers(resolveSsgRoutes(['/']), data, 1, 10_000, write, workerFile))
      .rejects.toThrow('Unable to resolve');
    expect(write).not.toHaveBeenCalled();
  });

  it('reports the route when application readiness rejects', async () => {
    await writeFile(join(root, 'src/main.ts'), 'export const applicationReady = Promise.reject(new Error("content unavailable"));');
    const write = vi.fn(async () => {});

    await expect(renderRoutesInWorkers(resolveSsgRoutes(['/failed']), data, 1, 10_000, write, workerFile))
      .rejects.toThrow('/failed: content unavailable');
    expect(write).not.toHaveBeenCalled();
  });

  it('stops scheduling after an output write rejects', async () => {
    await writeFile(join(root, 'src/main.ts'), 'export const applicationReady = Promise.resolve();');
    const write = vi.fn(async () => {
      throw new Error('disk full');
    });

    await expect(renderRoutesInWorkers(resolveSsgRoutes(['/a', '/b']), data, 1, 10_000, write, workerFile))
      .rejects.toThrow('/a: disk full');
    expect(write).toHaveBeenCalledExactlyOnceWith(
      {path: '/a', output: 'a/index.html'},
      expect.stringContaining('<app-root>'),
      expect.objectContaining({total: expect.any(Number)})
    );
  });

  it('reports unexpected worker exit instead of waiting indefinitely', async () => {
    const crashingWorker = join(root, 'crash.cjs');
    await writeFile(crashingWorker, 'process.exit(3);');

    await expect(renderRoutesInWorkers(resolveSsgRoutes(['/']), data, 1, 10_000, async () => {}, crashingWorker))
      .rejects.toThrow('exited unexpectedly (3)');
  });

  it('terminates workers that never finish startup', async () => {
    const stuckWorker = join(root, 'stuck.cjs');
    await writeFile(stuckWorker, 'setInterval(() => {}, 1000);');

    await expect(renderRoutesInWorkers(resolveSsgRoutes(['/']), data, 1, 100, async () => {}, stuckWorker))
      .rejects.toThrow('exceeded 100ms');
  });

  it('renders concurrently in two reusable threads with fresh route windows', async () => {
    await mkdir(join(root, 'started'));
    await writeFile(join(root, 'dist/shared.txt'), 'shared guide');
    await writeFile(join(root, 'src/main.ts'), `
      import {threadId} from 'node:worker_threads';
      import {writeFile, readdir} from 'node:fs/promises';
      customElements.define('article-page', class extends HTMLElement {});
      const pathname = location.pathname;
      export const applicationReady = (async () => {
        // Both first pages must start before either can finish: sequential rendering would hang.
        if (pathname === '/a' || pathname === '/b') {
          await writeFile(${JSON.stringify(join(root, 'started'))} + '/' + threadId, pathname);
          while ((await readdir(${JSON.stringify(join(root, 'started'))})).length < 2) {
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        }
        if (localStorage.getItem('previous')) throw new Error('route state leaked');
        localStorage.setItem('previous', pathname);
        const content = await fetch('/shared.txt').then(response => response.text());
        const page = document.createElement('article-page');
        page.setAttribute('path', pathname);
        page.setAttribute('data-worker', String(threadId));
        page.textContent = pathname + ': ' + content;
        document.querySelector('app-root').append(page);
      })();
    `);
    const routes = resolveSsgRoutes(['/a', '/b', '/c', '/d']);
    const pages = new Map<string, string>();

    await renderRoutesInWorkers(routes, data, 2, 10_000, async (route, html, timings) => {
      pages.set(route.path, html);
      expect(Object.keys(timings).sort()).toEqual(['cleanup', 'load', 'ready', 'serialize', 'settle', 'setup', 'total']);
      for (const duration of Object.values(timings)) {
        expect(Number.isFinite(duration)).toBe(true);
        expect(duration).toBeGreaterThanOrEqual(0);
      }
      expect(timings.total).toBeGreaterThanOrEqual(timings.cleanup + timings.load);
    }, workerFile);

    expect(pages.size).toBe(4);
    const workerIds = new Set<string>();
    for (const route of routes) {
      const html = pages.get(route.path)!;
      expect(html).toContain(`${route.path}: shared guide`);
      expect(html).toContain('data-dh-route="true" data-dh-route-version="1"');
      workerIds.add(html.match(/data-worker="(\d+)"/)![1]);
    }
    expect(workerIds.size).toBe(2);
  });

  it('retains app transforms while omitting duplicate metadata writers', async () => {
    const configFile = join(root, 'vite.config.mjs');
    await writeFile(configFile, `
      export default {
        plugins: [
          Promise.resolve([
            {name: 'vite-plugin-event-map-generator', configResolved() { throw new Error('duplicate event output'); }},
            {name: 'vite-plugin-dota-web-type-json', buildStart() { throw new Error('duplicate web types'); }}
          ]),
          {name: 'app-transform', transform(code, id) {
            if (id.endsWith('/main.ts')) return code.replace('ORIGINAL', 'TRANSFORMED');
          }}
        ]
      };
    `);
    data.config = {...data.config, configFile};
    await writeFile(join(root, 'src/main.ts'), `
      document.title = 'ORIGINAL';
      export const applicationReady = Promise.resolve();
    `);
    const pages: string[] = [];

    await renderRoutesInWorkers(resolveSsgRoutes(['/a', '/b']), data, 2, 10_000, async (_, html) => {
      pages.push(html);
    }, workerFile);

    expect(pages).toHaveLength(2);
    expect(pages.every(html => html.includes('<title>TRANSFORMED</title>'))).toBe(true);
  });

  it('produces the same marked documents with one or two workers', async () => {
    await writeFile(join(root, 'src/main.ts'), `
      customElements.define('article-page', class extends HTMLElement {});
      const page = document.createElement('article-page');
      page.setAttribute('path', location.pathname);
      page.textContent = location.pathname;
      document.querySelector('app-root').append(page);
      document.title = location.pathname;
      export const applicationReady = Promise.resolve();
    `);
    const routes = resolveSsgRoutes(['/a', '/b', '/c']);
    const sequential = new Map<string, string>();
    const parallel = new Map<string, string>();

    await renderRoutesInWorkers(routes, data, 1, 10_000, async (route, html) => {
      sequential.set(route.path, html);
    }, workerFile);
    await renderRoutesInWorkers(routes, data, 2, 10_000, async (route, html) => {
      parallel.set(route.path, html);
    }, workerFile);

    expect([...parallel].sort()).toEqual([...sequential].sort());
  });
});
