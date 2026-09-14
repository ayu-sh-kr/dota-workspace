// @vitest-environment node
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Window} from 'happy-dom';
import {createConsola} from 'consola';
import {createServer, type ResolvedConfig, type ViteDevServer} from 'vite';
import type {DotaSsgOptions} from '@dota/ssg/types';
import {generateStaticPages} from '@dota/ssg/generate';

vi.mock('node:fs/promises', {spy: true});
vi.mock('consola', {spy: true});
vi.mock('vite', async importOriginal => ({
  ...await importOriginal<typeof import('vite')>(),
  createServer: vi.fn()
}));

describe('dotaSsg build output', () => {
  let root: string;
  const disableHydrationEmit = vi.fn();
  const server = {
    pluginContainer: {resolveId: vi.fn()},
    moduleGraph: {invalidateAll: vi.fn()},
    ssrLoadModule: vi.fn<ViteDevServer['ssrLoadModule']>(),
    close: vi.fn<() => Promise<void>>()
  };

  /** Generates pages in an isolated output directory with the plugin's defaults. */
  async function build(options: DotaSsgOptions): Promise<void> {
    await generateStaticPages({root, build: {outDir: 'dist'}} as ResolvedConfig, {
      concurrency: 1,
      renderTimeout: 120_000,
      ...options,
      logType: 'silent'
    });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    root = await mkdtemp(join(tmpdir(), 'dota-ssg-build-'));
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist/index.html'), '<html><head></head><body><app-root></app-root></body></html>');
    vi.mocked(mkdir).mockClear();
    vi.mocked(readFile).mockClear();
    vi.mocked(writeFile).mockClear();
    vi.mocked(createServer).mockResolvedValue(server as unknown as ViteDevServer);
    server.pluginContainer.resolveId.mockResolvedValue({id: '/rendering.js'});
    server.close.mockResolvedValue(undefined);
    server.ssrLoadModule.mockImplementation(async () => {
      const page = document.createElement('article-page');
      page.setAttribute('path', location.pathname);
      page.textContent = location.pathname;
      document.querySelector('app-root')!.append(page);
      return {default: {applicationReady: Promise.resolve()}, disableHydrationEmit};
    });
  });

  afterEach(async () => {
    vi.mocked(readFile).mockRestore();
    vi.mocked(writeFile).mockRestore();
    vi.mocked(mkdir).mockRestore();
    await rm(root, {recursive: true, force: true});
  });

  it('propagates template failures before starting a server', async () => {
    const error = new Error('template unreadable');
    vi.mocked(readFile).mockRejectedValueOnce(error);

    await expect(build({routes: ['/']})).rejects.toBe(error);
    expect(readFile).toHaveBeenCalledWith(join(root, 'dist/index.html'), 'utf8');
    expect(createServer).not.toHaveBeenCalled();
  });

  it('closes the server when rendering package resolution fails', async () => {
    server.pluginContainer.resolveId.mockResolvedValueOnce(null);

    await expect(build({routes: ['/']})).rejects.toThrow('Unable to resolve');
    expect(server.close).toHaveBeenCalledOnce();
    expect(server.ssrLoadModule).not.toHaveBeenCalled();
  });

  it('rejects invalid route metadata before loading application modules', async () => {
    server.ssrLoadModule.mockResolvedValueOnce({routeMetadata: null});

    await expect(build({autoDetectRoutes: true})).rejects.toThrow('routeMetadata array');
    expect(server.ssrLoadModule).toHaveBeenCalledExactlyOnceWith('virtual:dota-route-metadata', {fixStacktrace: true});
    expect(server.close).toHaveBeenCalledOnce();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it.each(['missing', 'rejected'])('restores globals after %s readiness', async failure => {
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    server.ssrLoadModule.mockImplementationOnce(async () => ({
      default: failure === 'missing' ? {} : {applicationReady: Promise.reject(new Error('startup failed'))},
      disableHydrationEmit
    }));

    await expect(build({routes: ['/']})).rejects.toThrow(failure === 'missing' ? 'applicationReady' : 'startup failed');
    expect(Object.getOwnPropertyDescriptor(globalThis, 'document')).toEqual(originalDocument);
    expect(disableHydrationEmit).toHaveBeenCalledOnce();
    expect(server.close).toHaveBeenCalledOnce();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('closes the server and skips later routes after a write failure', async () => {
    const error = new Error('disk full');
    vi.mocked(writeFile).mockRejectedValueOnce(error);

    await expect(build({routes: ['/a', '/b']})).rejects.toBe(error);
    expect(writeFile).toHaveBeenCalledWith(join(root, 'dist/a/index.html'), expect.any(String), 'utf8');
    expect(server.ssrLoadModule).toHaveBeenCalledOnce();
    expect(server.close).toHaveBeenCalledOnce();
  });

  it('restores globals and skips output when a custom settle callback fails', async () => {
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const error = new Error('content failed');
    const settle = vi.fn<NonNullable<DotaSsgOptions['settle']>>().mockRejectedValue(error);

    await expect(build({routes: ['/'], settle})).rejects.toBe(error);
    expect(Object.getOwnPropertyDescriptor(globalThis, 'document')).toEqual(originalDocument);
    expect(disableHydrationEmit).toHaveBeenCalledOnce();
    expect(server.close).toHaveBeenCalledOnce();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it.each([{}, {routes: []}])('skips template reads and server startup for empty options %j', async options => {
    await expect(build(options)).resolves.toBeUndefined();

    expect(readFile).not.toHaveBeenCalled();
    expect(createServer).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('preserves Vercel handling when no routes are selected', async () => {
    await writeFile(join(root, 'vercel.json'), '{"redirects":[]}\n');

    await build({vercel: {configFile: 'vercel.json'}});

    expect(JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))).toEqual({redirects: []});
    expect(createServer).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalledWith(join(root, 'dist/index.html'), 'utf8');
  });

  it('still discovers routes when the explicit list is empty', async () => {
    server.ssrLoadModule.mockResolvedValueOnce({routeMetadata: [{path: '/discovered', ssr: true}]});

    await build({autoDetectRoutes: true, routes: []});

    expect(await readFile(join(root, 'dist/discovered/index.html'), 'utf8')).toContain('path="/discovered"');
    expect(server.ssrLoadModule).toHaveBeenCalledTimes(2);
  });

  it('uses the existing server path for one route even when concurrency is higher', async () => {
    await build({routes: ['/only'], concurrency: 2});

    expect(await readFile(join(root, 'dist/only/index.html'), 'utf8')).toContain('path="/only"');
    expect(createServer).toHaveBeenCalledOnce();
    expect(server.ssrLoadModule).toHaveBeenCalledOnce();
  });

  it('creates a shared output directory once and keeps route windows isolated', async () => {
    const windows: Window[] = [];
    const settle = vi.fn<NonNullable<DotaSsgOptions['settle']>>(window => {
      expect(window.localStorage.getItem('previous')).toBeNull();
      window.localStorage.setItem('previous', window.location.pathname);
      windows.push(window);
    });

    await build({routes: [{path: '/a', output: 'pages/a.html'}, {path: '/b', output: 'pages/b.html'}], settle});

    expect(await readFile(join(root, 'dist/pages/a.html'), 'utf8')).toContain('path="/a" data-dh-route="true" data-dh-route-version="1"');
    expect(await readFile(join(root, 'dist/pages/b.html'), 'utf8')).toContain('path="/b" data-dh-route="true"');
    expect(windows[0]).not.toBe(windows[1]);
    expect(mkdir).toHaveBeenCalledExactlyOnceWith(join(root, 'dist/pages'), {recursive: true});
    expect(server.close).toHaveBeenCalledOnce();
  });

  it('captures chained asynchronous content without a custom settle callback', async () => {
    await writeFile(join(root, 'dist/first.txt'), 'first');
    await writeFile(join(root, 'dist/second.txt'), 'second');
    server.ssrLoadModule.mockImplementationOnce(async () => {
      const routeWindow = globalThis.window as unknown as Window;
      routeWindow.setTimeout(() => {
        void routeWindow.fetch('/first.txt').then(response => response.text()).then(async first => {
          const second = await routeWindow.fetch('/second.txt').then(response => response.text());
          routeWindow.setTimeout(() => {
            document.querySelector('app-root')!.textContent = `${first} ${second}`;
          });
        });
      });
      return {default: {applicationReady: Promise.resolve()}, disableHydrationEmit};
    });

    await build({routes: ['/']});

    expect(await readFile(join(root, 'dist/index.html'), 'utf8')).toContain('first second');
  });

  it('settles work scheduled by a custom callback before serialization', async () => {
    await build({routes: ['/'], settle: window => {
      window.setTimeout(() => {
        window.document.title = 'Settled title';
      });
    }});

    expect(await readFile(join(root, 'dist/index.html'), 'utf8')).toContain('<title>Settled title</title>');
  });

  it('logs route timings, stage details, and a summary after server shutdown', async () => {
    const logger = {info: vi.fn(), debug: vi.fn(), start: vi.fn(), success: vi.fn()};
    vi.mocked(createConsola).mockReturnValueOnce(logger as unknown as ReturnType<typeof createConsola>);
    logger.success.mockImplementation(() => {
      expect(server.close).toHaveBeenCalledOnce();
    });

    await build({routes: ['/timed']});

    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/^\[dota-ssr\] \/timed: \d+ms \(render \d+ms, write \d+ms\)$/));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringMatching(/setup \d+ms, load \d+ms, ready \d+ms, settle \d+ms, serialize \d+ms, cleanup \d+ms/));
    expect(logger.success).toHaveBeenCalledWith(expect.stringMatching(/prerendered 1 routes in \d+\.\d{2}s \(setup \d+ms, render\/workers \+ writes \d+ms, deployment \+ shutdown \d+ms\)/));
    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/slowest routes: \/timed \d+ms/));
  });

  it('does not report successful timing totals when a route fails', async () => {
    const logger = {info: vi.fn(), debug: vi.fn(), start: vi.fn(), success: vi.fn()};
    vi.mocked(createConsola).mockReturnValueOnce(logger as unknown as ReturnType<typeof createConsola>);
    server.ssrLoadModule.mockRejectedValueOnce(new Error('entry failed'));

    await expect(build({routes: ['/failed']})).rejects.toThrow('entry failed');

    expect(logger.success).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('shares asset reads across routes but reads generated HTML after each write', async () => {
    await writeFile(join(root, 'dist/shared.txt'), 'shared');
    server.ssrLoadModule.mockImplementation(async () => {
      const applicationReady = (async () => {
        const shared = await fetch('/shared.txt').then(response => response.text());
        const previous = await fetch('/index.html').then(response => response.text());
        document.title = location.pathname === '/' ? 'Rendered root' : (previous.includes('Rendered root') ? 'Fresh root' : 'Stale shell');
        document.querySelector('app-root')!.textContent = shared;
      })();
      return {default: {applicationReady}, disableHydrationEmit};
    });

    await build({routes: ['/', '/other']});

    expect(await readFile(join(root, 'dist/other/index.html'), 'utf8')).toContain('<title>Fresh root</title>');
    expect(vi.mocked(readFile).mock.calls.filter(([file]) => file === join(root, 'dist/shared.txt'))).toHaveLength(1);
    expect(vi.mocked(readFile).mock.calls.filter(([file]) => file === join(root, 'dist/index.html'))).toHaveLength(3);
  });

  it('marks only the first matching route host under a custom element', async () => {
    server.ssrLoadModule.mockImplementationOnce(async () => {
      document.body.innerHTML = '<div><span path="/"></span></div><app-root><article-page path="/other"></article-page><article-page path="/"></article-page><article-page path="/"></article-page></app-root>';
      return {default: {applicationReady: Promise.resolve()}, disableHydrationEmit};
    });

    await build({routes: ['/']});

    const html = await readFile(join(root, 'dist/index.html'), 'utf8');
    expect(html.match(/data-dh-route="true"/g)).toHaveLength(1);
    expect(html).toContain('<span path="/">');
    expect(html).toContain('<article-page path="/other">');
    expect(html).toContain('<article-page path="/" data-dh-route="true" data-dh-route-version="1">');
  });

  it('renders fresh custom elements and asynchronous content through a real Vite server', async () => {
    const vite = await vi.importActual<typeof import('vite')>('vite');
    vi.mocked(createServer).mockImplementationOnce(vite.createServer);
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'dist/guide.txt'), 'shared guide');
    await writeFile(join(root, 'rendering.js'), `
      export function configureDotaRenderingLogger() {}
      export function setHydrationEmit() {}
    `);
    await writeFile(join(root, 'src/main.ts'), `
      customElements.define('article-page', class extends HTMLElement {});
      export const applicationReady = (async () => {
        const content = await fetch('/guide.txt').then(response => response.text());
        const page = document.createElement('article-page');
        page.setAttribute('path', location.pathname);
        page.textContent = location.pathname + ': ' + content;
        document.querySelector('app-root').append(page);
      })();
    `);

    await build({routes: ['/a', '/b'], renderingModule: join(root, 'rendering.js')});

    for (const route of ['a', 'b']) {
      const html = await readFile(join(root, `dist/${route}/index.html`), 'utf8');
      expect(html).toContain(`/${route}: shared guide`);
      expect(html).toContain(`path="/${route}" data-dh-route="true" data-dh-route-version="1"`);
    }
    expect(vi.mocked(readFile).mock.calls.filter(([file]) => file === join(root, 'dist/guide.txt'))).toHaveLength(1);
  });
});
