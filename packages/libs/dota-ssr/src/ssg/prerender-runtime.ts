import {performance as nodePerformance} from 'node:perf_hooks';
import {Window} from 'happy-dom';
import type {ViteDevServer} from 'vite';
import {VIRTUAL_SSG_ENTRY} from '../vite/prerender-server';
import {installPrerenderFetch} from './prerender-fetch';
import {installWindowGlobals} from './window-globals';
import type {PrerenderAssetReader} from './asset-reader';
import type {DotaSsgOptions, ResolvedDotaSsgRoute} from './types';
import {HYDRATION_ROUTE_ATTRIBUTE, HYDRATION_ROUTE_VERSION_ATTRIBUTE, HYDRATION_ROUTE_VERSION} from '../route-marker';

/** Application namespace loaded from the configured SSG entry module. */
type SsgApplicationModule = Record<string, unknown>;

/** Virtual SSG preamble exports used to control marker emission around one render. */
type SsgEntryModule = {
  /** Restores client-default marker emission after the route window is disposed. */
  disableHydrationEmit: () => void;
  /** Application exports, including the configured readiness promise. */
  default: SsgApplicationModule;
};

/** Per-route elapsed milliseconds from a Node clock unaffected by installed window globals. */
export interface PrerenderTimings {
  /** Window, fetch adapter, globals, template, and module invalidation. */
  setup: number;
  /** Entry loading and module evaluation; readiness work can already begin here. */
  load: number;
  /** Remaining time awaiting the application's readiness promise after entry loading. */
  ready: number;
  /** DOM/fetch barriers and the optional custom settle callback. */
  settle: number;
  /** Route marking and HTML serialization. */
  serialize: number;
  /** Window disposal and global restoration. */
  cleanup: number;
  /** Entire route render, including cleanup but excluding output writes. */
  total: number;
}

/** Serializable render output returned only after route cleanup has completed. */
export interface PrerenderResult {
  html: string;
  timings: PrerenderTimings;
}

/**
 * Executes one route in a fresh browser realm and serializes its settled document.
 * Fresh module evaluation binds constructors to this window; only custom settle work needs a second barrier.
 * @param server Vite SSR module runner configured with the application's transforms.
 * @param template Built client HTML shell containing production asset references.
 * @param route Normalized route and safe output mapping.
 * @param outputDirectory Built client directory used to resolve same-origin fetch requests.
 * @param options Plugin options containing readiness and optional settle policy.
 * @param readAsset Build-local asset cache excluding every generated route destination.
 * @returns Complete HTML and elapsed stage timings, including cleanup.
 * @throws Error when the configured application readiness export is not a promise.
 */
export async function prerenderRoute(
  server: ViteDevServer,
  template: string,
  route: ResolvedDotaSsgRoute,
  outputDirectory: string,
  options: DotaSsgOptions,
  readAsset: PrerenderAssetReader
): Promise<PrerenderResult> {
  const started = nodePerformance.now();
  const timings: PrerenderTimings = {setup: 0, load: 0, ready: 0, settle: 0, serialize: 0, cleanup: 0, total: 0};
  const window = createPrerenderWindow(route.path);
  const waitForFetches = installPrerenderFetch(window, outputDirectory, options.fetchBaseUrl, readAsset);
  const restoreGlobals = installWindowGlobals(window);
  window.document.write(template);
  window.document.close();
  server.moduleGraph.invalidateAll();
  let disableHydrationEmit: (() => void) | undefined;
  let phaseStarted = nodePerformance.now();
  timings.setup = phaseStarted - started;

  try {
    const loaded = await server.ssrLoadModule(VIRTUAL_SSG_ENTRY, {fixStacktrace: true}) as SsgEntryModule;
    timings.load = nodePerformance.now() - phaseStarted;
    phaseStarted = nodePerformance.now();
    disableHydrationEmit = loaded.disableHydrationEmit;
    const application = loaded.default;
    const readyExport = options.readyExport ?? 'applicationReady';
    const ready = application[readyExport];
    if (typeof (ready as PromiseLike<unknown> | undefined)?.then !== 'function') {
      throw new Error(`SSG entry must export a Promise named "${readyExport}"`);
    }
    await ready;
    timings.ready = nodePerformance.now() - phaseStarted;
    phaseStarted = nodePerformance.now();
    await settlePrerenderWindow(window, waitForFetches);
    if (options.settle) {
      await options.settle(window, route);
      await settlePrerenderWindow(window, waitForFetches);
    }
    timings.settle = nodePerformance.now() - phaseStarted;
    phaseStarted = nodePerformance.now();
    markPrerenderedRoute(window, route.path);
    const html = `<!doctype html>\n${window.document.documentElement.outerHTML}\n`;
    timings.serialize = nodePerformance.now() - phaseStarted;
    return {html, timings};
  } finally {
    const cleanupStarted = nodePerformance.now();
    try {
      disableHydrationEmit?.();
      await window.happyDOM.close();
    } finally {
      restoreGlobals();
      timings.cleanup = nodePerformance.now() - cleanupStarted;
      timings.total = nodePerformance.now() - started;
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
  for (const element of window.document.querySelectorAll('[path]')) {
    if (element.getAttribute('path') !== pathname || !element.parentElement?.localName.includes('-')) continue;
    element.setAttribute(HYDRATION_ROUTE_ATTRIBUTE, 'true');
    element.setAttribute(HYDRATION_ROUTE_VERSION_ATTRIBUTE, HYDRATION_ROUTE_VERSION);
    return;
  }
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
      fetch: {disableSameOriginPolicy: true},
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      timer: {preventTimerLoops: true}
    }
  });
}
