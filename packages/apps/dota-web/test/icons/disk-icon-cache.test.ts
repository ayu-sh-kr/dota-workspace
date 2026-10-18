// @vitest-environment node
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DiskIconCache} from '../../build/icons/disk-icon-cache';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>';
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(resolve(tmpdir(), 'dota-icon-cache-'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(directory, {recursive: true, force: true});
});

describe('DiskIconCache', () => {
  it('rejects path traversal without reading or fetching the supplied path', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');

    expect(await new DiskIconCache(directory).get('../secret')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not cache an error page and retries a cold failure after its cooldown', async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('<html/>'));
    const cache = new DiskIconCache(directory);

    expect(await cache.get('mdi:home')).toBeNull();
    expect(await cache.get('mdi:home')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(now + 60_001);
    fetch.mockResolvedValueOnce(new Response(SVG));
    expect(await cache.get('mdi:home')).toBe(SVG);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('serves stale disk entries offline without extending their expiry', async () => {
    await writeFile(resolve(directory, 'mdi--home.json'), JSON.stringify({svg: SVG, expiresAt: 1}));
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    expect(await new DiskIconCache(directory).get('mdi:home')).toBe(SVG);
    expect(JSON.parse(await readFile(resolve(directory, 'mdi--home.json'), 'utf8')).expiresAt).toBe(1);
  });

  it('persists an upstream-wide Retry-After across cache instances', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', {
      status: 429,
      headers: {'retry-after': '120'},
    }));

    expect(await new DiskIconCache(directory).get('mdi:home')).toBeNull();
    expect(await new DiskIconCache(directory).get('mdi:github')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await readFile(resolve(directory, 'retry-after.json'), 'utf8'))).toBeGreaterThan(Date.now() + 119_000);
  });

  it('refreshes expired entries and shares concurrent requests', async () => {
    await writeFile(resolve(directory, 'mdi--home.json'), JSON.stringify({svg: '<svg><circle/></svg>', expiresAt: 1}));
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));
    const cache = new DiskIconCache(directory);

    expect(await Promise.all([cache.get('mdi:home'), cache.get('mdi:home')])).toEqual([SVG, SVG]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://api.iconify.design/mdi:home.svg', expect.objectContaining({signal: expect.any(AbortSignal)}));
    expect(JSON.parse(await readFile(resolve(directory, 'mdi--home.json'), 'utf8')).expiresAt).toBeGreaterThan(Date.now());
  });

  it('reuses fresh disk files after the server/cache instance restarts', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));
    await new DiskIconCache(directory).get('mdi:home');

    expect(await new DiskIconCache(directory).get('mdi:home')).toBe(SVG);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('renders downloaded SVGs even if the disk cache cannot be written', async () => {
    const blockedDirectory = resolve(directory, 'read-only');
    await writeFile(blockedDirectory, 'a file cannot contain cache files');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SVG));

    expect(await new DiskIconCache(blockedDirectory).get('mdi:home')).toBe(SVG);
  });
});
