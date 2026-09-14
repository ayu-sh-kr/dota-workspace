import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {performance as nodePerformance} from 'node:perf_hooks';
import {createConsola, LogLevels} from 'consola';
import type {ResolvedConfig} from 'vite';
import {createPrerenderAssetReader} from './asset-reader';
import {resolveSsgRoutes} from './route-output';
import type {DotaSsgOptions, ResolvedDotaSsgRoute} from './types';
import {prepareDeployment} from '../vite/deployment';
import {createPrerenderServer, resolveDecoratedRoutes} from '../vite/prerender-server';
import {prerenderRoute, type PrerenderTimings} from './prerender-runtime';
import {renderRoutesInWorkers} from './render-workers';

/**
 * Generates static pages after the client bundle has been written.
 * Prepares deployment files only after successful route writes; empty selections still prepare hosting files.
 * Coordinates discovery, isolated rendering, timing logs, and server cleanup on success or failure.
 * @param config Resolved Vite build settings supplying the application root, mode, and output directory.
 * @param options Validated plugin options with explicit concurrency and worker timeout values.
 * @throws When discovery, rendering, output writes, or deployment configuration fails.
 */
export async function generateStaticPages(
  config: ResolvedConfig,
  options: DotaSsgOptions & Required<Pick<DotaSsgOptions, 'concurrency' | 'renderTimeout'>>
): Promise<void> {
  const {concurrency, renderTimeout} = options;
  const logType = options.logType ?? 'info';
  const logger = createConsola({level: LogLevels[logType], formatOptions: {date: true, colors: true}});
  const started = nodePerformance.now();
  const root = options.root ?? config.root;
  const outputDirectory = resolve(root, config.build.outDir);
  if (!options.autoDetectRoutes && !options.routes?.length) {
    await prepareDeployment(root, outputDirectory, [], options, config.base);
    logger.info(`[dota-ssr] no routes selected; SSG finished in ${(nodePerformance.now() - started).toFixed(0)}ms`);
    return;
  }
  const templateFile = resolve(outputDirectory, options.template ?? 'index.html');
  const template = await readFile(templateFile, 'utf8');
  let server = concurrency === 1 || options.autoDetectRoutes ? await createPrerenderServer(
    config,
    root,
    options.entry ?? '/src/main.ts',
    options.renderingModule ?? '@ayu-sh-kr/dota-rendering',
    logType
  ) : undefined;
  try {
    const routes = options.autoDetectRoutes
      ? await resolveDecoratedRoutes(server!, options.routes)
      : resolveSsgRoutes(options.routes ?? []);
    const outputs = routes.map(route => resolve(outputDirectory, route.output));
    const directories = new Map<string, Promise<string | undefined>>();
    const routeTimes: {path: string; total: number}[] = [];
    /**
     * Persists a rendered page before recording timings, so failed writes are not reported as completed routes.
     * Shares directory creation across concurrent workers; per-route durations can overlap in wall time.
     * @param route Validated pathname and relative HTML output below the build directory.
     * @param html Serialized route document ready to publish, including hydration markers.
     * @param timings Renderer stage durations in milliseconds; disk write time is added here.
     * @throws If the output directory cannot be created or the rendered document cannot be written.
     */
    const writeRoute = async (route: ResolvedDotaSsgRoute, html: string, timings: PrerenderTimings): Promise<void> => {
      const writeStarted = nodePerformance.now();
      const outputFile = resolve(outputDirectory, route.output);
      const directory = dirname(outputFile);
      if (!directories.has(directory)) directories.set(directory, mkdir(directory, {recursive: true}));
      await directories.get(directory);
      await writeFile(outputFile, html, 'utf8');
      const writeMs = nodePerformance.now() - writeStarted;
      const total = timings.total + writeMs;
      routeTimes.push({path: route.path, total});
      logger.info(`[dota-ssr] ${route.path}: ${total.toFixed(0)}ms (render ${timings.total.toFixed(0)}ms, write ${writeMs.toFixed(0)}ms)`);
      logger.debug(`[dota-ssr] ${route.path} stages: setup ${timings.setup.toFixed(0)}ms, load ${timings.load.toFixed(0)}ms, ready ${timings.ready.toFixed(0)}ms, settle ${timings.settle.toFixed(0)}ms, serialize ${timings.serialize.toFixed(0)}ms, cleanup ${timings.cleanup.toFixed(0)}ms`);
    };
    const renderingStarted = nodePerformance.now();
    const setupMs = renderingStarted - started;
    const workerCount = Math.min(concurrency, routes.length);
    logger.start(`[dota-ssr] prerendering ${routes.length} routes with ${workerCount} render worker${workerCount === 1 ? '' : 's'}`);
    if (workerCount > 1) {
      await server?.close();
      server = undefined;
      await renderRoutesInWorkers(routes, {
        config: {configFile: config.configFile, mode: config.mode},
        root, template, outputDirectory, outputs,
        options: {
          entry: options.entry, renderingModule: options.renderingModule,
          readyExport: options.readyExport, fetchBaseUrl: options.fetchBaseUrl, logType
        }
      }, workerCount, renderTimeout, writeRoute);
    } else if (routes.length) {
      server ??= await createPrerenderServer(config, root, options.entry ?? '/src/main.ts',
        options.renderingModule ?? '@ayu-sh-kr/dota-rendering', logType);
      const readAsset = createPrerenderAssetReader(new Set(outputs));
      for (const route of routes) {
        const result = await prerenderRoute(server, template, route, outputDirectory, options, readAsset);
        await writeRoute(route, result.html, result.timings);
      }
    }
    const renderingMs = nodePerformance.now() - renderingStarted;
    const finishingStarted = nodePerformance.now();
    await prepareDeployment(root, outputDirectory, routes, options, config.base);
    await server?.close();
    server = undefined;
    const finishingMs = nodePerformance.now() - finishingStarted;
    logger.success(`[dota-ssr] prerendered ${routes.length} routes in ${((nodePerformance.now() - started) / 1000).toFixed(2)}s (setup ${setupMs.toFixed(0)}ms, render/workers + writes ${renderingMs.toFixed(0)}ms, deployment + shutdown ${finishingMs.toFixed(0)}ms)`);
    if (routeTimes.length) {
      const slowest = routeTimes.sort((left, right) => right.total - left.total).slice(0, 3);
      logger.info(`[dota-ssr] slowest routes: ${slowest.map(route => `${route.path} ${route.total.toFixed(0)}ms`).join(', ')}`);
    }
  } finally {
    await server?.close();
  }
}
