// @vitest-environment node
import {ServerCustomElementRegistry, ServerElement} from '@dota/index';
import {runInBrowserScope} from '@dota/node/index';

describe('runInBrowserScope', () => {
  it('exposes request-backed globals only while a scope is active', async () => {
    const seen = await runInBrowserScope(new URL('http://example.test/docs?x=1#top'), async () => ({
      window: window === globalThis,
      href: location.href,
      search: document.location.search,
      element: document.createElement('section') instanceof Element,
      media: matchMedia('(prefers-color-scheme: dark)').matches,
      style: getComputedStyle(ServerElement.create('div') as unknown as Element).getPropertyValue('color')
    }));

    expect(seen).toEqual({window: true, href: 'http://example.test/docs?x=1#top', search: '?x=1', element: true, media: false, style: ''});
    expect(typeof window).toBe('undefined');
    expect('location' in globalThis).toBe(false);
  });

  it('gives each concurrent request its own document, storage, and window events', async () => {
    const render = (path: string) => runInBrowserScope(new URL(`http://localhost${path}`), async () => {
      const heard = vi.fn();
      addEventListener('ping', heard);
      document.title = path;
      sessionStorage.setItem('path', path);
      await new Promise((resolve) => setTimeout(resolve, path === '/slow' ? 5 : 0));
      dispatchEvent(new Event('ping'));
      return [location.pathname, document.title, sessionStorage.getItem('path'), sessionStorage.length, heard.mock.calls.length];
    });

    const [slow, fast] = await Promise.all([render('/slow'), render('/fast')]);

    expect(slow).toEqual(['/slow', '/slow', '/slow', 1, 1]);
    expect(fast).toEqual(['/fast', '/fast', '/fast', 1, 1]);
  });

  it('keeps globals installed until the last overlapping scope ends', async () => {
    let releaseOuter!: () => void;
    const outer = runInBrowserScope(new URL('http://localhost/outer'), () => new Promise<void>((resolve) => releaseOuter = resolve));

    await runInBrowserScope(new URL('http://localhost/inner'), async () => undefined);
    const stillInstalled = typeof document;
    releaseOuter();
    await outer;

    expect(stillInstalled).toBe('object');
    expect(typeof document).toBe('undefined');
  });

  it('never replaces a global that already exists', async () => {
    const existing = {pathname: '/mine'};
    Object.defineProperty(globalThis, 'location', {configurable: true, writable: true, value: existing});
    try {
      const pathname = await runInBrowserScope(new URL('http://localhost/request'), async () => location.pathname);

      expect(pathname).toBe('/mine');
      expect(globalThis.location).toBe(existing);
    } finally {
      delete (globalThis as {location?: unknown}).location;
    }
  });
});

describe('ServerCustomElementRegistry', () => {
  it('defines names once, resolves whenDefined, and validates names', async () => {
    const registry = new ServerCustomElementRegistry();
    class Card extends ServerElement {}
    const defined = registry.whenDefined('x-card');

    registry.define('x-card', Card as unknown as CustomElementConstructor);

    await expect(defined).resolves.toBe(Card);
    expect(registry.get('x-card')).toBe(Card);
    expect(registry.getName(Card as unknown as CustomElementConstructor)).toBe('x-card');
    expect(() => registry.define('x-card', class extends ServerElement {} as unknown as CustomElementConstructor)).toThrow('has already been used');
    expect(() => registry.define('card', class extends ServerElement {} as unknown as CustomElementConstructor)).toThrow('not a valid custom element name');
  });
});
