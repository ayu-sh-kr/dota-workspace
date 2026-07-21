import {afterEach, describe, expect, it, vi} from 'vitest';
import {IconsComponent} from '@dota/components/icon/icons.component.ts';

if (!customElements.get('dota-icon-test')) customElements.define('dota-icon-test', IconsComponent);
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const render = (props: Partial<IconsComponent> = {}) => {
  const el = document.createElement('dota-icon-test') as IconsComponent;
  Object.assign(el, props);
  el.innerHTML = el.render();
  document.body.append(el);
  return el;
};
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('IconsComponent', () => {
  it('renders a decorative root by default and falls back invalid style tokens', () => {
    const el = render({
      name: 'mdi:home',
      size: 'invalid' as never,
      color: 'invalid' as never,
      variant: 'invalid' as never
    });
    const root = el.querySelector('[data-icon-root]')!;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.className).toContain('inline-flex');
  });
  it('fetches and sanitizes SVG markup, removing executable and external content', async () => {
    const fetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('<svg class="bad" onload="x"><script>alert(1)</script><use href="https://evil.test/x"/><path/></svg>', {
      status: 200,
      headers: {'content-type': 'image/svg+xml'}
    }));
    const el = render({name: 'mdi:sanitize-test', ariaLabel: 'Home', color: 'blue', size: 'lg'});
    el.onConnected();
    await flush();
    const svg = el.querySelector('svg')!;
    expect(fetch).toHaveBeenCalled();
    expect(svg).not.toBeNull();
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.getAttribute('onload')).toBeNull();
    expect(svg.querySelector('use')?.getAttribute('href')).toBeNull();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Home');
  });
  it('clears invalid names, handles failed responses, and ignores malformed fetch results', async () => {
    const fetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('not-svg', {status: 200}));
    const invalid = render({name: 'not-an-icon'});
    invalid.onConnected();
    expect(invalid.querySelector('[data-icon-root]')?.innerHTML).toBe('');
    const failed = render({name: 'mdi:missing'});
    fetch.mockResolvedValueOnce(new Response('', {status: 404}));
    failed.onConnected();
    await flush();
    expect(failed.querySelector('svg')).toBeNull();
  });
  it('does not let a stale request overwrite a newer icon name', async () => {
    let resolveOld!: (response: Response) => void;
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(new Promise(resolve => {
      resolveOld = resolve;
    }));
    const el = render({name: 'mdi:old'});
    const oldLoad = el.onConnected();
    el.name = 'mdi:new';
    fetch.mockResolvedValueOnce(new Response('<svg><path/></svg>', {status: 200}));
    el.onConnected();
    resolveOld(new Response('<svg><circle/></svg>', {status: 200}));
    await oldLoad;
    await flush();
    expect(el.querySelector('circle')).toBeNull();
  });

  it('logs a network failure and leaves the icon root empty', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetch = vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const el = render({name: 'mdi:network-failure-test'});

    el.onConnected();
    await flush();

    expect(fetch).toHaveBeenCalledWith('https://api.iconify.design/mdi:network-failure-test.svg');
    expect(el.querySelector('svg')).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      '[dota-icon] Could not load "mdi:network-failure-test".',
      expect.any(Error),
    );
  });
});
