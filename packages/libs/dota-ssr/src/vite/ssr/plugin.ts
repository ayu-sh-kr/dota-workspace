import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createConsola, LogLevels} from 'consola';
import type {Plugin, ResolvedConfig, ViteDevServer} from 'vite';
import {toNodeListener} from '../../ssr/node-listener';
import type {ApplicationHandler, PageRoute, RequestHandler} from '../../ssr/types';
import {prepareServerDeployment} from '../deployment/server';
import {buildServerBundle, ownModule, readServerRoutes} from './server-build';
import type {DotaSsrOptions} from './types';

/** `mode: 'ssr'` as written in `@Route` or emitted into the preloader's route config. */
const SSR_MODE = /\bmode\s*:\s*(['"])ssr\1/;
const ROUTE_METADATA_MODULE = 'virtual:dota-route-metadata';

/** The parts of `@ayu-sh-kr/dota-ssr/server` the dev middleware loads through Vite. */
type ServerModule = {
  createApplicationHandler: (loadEntry: () => Promise<unknown>, options: object) => ApplicationHandler;
  resolveServerRoutes: (application: unknown) => PageRoute[];
};

/**
 * Request-time rendering for `@Route({mode: 'ssr'})` routes, with no server code to write.
 * - `vite dev`: middleware renders `ssr` routes; everything else is served by Vite as before.
 * - `vite build`: after the client build, a server bundle is built from the same config and
 *   the deployment target's files are written (see `prepareServerDeployment`).
 * Builds whose sources never declare `mode: 'ssr'` skip the server build entirely.
 * @param options Entry, deployment target, and output settings.
 */
export function dotaSsr(options: DotaSsrOptions = {}): Plugin {
  const logger = createConsola({level: LogLevels[options.logType ?? 'info'], formatOptions: {date: true, colors: true}});
  let config: ResolvedConfig;
  let declaresServerRoutes = false;
  /** The built shell as Vite wrote it, captured before SSG replaces it with the prerendered home page. */
  let builtShell: string | undefined;

  return {
    name: 'vite-plugin-dota-ssr',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    transform(code, id) {
      if (!declaresServerRoutes && !/[/\\](node_modules|dist)[/\\]/.test(id) && SSR_MODE.test(code)) declaresServerRoutes = true;
      return null;
    },
    writeBundle(_options, bundle) {
      const shell = bundle[options.template ?? 'index.html'];
      if (shell?.type === 'asset') builtShell = String(shell.source);
    },
    configureServer(server) {
      installDevMiddleware(server, options, logger);
    },
    closeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        if (config.command !== 'build' || config.build.ssr || options.deployment === false) return;
        if (!declaresServerRoutes) {
          logger.debug('[dota-ssr] no route declares mode: \'ssr\'; skipping the server build');
          return;
        }
        const target = options.deployment ?? 'node';
        const root = options.root ?? config.root;
        const outputDirectory = resolve(root, config.build.outDir);
        const template = builtShell ?? await readFile(resolve(outputDirectory, options.template ?? 'index.html'), 'utf8');
        logger.start(`[dota-ssr] building the server for ${target}`);
        const started = performance.now();
        const bundleFile = await buildServerBundle(config, root, options, target, template);
        const built = performance.now();
        const routes = await readServerRoutes(bundleFile);
        logger.info(`[dota-ssr] server bundle built in ${(built - started).toFixed(0)}ms; application read in ${(performance.now() - built).toFixed(0)}ms`);
        if (routes.length === 0) {
          logger.info('[dota-ssr] the application has no ssr routes; no server output written');
          return;
        }
        logger.info(`[dota-ssr] server-rendered routes: ${routes.join(', ')}`);
        await prepareServerDeployment(target, {root, outputDirectory, bundleFile, shell: template, routes, base: config.base, options}, logger);
      }
    }
  };
}

/**
 * Renders `ssr` routes in the dev server. The application is captured through Vite's own
 * module graph (so it shares one Dota Core with the components) on the first page request
 * after any file change; an application without `ssr` routes then passes every request on.
 * If capture fails, for example because the entry has browser-only module code, server
 * rendering is off until the next change.
 */
function installDevMiddleware(server: ViteDevServer, options: DotaSsrOptions, logger: ReturnType<typeof createConsola>): void {
  const root = options.root ?? server.config.root;
  const entryFile = resolve(root, (options.entry ?? '/src/main.ts').replace(/^[/\\]+/, ''));
  const templateFile = resolve(root, 'index.html');
  let handler: Promise<RequestHandler | undefined> | undefined;
  // After a capture finds no `ssr` routes, only a change that could add one recaptures,
  // so client-only applications pay for one capture per dev session.
  let foundNoServerRoutes = false;
  const invalidate = async (file: string) => {
    if (foundNoServerRoutes && !SSR_MODE.test(await readFile(file, 'utf8').catch(() => ''))) return;
    foundNoServerRoutes = false;
    handler = undefined;
  };
  for (const event of ['change', 'add', 'unlink']) server.watcher.on(event, (file: string) => void invalidate(file));

  const createHandler = async (): Promise<RequestHandler | undefined> => {
    const ssr = await server.ssrLoadModule(ownModule('server')) as ServerModule;
    const application = ssr.createApplicationHandler(() => server.ssrLoadModule(entryFile), {
      hydration: options.hydration,
      template: async (url: URL) => server.transformIndexHtml(`${url.pathname}${url.search}`, await readFile(templateFile, 'utf8'))
    });
    const routes = ssr.resolveServerRoutes(await application.application());
    foundNoServerRoutes = routes.length === 0;
    if (foundNoServerRoutes) return undefined;
    logger.info(`[dota-ssr] rendering on the server in dev: ${routes.map((route) => route.path).join(', ')}`);
    return application;
  };

  // The preloader's metadata misses routes outside `*.page.ts` and explicit `routes`, so it
  // cannot rule SSR out; it only decides whether a failed capture deserves a warning.
  const declaresServerRoutes = async () => {
    const metadata = await server.ssrLoadModule(ROUTE_METADATA_MODULE).catch(() => undefined) as {routeMetadata?: Array<{mode?: string}>} | undefined;
    return metadata?.routeMetadata?.some((route) => route.mode === 'ssr') ?? true;
  };

  server.middlewares.use(async (request, response, next) => {
    if ((request.method !== 'GET' && request.method !== 'HEAD') || !request.headers.accept?.includes('text/html')) return next();
    handler ??= createHandler().catch(async (error: unknown) => {
      const message = `[dota-ssr] server rendering is off until the next change: ${error instanceof Error ? error.message : String(error)}`;
      if (await declaresServerRoutes()) logger.warn(message);
      else logger.debug(message);
      return undefined;
    });
    const active = await handler;
    if (!active) return next();
    await toNodeListener(active)(request, response, (error?: unknown) => {
      if (error instanceof Error) server.ssrFixStacktrace(error);
      next(error);
    });
  });
}
