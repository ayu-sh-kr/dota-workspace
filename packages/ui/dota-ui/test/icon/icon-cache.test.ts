import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {sanitizeIcon} from '../../src/components/icon/icon-cache';
import {Storage as BrowserStorage} from 'happy-dom';

const URL = 'https://api.iconify.design/mdi:cache-test.svg';
const KEY = `dota:icons:v1:${URL}`;
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>';
const TTL = 7 * 24 * 60 * 60 * 1000;
let localStorage: BrowserStorage;

beforeEach(() => {
  vi.resetModules();
  localStorage = new BrowserStorage();
  vi.stubGlobal('localStorage', localStorage);
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('sanitizeIcon', () => {
  it('rejects malformed markup and strips executable content', () => {
    expect(sanitizeIcon('<html/>')).toBeNull();
    const svg = sanitizeIcon('<svg onload="run()"><script>run()</script><use href="https://evil.test"/><path/></svg>');
    expect(svg).toContain('<path');
    expect(svg).not.toMatch(/onload|script|evil/);
  });
});

describe('loadCachedIcon', () => {
  it('tolerates malformed persistent entries', async () => {
    localStorage.setItem(KEY, '{broken');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));
    const {loadCachedIcon} = await import('../../src/components/icon/icon-cache');

    expect(await loadCachedIcon(URL)).toContain('<path');
    expect(JSON.parse(localStorage.getItem(KEY)!).expiresAt).toBeGreaterThan(Date.now());
  });

  it('continues with memory caching when storage is unavailable', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('full'); });
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));
    const {loadCachedIcon} = await import('../../src/components/icon/icon-cache');

    expect(await loadCachedIcon(URL)).toContain('<path');
    expect(await loadCachedIcon(URL)).toContain('<path');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps stale SVGs and persists Retry-After across page reloads', async () => {
    localStorage.setItem(KEY, JSON.stringify({svg: SVG, expiresAt: Date.now() - 1}));
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', {
      status: 429,
      headers: {'retry-after': '120'},
    }));
    const first = await import('../../src/components/icon/icon-cache');

    expect(await first.loadCachedIcon(URL)).toContain('<path');
    vi.resetModules();
    const reloaded = await import('../../src/components/icon/icon-cache');
    expect(await reloaded.loadCachedIcon(URL)).toContain('<path');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(Number(localStorage.getItem(`${KEY}:retry-after`))).toBeGreaterThan(Date.now() + 119_000);
  });

  it('uses stale SVGs offline without extending their TTL', async () => {
    const expiresAt = Date.now() - 1;
    localStorage.setItem(KEY, JSON.stringify({svg: SVG, expiresAt}));
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const {loadCachedIcon} = await import('../../src/components/icon/icon-cache');

    expect(await loadCachedIcon(URL)).toContain('<path');
    expect(await loadCachedIcon(URL)).toContain('<path');
    expect(JSON.parse(localStorage.getItem(KEY)!).expiresAt).toBe(expiresAt);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('never caches malformed network responses as successful icons', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html/>'));
    const {loadCachedIcon} = await import('../../src/components/icon/icon-cache');

    expect(await loadCachedIcon(URL)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('refreshes expired icons and starts a new seven-day TTL', async () => {
    localStorage.setItem(KEY, JSON.stringify({svg: '<svg><circle/></svg>', expiresAt: Date.now() - 1}));
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));
    const {loadCachedIcon} = await import('../../src/components/icon/icon-cache');

    expect(await loadCachedIcon(URL)).toContain('<path');
    expect(JSON.parse(localStorage.getItem(KEY)!).expiresAt).toBeGreaterThan(Date.now() + TTL - 1000);
    expect(fetch).toHaveBeenCalledWith(URL);
  });

  it('reuses sanitized browser storage after the module is reloaded', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));
    const first = await import('../../src/components/icon/icon-cache');
    await first.loadCachedIcon(URL);
    vi.resetModules();
    const reloaded = await import('../../src/components/icon/icon-cache');

    expect(await reloaded.loadCachedIcon(URL)).toContain('<path');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shares concurrent downloads and sanitizes stored markup before rendering', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));
    const {loadCachedIcon} = await import('../../src/components/icon/icon-cache');

    const results = await Promise.all([loadCachedIcon(URL), loadCachedIcon(URL)]);
    expect(results[0]).toBe(results[1]);
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.resetModules();
    localStorage.setItem(KEY, JSON.stringify({svg: '<svg onload="run()"><path/></svg>', expiresAt: Date.now() + TTL}));
    const reloaded = await import('../../src/components/icon/icon-cache');
    expect(await reloaded.loadCachedIcon(URL)).not.toContain('onload');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
