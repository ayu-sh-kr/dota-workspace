// @vitest-environment node
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Window} from 'happy-dom';
import {installPrerenderFetch} from '@dota/ssg/prerender-fetch';
import {createPrerenderAssetReader, type PrerenderAssetReader} from '@dota/ssg/asset-reader';
import {createPrerenderNetworkCache} from '@dota/ssg/network-cache';

describe('installPrerenderFetch', () => {
  let testRoot: string;
  let staticRoot: string;
  let window: Window;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), 'dota-ssg-fetch-'));
    staticRoot = join(testRoot, 'dist');
    await mkdir(staticRoot);
    window = new Window({url: 'http://dota.ssg/docs'});
  });

  afterEach(async () => {
    await window.happyDOM.close();
    await rm(testRoot, {recursive: true, force: true});
  });

  it('rejects an invalid API base URL before installing the adapter', () => {
    expect(() => installPrerenderFetch(window, staticRoot, 'not a URL')).toThrow();
  });

  it('surfaces asset errors and releases the pending-request barrier', async () => {
    const error = Object.assign(new Error('denied'), {code: 'EACCES'});
    const readAsset = vi.fn<PrerenderAssetReader>().mockRejectedValue(error);
    const waitUntilIdle = installPrerenderFetch(window, staticRoot, undefined, readAsset);

    await expect(window.fetch('/guide.md')).rejects.toBe(error);
    await expect(waitUntilIdle()).resolves.toBe(false);
    expect(readAsset).toHaveBeenCalledExactlyOnceWith(join(staticRoot, 'guide.md'), false);
  });

  it.each(['/missing.md', '/'])('returns 404 for HEAD requests to %s', async target => {
    installPrerenderFetch(window, staticRoot);

    const response = await window.fetch(target, {method: 'HEAD'});

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('');
  });

  it('preserves API fallback for missing HEAD targets', async () => {
    const networkFetch = vi.fn<Window['fetch']>().mockResolvedValue(new window.Response(null, {status: 204}));
    window.fetch = networkFetch;
    installPrerenderFetch(window, staticRoot, 'https://api.example.com');

    const response = await window.fetch('/missing', {method: 'HEAD'});

    expect(response.status).toBe(204);
    expect(networkFetch).toHaveBeenCalledExactlyOnceWith('https://api.example.com/missing', {method: 'HEAD'});
  });

  it('serves independent response bodies in separate windows from shared bytes', async () => {
    await writeFile(join(staticRoot, 'guide.md'), 'shared content');
    const readAsset = createPrerenderAssetReader(new Set());
    const secondWindow = new Window({url: 'http://dota.ssg/other'});
    try {
      installPrerenderFetch(window, staticRoot, undefined, readAsset);
      installPrerenderFetch(secondWindow, staticRoot, undefined, readAsset);
      const first = await window.fetch('/guide.md');
      await expect(first.text()).resolves.toBe('shared content');
      const second = await secondWindow.fetch('/guide.md');

      expect(second).not.toBe(first);
      await expect(second.text()).resolves.toBe('shared content');
    } finally {
      await secondWindow.happyDOM.close();
    }
  });

  it('downloads a cross-origin asset once for every route window sharing a network cache', async () => {
    const secondWindow = new Window({url: 'http://dota.ssg/other'});
    const networkCache = createPrerenderNetworkCache();
    const networkFetch = vi.fn<Window['fetch']>().mockImplementation(async () => new window.Response('<svg/>'));
    try {
      for (const routeWindow of [window, secondWindow]) {
        routeWindow.fetch = networkFetch;
        installPrerenderFetch(routeWindow, staticRoot, undefined, undefined, networkCache);
      }
      const first = await window.fetch('https://api.iconify.design/mdi:github.svg');
      const second = await secondWindow.fetch('https://api.iconify.design/mdi:github.svg');

      expect(networkFetch).toHaveBeenCalledOnce();
      await expect(first.text()).resolves.toBe('<svg/>');
      await expect(second.text()).resolves.toBe('<svg/>');
    } finally {
      await secondWindow.happyDOM.close();
    }
  });

  it('returns matching GET and HEAD headers with an empty HEAD body', async () => {
    await writeFile(join(staticRoot, 'guide.md'), 'héllo');
    installPrerenderFetch(window, staticRoot);

    const head = await window.fetch('/guide.md', {method: 'HEAD'});
    const get = await window.fetch('/guide.md');

    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe('6');
    expect([...head.headers]).toEqual([...get.headers]);
    await expect(head.text()).resolves.toBe('');
    await expect(get.text()).resolves.toBe('héllo');
  });

  it('serves same-origin public files without a web server', async () => {
    await mkdir(join(staticRoot, 'documents'));
    await writeFile(join(staticRoot, 'documents', 'guide.md'), '# Generated at build time', 'utf8');
    const waitUntilIdle = installPrerenderFetch(window, staticRoot);

    const response = await window.fetch('/documents/guide.md');
    await waitUntilIdle();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    await expect(response.text()).resolves.toBe('# Generated at build time');
  });

  it('returns a normal 404 response when a public file does not exist', async () => {
    installPrerenderFetch(window, staticRoot);

    const response = await window.fetch('/missing.md');

    expect(response.status).toBe(404);
    expect(response.ok).toBe(false);
  });

  it('delegates missing relative paths to the configured API base URL', async () => {
    const networkFetch: Window['fetch'] = vi.fn(async input => {
      expect(input).toBe('https://api.example.com/api/posts?draft=true');
      return new window.Response('{"posts":[]}', {headers: {'content-type': 'application/json'}});
    });
    window.fetch = networkFetch;
    const waitUntilIdle = installPrerenderFetch(window, staticRoot, 'https://api.example.com');

    const response = await window.fetch('/api/posts?draft=true');
    await waitUntilIdle();

    expect(response.status).toBe(200);
    expect(networkFetch).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({posts: []});
  });

  it('propagates API failures and still removes the request from the idle barrier', async () => {
    const apiError = new Error('API unavailable');
    const networkFetch: Window['fetch'] = vi.fn(() => Promise.reject(apiError));
    window.fetch = networkFetch;
    const waitUntilIdle = installPrerenderFetch(window, staticRoot, 'https://api.example.com');

    await expect(window.fetch('/api/posts')).rejects.toThrow('API unavailable');
    await expect(waitUntilIdle()).resolves.toBe(false);
    expect(networkFetch).toHaveBeenCalledWith('https://api.example.com/api/posts', undefined);
  });

  it('returns method-not-allowed for non-read requests without an API base URL', async () => {
    installPrerenderFetch(window, staticRoot);

    const response = await window.fetch('/documents/guide.md', {method: 'POST'});

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });

  it('does not serve files outside the built client directory', async () => {
    await writeFile(join(testRoot, 'secret.md'), 'not public', 'utf8');
    installPrerenderFetch(window, staticRoot);

    const response = await window.fetch('/%2e%2e%2fsecret.md');

    expect(response.status).toBe(404);
  });

  it('delegates remote URLs and waits for those requests to settle', async () => {
    type WindowResponse = Awaited<ReturnType<Window['fetch']>>;
    let resolveRequest!: (response: WindowResponse) => void;
    const remoteResponse = new Promise<WindowResponse>(resolve => {
      resolveRequest = resolve;
    });
    const networkFetch: Window['fetch'] = vi.fn(() => remoteResponse);
    window.fetch = networkFetch;
    const waitUntilIdle = installPrerenderFetch(window, staticRoot);

    const request = window.fetch('https://content.example/guide.md');
    let hasSettled = false;
    const idle = waitUntilIdle().then(() => {
      hasSettled = true;
    });
    await Promise.resolve();

    expect(hasSettled).toBe(false);
    resolveRequest(new window.Response('# Remote'));
    await idle;

    expect(networkFetch).toHaveBeenCalledOnce();
    await expect(request.then(response => response.text())).resolves.toBe('# Remote');
  });

  it('stops waiting at the deadline and keeps every request from the page after close', async () => {
    let resolveRequest!: (response: Response) => void;
    window.fetch = vi.fn(() => new Promise(resolve => {
      resolveRequest = resolve as (response: Response) => void;
    })) as unknown as Window['fetch'];
    const waitUntilIdle = installPrerenderFetch(window, staticRoot);
    const settledRequests: string[] = [];
    const track = (name: string, request: Promise<unknown>) => void request.then(
      () => settledRequests.push(name),
      () => settledRequests.push(name)
    );
    track('in-flight', window.fetch('https://content.example/slow.md'));

    await expect(waitUntilIdle(performance.now() + 20)).resolves.toBe(true);
    waitUntilIdle.close();
    track('late', window.fetch('/late.md'));
    resolveRequest(new window.Response('# Slow') as unknown as Response);
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(settledRequests).toEqual([]);
    await expect(waitUntilIdle()).resolves.toBe(false);
  });

  it('reports whether it waited for a pending request', async () => {
    await writeFile(join(staticRoot, 'pending.md'), '# Pending');
    const waitUntilIdle = installPrerenderFetch(window, staticRoot);

    await expect(waitUntilIdle()).resolves.toBe(false);
    const request = window.fetch('/pending.md');
    await expect(waitUntilIdle()).resolves.toBe(true);
    await expect(waitUntilIdle()).resolves.toBe(false);
    await request;
  });
});
