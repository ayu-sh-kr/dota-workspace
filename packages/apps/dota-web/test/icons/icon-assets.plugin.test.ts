// @vitest-environment node
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {build, createServer} from 'vite';
import {iconAssets} from '../../build/icons/icon-assets.plugin';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>';
const nativeFetch = globalThis.fetch;
let directory: string;
let root: string;

beforeEach(async () => {
  directory = await mkdtemp(resolve(tmpdir(), 'dota-icon-assets-'));
  root = resolve(directory, 'packages/apps/dota-web');
  await mkdir(resolve(root, 'src'), {recursive: true});
  await mkdir(resolve(root, 'public'), {recursive: true});
  await mkdir(resolve(root, '../../ui/dota-ui/src'), {recursive: true});
  await writeFile(resolve(root, 'index.html'), '<html><body><script type="module" src="/src/main.ts"></script></body></html>');
  await writeFile(resolve(root, 'src/main.ts'), 'document.body.textContent = "mdi:github";');
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(directory, {recursive: true, force: true});
});

describe('iconAssets', () => {
  it('builds icons from the installed sets without network access', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await writeFile(resolve(root, 'public/example.md'), '<dota-icon name="material-symbols:dark-mode"></dota-icon>');
    await writeFile(resolve(root, '../../ui/dota-ui/src/default.ts'), 'export const icon = "mdi:home";');

    await build({configFile: false, root, logLevel: 'silent', plugins: [iconAssets()]});

    for (const name of ['mdi:github', 'mdi:home', 'material-symbols:dark-mode']) {
      const svg = await readFile(resolve(root, `dist/assets/icons/${name}.svg`), 'utf8');
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1em" height="1em" viewBox="[\d. ]+">/);
      expect(svg).toContain('fill="currentColor"');
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('falls back to the disk cache for names missing from the installed sets and reuses it', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(SVG));
    await writeFile(resolve(root, 'src/main.ts'), 'document.body.textContent = "mdi:not-in-the-set";');

    await build({configFile: false, root, logLevel: 'silent', plugins: [iconAssets()]});
    await build({configFile: false, root, logLevel: 'silent', plugins: [iconAssets()]});

    expect(await readFile(resolve(root, 'dist/assets/icons/mdi:not-in-the-set.svg'), 'utf8')).toBe(SVG);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('serves dev icons from the installed sets, and other names from the disk cache, under the base path', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(SVG));
    const server = await createServer({
      configFile: false,
      root,
      base: '/docs/',
      logLevel: 'silent',
      plugins: [iconAssets()],
      server: {port: 0, host: '127.0.0.1'},
    });
    try {
      await server.listen();
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
      const origin = `http://127.0.0.1:${address.port}/docs/assets/icons`;
      const local = await nativeFetch(`${origin}/mdi:github.svg`);
      expect(local.status).toBe(200);
      expect(await local.text()).toContain('viewBox="0 0 24 24"');
      expect(fetch).not.toHaveBeenCalled();

      const url = `${origin}/simple-icons:github.svg`;
      const response = await nativeFetch(url);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('public, max-age=604800');
      expect(await response.text()).toBe(SVG);
      expect(await (await nativeFetch(url)).text()).toBe(SVG);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
  });
});
