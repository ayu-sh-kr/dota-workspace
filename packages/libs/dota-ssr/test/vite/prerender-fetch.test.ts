// @vitest-environment node
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Window} from 'happy-dom';
import {installPrerenderFetch} from '@dota/vite/prerender-fetch';

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
    await expect(waitUntilIdle()).resolves.toBeUndefined();
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
});
