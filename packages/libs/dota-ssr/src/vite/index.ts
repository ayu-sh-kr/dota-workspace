import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, resolve} from 'node:path';
import {Window} from 'happy-dom';
import {createConsola, LogLevels} from 'consola';
import type {Plugin, ResolvedConfig, ViteDevServer} from 'vite';
import {createServer} from 'vite';
import {installPrerenderFetch} from './prerender-fetch';
import {resolveDecoratedSsgRoutes, resolveSsgRoutes} from './route-output';
import type {DotaDecoratedRoute, DotaSsgOptions, DotaSsgRouteInput, ResolvedDotaSsgRoute} from './types';
import {updateVercelConfig} from './vercel-config';
import {installWindowGlobals} from './window-globals';
import {
  HYDRATION_ROUTE_ATTRIBUTE,
  HYDRATION_ROUTE_VERSION_ATTRIBUTE,
  HYDRATION_ROUTE_VERSION
} from '../route-marker';

const VIRTUAL_SSG_ENTRY = 'virtual:dota-ssg-entry';
const RESOLVED_VIRTUAL_SSG_ENTRY = `\0${VIRTUAL_SSG_ENTRY}`;
const VIRTUAL_DOTA_ROUTE_METADATA = 'virtual:dota-route-metadata';
/** Runtime shape exported by the preloader's metadata-only virtual module. */
type RouteMetadataModule = {
  /** Unvalidated route metadata checked before it enters SSG route resolution. */
  routeMetadata?: unknown;
};

/** Application namespace loaded from the configured SSG entry module. */
type SsgApplicationModule = Record<string, unknown>;

/** Virtual SSG preamble exports used to control marker emission around one render. */
type SsgEntryModule = {
  /** Restores client-default marker emission after the route window is disposed. */
  disableHydrationEmit: () => void;
  /** Application exports, including the configured readiness promise. */
  default: SsgApplicationModule;
};

export type {
  DotaSsgOptions,
  DotaDecoratedRoute,
  DotaSsgRoute,
  DotaSsgRouteInput,
  DotaSsgVercelOptions,
  ResolvedDotaSsgRoute
} from './types';
export {resolveDecoratedSsgRoutes, resolveSsgRoutes} from './route-output';

/**
 * Creates the build-only happy-dom prerender extension for a Dota application.
 * It runs only after Vite produces the client bundle, preserving the normal SPA build
 * unless callers configure it and pass `--ssg` to the build command. Each resolved route
 * receives an isolated window so application globals and component registrations cannot
 * leak between HTML outputs.
 * @param options Route selection, entry, readiness, shell, and optional Vercel configuration.
 * @returns A post-build Vite plugin that writes marked static route documents.
 */
export default function dotaSsg(options: DotaSsgOptions): Plugin {
  let config: ResolvedConfig;
  const logType = options.logType ?? 'info';
  const logger = createConsola({
    level: LogLevels[logType],
    formatOptions: {date: true, colors: true}
  });

  return {
    name: 'vite-plugin-dota-ssg',
    apply(_config, environment) {
      return environment.command === 'build' && process.argv.includes('--ssg');
    },
    enforce: 'post',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async closeBundle() {
      const root = options.root ?? config.root;
      const outputDirectory = resolve(root, config.build.outDir);
      const templateFile = resolve(outputDirectory, options.template ?? 'index.html');
      const template = await readFile(templateFile, 'utf8');
      const server = await createPrerenderServer(
        config,
        root,
        options.entry ?? '/src/main.ts',
        options.renderingModule ?? '@ayu-sh-kr/dota-rendering',
        logType
      );
      try {
        const routes = options.autoDetectRoutes
          ? await resolveDecoratedRoutes(server, options.routes)
          : resolveSsgRoutes(options.routes ?? []);
        logger.start(`[dota-ssr] prerendering ${routes.length} route${routes.length === 1 ? '' : 's'}`);
        for (const route of routes) {
          logger.debug('[dota-ssr] prerendering route', route.path);
          const html = await prerenderRoute(server, template, route, outputDirectory, options);
          const outputFile = resolve(outputDirectory, route.output);
          await mkdir(dirname(outputFile), {recursive: true});
          await writeFile(outputFile, html, 'utf8');
        }
        if (options.vercel) {
          await updateVercelConfig(root, routes, options.vercel === true ? {} : options.vercel);
        }
        logger.success(`[dota-ssr] prerendered ${routes.length} route${routes.length === 1 ? '' : 's'}`);
      } finally {
        await server.close();
      }
    }
  };
}

/**
 * Loads metadata-only route declarations without evaluating page component modules.
 * The runtime check protects the SSG plugin from a stale or incompatible preloader
 * virtual module before its values are treated as decorated route contracts.
 * @param server Isolated Vite server that resolves the preloader virtual module.
 * @param routes Explicit routes that override matching decorated paths.
 * @returns Validated, normalized routes selected for the current build.
 * @throws Error when the preloader does not expose a route metadata array.
 */
async function resolveDecoratedRoutes(
  server: ViteDevServer,
  routes: readonly DotaSsgRouteInput[] | undefined
): Promise<ResolvedDotaSsgRoute[]> {
  const loaded = await server.ssrLoadModule(VIRTUAL_DOTA_ROUTE_METADATA, {fixStacktrace: true}) as RouteMetadataModule;
  const decoratedRoutes = loaded.routeMetadata;
  if (!Array.isArray(decoratedRoutes)) {
    throw new Error(`${VIRTUAL_DOTA_ROUTE_METADATA} must export a routeMetadata array for SSG autodetection`);
  }
  return resolveDecoratedSsgRoutes(decoratedRoutes as DotaDecoratedRoute[], routes);
}

/**
 * Creates an isolated Vite module runner while retaining the application's configured plugins.
 * Its virtual preamble enables durable rendering markers before the application loads, so the
 * client bundle and prerender use one transformed dependency graph rather than separate runtimes.
 * @param config Resolved build configuration whose config file supplies application plugins.
 * @param root Vite application root used for source and alias resolution.
 * @param entry Source application entry expressed as a Vite URL or absolute file.
 * @param renderingModule Rendering package or wrapper surface used for the SSG logger bridge.
 * @param logType Logging level used by the prerender server and route renderer.
 * @returns Middleware-mode server used only for route-isolated build-time execution.
 * @throws Error when the rendering package cannot be resolved in the SSR module graph.
 */
async function createPrerenderServer(
  config: ResolvedConfig,
  root: string,
  entry: string,
  renderingModule: string,
  logType: DotaSsgOptions['logType']
): Promise<ViteDevServer> {
  const entryFile = isAbsolute(entry) && entry.startsWith(root)
    ? entry
    : resolve(root, entry.replace(/^[/\\]+/, ''));
  const entryUrl = `/@fs/${entryFile.replaceAll('\\', '/')}`;
  let renderingEntryUrl = '';
  const virtualEntryPlugin: Plugin = {
    name: 'vite-plugin-dota-ssg-entry',
    resolveId(id) {
      return id === VIRTUAL_SSG_ENTRY ? RESOLVED_VIRTUAL_SSG_ENTRY : null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_SSG_ENTRY) return null;
      return `
        import {configureDotaRenderingLogger, setHydrationEmit} from ${JSON.stringify(renderingEntryUrl)};
        configureDotaRenderingLogger(${JSON.stringify(logType)});
        setHydrationEmit(true);
        const application = await import(${JSON.stringify(entryUrl)});
        export const disableHydrationEmit = () => setHydrationEmit(false);
        export default application;
      `;
    }
  };

  const server = await createServer({
    configFile: config.configFile,
    root,
    appType: 'custom',
    server: {middlewareMode: true, hmr: false, watch: null},
    ssr: {noExternal: [/^@ayu-sh-kr\/dota-/]},
    plugins: [virtualEntryPlugin]
  });
  const importer = resolve(root, 'src/main.ts');
  const renderingPackage = await server.pluginContainer.resolveId(
    renderingModule,
    importer,
    {ssr: true}
  );
  if (!renderingPackage) {
    await server.close();
    throw new Error('Unable to resolve @ayu-sh-kr/dota-rendering for the SSG module graph');
  }
  renderingEntryUrl = renderingPackage.id;
  return server;
}

/**
 * Executes one route in a fresh browser realm and serializes its settled document.
 * Module caches are invalidated before loading the entry so constructors bind to the current
 * window; cleanup then restores process globals even when readiness or application code fails.
 * @param server Vite SSR module runner configured with the application's transforms.
 * @param template Built client HTML shell containing production asset references.
 * @param route Normalized route and safe output mapping.
 * @param outputDirectory Built client directory used to resolve same-origin fetch requests.
 * @param options Plugin options containing readiness and optional settle policy.
 * @returns Complete deterministic HTML document for the route.
 * @throws Error when the configured application readiness export is not a promise.
 */
async function prerenderRoute(
  server: ViteDevServer,
  template: string,
  route: ResolvedDotaSsgRoute,
  outputDirectory: string,
  options: DotaSsgOptions
): Promise<string> {
  const window = createPrerenderWindow(route.path);
  const waitForFetches = installPrerenderFetch(window, outputDirectory, options.fetchBaseUrl);
  const restoreGlobals = installWindowGlobals(window);
  window.document.write(template);
  window.document.close();
  server.moduleGraph.invalidateAll();
  let disableHydrationEmit: (() => void) | undefined;

  try {
    const loaded = await server.ssrLoadModule(VIRTUAL_SSG_ENTRY, {fixStacktrace: true}) as SsgEntryModule;
    disableHydrationEmit = loaded.disableHydrationEmit;
    const application = loaded.default;
    const readyExport = options.readyExport ?? 'applicationReady';
    const ready = application[readyExport];
    if (typeof (ready as PromiseLike<unknown> | undefined)?.then !== 'function') {
      throw new Error(`SSG entry must export a Promise named "${readyExport}"`);
    }
    await ready;
    await settlePrerenderWindow(window, waitForFetches);
    await options.settle?.(window, route);
    await settlePrerenderWindow(window, waitForFetches);
    markPrerenderedRoute(window, route.path);
    return `<!doctype html>\n${window.document.documentElement.outerHTML}\n`;
  } finally {
    try {
      disableHydrationEmit?.();
      await window.happyDOM.close();
    } finally {
      restoreGlobals();
    }
  }
}

/**
 * Marks the route host after application rendering has settled so startup can adopt
 * string-rendered pages that do not carry a template hydration identity.
 * @param window Prerender browser realm containing the settled document.
 * @param pathname Normalized route path represented by the generated document.
 */
function markPrerenderedRoute(window: Window, pathname: string): void {
  const routeHost = Array.from(window.document.querySelectorAll('[path]'))
    .map(element => element as unknown as HTMLElement)
    .find(element => element.getAttribute('path') === pathname && element.parentElement?.localName.includes('-'));
  if (!routeHost) return;

  routeHost.setAttribute(HYDRATION_ROUTE_ATTRIBUTE, 'true');
  routeHost.setAttribute(HYDRATION_ROUTE_VERSION_ATTRIBUTE, HYDRATION_ROUTE_VERSION);
}

/**
 * Re-checks both Happy DOM tasks and tracked fetches before serialization.
 * Fetches can enqueue DOM work after the first task barrier, so each pass waits
 * for both queues twice to include content rendered by asynchronous loaders.
 * @param window Route-isolated Happy DOM window whose task queue is settling.
 * @param waitForFetches Barrier returned by the route fetch adapter.
 */
async function settlePrerenderWindow(window: Window, waitForFetches: () => Promise<void>): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await window.happyDOM.waitUntilComplete();
  await waitForFetches();
  await Promise.resolve();
  await window.happyDOM.waitUntilComplete();
  await waitForFetches();
}

/**
 * Creates a route-isolated browser realm without network-driven resource loading.
 * The synthetic origin gives Dota Router a concrete pathname while disabled loaders keep
 * deterministic build output independent of remote scripts, styles, and iframe content.
 * @param path Normalized application pathname rendered inside the window.
 * @returns Fresh happy-dom window used by exactly one prerendered route.
 */
function createPrerenderWindow(path: string): Window {
  return new Window({
    url: new URL(path, 'http://dota.ssg').href,
    settings: {
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      timer: {preventTimerLoops: true}
    }
  });
}
