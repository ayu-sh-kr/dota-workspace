import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Worker} from 'node:worker_threads';
import {build, type Plugin, type ResolvedConfig} from 'vite';
import {loadApplicationConfig} from '../application-config';
import type {DotaServerTarget, DotaSsrOptions} from './types';

const SERVER_ENTRY = 'virtual:dota-ssr-server';
const TEMPLATE_MODULE = 'virtual:dota-ssr-template';
const ROUTE_READ_TIMEOUT = 30_000;

/**
 * Absolute path of one of this package's ESM entries (`server`, `node`). Apps may not be
 * able to resolve `@ayu-sh-kr/dota-ssr` themselves (pnpm only exposes direct
 * dependencies), and the ESM build is required so the server bundle shares one copy of
 * Dota Core with the application.
 */
export function ownModule(entry: 'server' | 'node'): string {
  return createRequire(import.meta.url).resolve(`@ayu-sh-kr/dota-ssr/${entry}`).replace(/\.cjs$/, '.mjs');
}

/**
 * Source of the server entry: a lazily capturing handler for the application entry, the
 * `ssr` route list for platform configuration, and, for Node, the HTTP host.
 * @param entryFile Absolute application entry.
 * @param target Deployment target; only `node` bundles the HTTP host.
 */
export function serverEntrySource(entryFile: string, target: DotaServerTarget, hydration: boolean): string {
  return [
    `import {createApplicationHandler, resolveServerRoutes} from ${JSON.stringify(ownModule('server'))};`,
    `import template from ${JSON.stringify(TEMPLATE_MODULE)};`,
    `export const handler = createApplicationHandler(() => import(${JSON.stringify(entryFile)}), {template, hydration: ${hydration}});`,
    'export const serverRoutes = async () => resolveServerRoutes(await handler.application()).map((route) => route.path);',
    ...(target === 'node' ? [`export {createNodeServer} from ${JSON.stringify(ownModule('node'))};`] : [])
  ].join('\n');
}

/**
 * Builds a self-contained server bundle (one ESM file, dependencies inlined) from the
 * application's own Vite config, so transforms, aliases, and preloader modules match the
 * client build. Workers get a `webworker` build that leaves `node:` imports to the platform.
 * @param config Resolved config of the client build.
 * @param template Built `index.html`, embedded as the document shell.
 * @returns Absolute path of the bundle.
 */
export async function buildServerBundle(config: ResolvedConfig, root: string, options: DotaSsrOptions, target: DotaServerTarget, template: string): Promise<string> {
  const application = await loadApplicationConfig(config, root, 'build');
  const outDir = resolve(config.cacheDir, 'dota-ssr-server');
  const entryFile = resolve(root, (options.entry ?? '/src/main.ts').replace(/^[/\\]+/, ''));
  const entryPlugin: Plugin = {
    name: 'vite-plugin-dota-ssr-server-entry',
    enforce: 'pre',
    // Vite passes the SSR input as a root-relative path, so match on the name's suffix.
    resolveId: (id) => [SERVER_ENTRY, TEMPLATE_MODULE].find((name) => id === name || id.endsWith(`/${name}`)) && `\0${id.slice(id.lastIndexOf('virtual:'))}`,
    load(id) {
      if (id === `\0${SERVER_ENTRY}`) return serverEntrySource(entryFile, target, options.hydration ?? true);
      if (id === `\0${TEMPLATE_MODULE}`) return `export default ${JSON.stringify(template)};`;
      return null;
    }
  };

  await build({
    ...application.config,
    configFile: false,
    root,
    mode: config.mode,
    base: config.base,
    logLevel: 'warn',
    publicDir: false,
    plugins: [...application.plugins, entryPlugin],
    // Self-contained on purpose: the bundle is copied to platform directories where the
    // application's node_modules (and so any `ssr.external` package) cannot be resolved.
    ssr: {...application.config.ssr, external: [], noExternal: true, target: target === 'cloudflare-pages' ? 'webworker' : 'node'},
    build: {
      ...application.config.build,
      ssr: SERVER_ENTRY,
      outDir,
      emptyOutDir: true,
      copyPublicDir: false,
      ssrEmitAssets: false,
      target: 'es2022',
      minify: false,
      sourcemap: false,
      rolldownOptions: {
        external: [/^node:/],
        output: {format: 'es', entryFileNames: 'index.mjs', codeSplitting: false}
      }
    }
  });
  return resolve(outDir, 'index.mjs');
}

/**
 * Reads the `ssr` route paths by running the bundle once, in a worker so the
 * application's module-level state and the server globals stay out of the build process.
 * @param bundleFile Server bundle from {@link buildServerBundle}.
 * @throws Error when the application cannot be captured.
 */
export function readServerRoutes(bundleFile: string): Promise<string[]> {
  const source = `
    const {parentPort} = require('node:worker_threads');
    import(${JSON.stringify(pathToFileURL(bundleFile).href)})
      .then(async (bundle) => parentPort.postMessage({routes: await bundle.serverRoutes()}))
      .catch((error) => parentPort.postMessage({error: String(error && error.stack || error)}));`;
  return new Promise((resolveRoutes, reject) => {
    const worker = new Worker(source, {eval: true});
    const timer = setTimeout(() => finish(new Error('Timed out reading server routes from the server bundle')), ROUTE_READ_TIMEOUT);
    const finish = (error?: Error, routes?: string[]) => {
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error);
      else resolveRoutes(routes ?? []);
    };
    worker.once('message', (message: {routes?: string[]; error?: string}) =>
      message.error ? finish(new Error(`Unable to load the application for server rendering:\n${message.error}`)) : finish(undefined, message.routes));
    worker.once('error', (error) => finish(error));
  });
}
