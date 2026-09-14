import {isAbsolute, resolve} from 'node:path';
import type {Plugin, ResolvedConfig, ViteDevServer} from 'vite';
import {createServer, loadConfigFromFile} from 'vite';
import {resolveDecoratedSsgRoutes} from '../ssg/route-output';
import type {DotaDecoratedRoute, DotaSsgOptions, DotaSsgRouteInput, ResolvedDotaSsgRoute} from '../ssg/types';

/** Shared entry identifier tying Vite's hydration preamble to route execution. */
export const VIRTUAL_SSG_ENTRY = 'virtual:dota-ssg-entry';
const RESOLVED_VIRTUAL_SSG_ENTRY = `\0${VIRTUAL_SSG_ENTRY}`;
const VIRTUAL_DOTA_ROUTE_METADATA = 'virtual:dota-route-metadata';
/** Unvalidated preloader export checked before static route resolution. */
type RouteMetadataModule = {routeMetadata?: unknown};

/**
 * Creates an isolated Vite runner, retaining transforms but excluding Dota metadata writers.
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
export async function createPrerenderServer(
  config: Pick<ResolvedConfig, 'configFile' | 'mode'>,
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

  // The client build already owns generated metadata; renderers only need runtime transforms.
  const loadedConfig = config.configFile
    ? (await loadConfigFromFile({command: 'serve', mode: config.mode}, config.configFile, root))?.config
    : undefined;
  const excludedPlugins = new Set(['vite-plugin-event-map-generator', 'vite-plugin-dota-web-type-json']);
  const plugins: Plugin[] = [];
  const pendingPlugins = [...(loadedConfig?.plugins ?? [])];
  while (pendingPlugins.length) {
    const plugin = await pendingPlugins.shift();
    if (Array.isArray(plugin)) pendingPlugins.unshift(...plugin);
    else if (plugin && !excludedPlugins.has(plugin.name)) plugins.push(plugin);
  }
  const server = await createServer({
    ...loadedConfig,
    configFile: config.configFile ? false : config.configFile,
    root,
    mode: config.mode,
    appType: 'custom',
    optimizeDeps: {noDiscovery: true, include: []},
    server: {...loadedConfig?.server, middlewareMode: true, hmr: false, ws: false, watch: null},
    ssr: {
      ...loadedConfig?.ssr,
      noExternal: loadedConfig?.ssr?.noExternal === true ? true : [
        /^@ayu-sh-kr\/dota-/,
        ...[loadedConfig?.ssr?.noExternal ?? []].flat()
      ]
    },
    plugins: [...plugins, virtualEntryPlugin]
  });
  const importer = resolve(root, 'src/main.ts');
  try {
    const renderingPackage = await server.pluginContainer.resolveId(renderingModule, importer, {ssr: true});
    if (!renderingPackage) throw new Error('Unable to resolve @ayu-sh-kr/dota-rendering for the SSG module graph');
    renderingEntryUrl = renderingPackage.id;
    return server;
  } catch (error) {
    await server.close();
    throw error;
  }
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
export async function resolveDecoratedRoutes(
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
