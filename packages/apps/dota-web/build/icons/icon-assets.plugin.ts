import {glob, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';
import {DiskIconCache, ICON_NAME_PATTERN} from './disk-icon-cache.ts';

// Collections used in site templates/configuration and the shared UI defaults.
const COLLECTIONS = ['mdi', 'ic', 'material-symbols', 'material-symbols-light', 'solar', 'healthicons', 'gridicons', 'emojione-monotone', 'lucide'];
const ASSET_PATH = 'assets/icons/';

/**
 * Publishes locally cached icons as same-origin assets before SSG runs.
 * Dev requests use the same disk cache; production Node/static hosts serve the
 * emitted files without upstream access. TTL refresh happens during each build.
 * @returns App-owned Vite plugin, with disk state outside disposable build output.
 */
export function iconAssets(): Plugin {
  let root: string;
  let base: string;
  let cache: DiskIconCache;
  let isServerBuild = false;
  let isBuild = false;

  return {
    name: 'vite-plugin-dota-web-icon-assets',
    configResolved(config) {
      root = config.root;
      base = config.base;
      cache = new DiskIconCache(resolve(root, '.cache/icons'));
      isServerBuild = Boolean(config.build.ssr);
      isBuild = config.command === 'build';
    },
    async buildStart() {
      // In serve mode the middleware downloads arbitrary names on demand.
      if (!isBuild || isServerBuild) return;
      const names = new Set<string>();
      const pattern = new RegExp(`(?:${COLLECTIONS.join('|')}):[a-z0-9-]+`, 'g');
      for (const directory of [resolve(root, 'src'), resolve(root, 'public'), resolve(root, '../../ui/dota-ui/src')]) {
        for await (const file of glob('**/*.{ts,md,html}', {cwd: directory})) {
          const path = resolve(directory, file);
          this.addWatchFile(path);
          const content = await readFile(path, 'utf8');
          for (const match of content.matchAll(pattern)) names.add(match[0]);
        }
      }
      // Sequential cold downloads avoid a burst of requests at the public API.
      for (const name of [...names].sort()) {
        const svg = await cache.get(name);
        if (!svg) {
          this.warn(`Icon ${name} is unavailable and has no disk cache entry.`);
          continue;
        }
        this.emitFile({type: 'asset', fileName: `${ASSET_PATH}${name}.svg`, source: svg});
      }
    },
    configureServer(server) {
      const prefix = `${base}${ASSET_PATH}`;
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (!pathname.startsWith(prefix)) return next();
        const name = pathname.slice(prefix.length).replace(/\.svg$/, '');
        if (!ICON_NAME_PATTERN.test(name) || !pathname.endsWith('.svg')) {
          response.writeHead(400).end();
          return;
        }
        const svg = await cache.get(name);
        response.writeHead(svg ? 200 : 503, {
          'content-type': svg ? 'image/svg+xml' : 'text/plain',
          'cache-control': svg ? 'public, max-age=604800' : 'no-store',
        }).end(svg ?? 'Icon unavailable');
      });
    },
  };
}
