import {performance as nodePerformance} from 'node:perf_hooks';
import {Window} from 'happy-dom';
import {createServerModuleRunner, isRunnableDevEnvironment, type ViteDevServer} from 'vite';
import {ESModulesEvaluator, type ModuleRunnerContext} from 'vite/module-runner';
import {VIRTUAL_SSG_ENTRY} from '../vite/prerender-server';
import {installPrerenderFetch, settlesBefore, type PrerenderFetchWaiter} from './prerender-fetch';
import {installWindowGlobals} from './window-globals';
import type {PrerenderAssetReader} from './asset-reader';
import type {PrerenderNetworkCache} from './network-cache';
import type {DotaSsgOptions, ResolvedDotaSsgRoute} from './types';
import {HYDRATION_ROUTE_ATTRIBUTE, HYDRATION_ROUTE_VERSION_ATTRIBUTE, HYDRATION_ROUTE_VERSION} from '../route-marker';

/** Application namespace loaded from the configured SSG entry module. */
type SsgApplicationModule = Record<string, unknown>;

/** Virtual SSG preamble exports used to control marker emission around one render. */
type SsgEntryModule = {
  /** Restores client-default marker emission and clears the server-render flag after a route. */
  finishPrerender: () => void;
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
  /** False when settling hit its time or pass limit, so late content may be missing. */
  settled: boolean;
}

/** Default `settleTimeout`: how long one route may wait for pending tasks and requests. */
export const DEFAULT_SETTLE_TIMEOUT = 30_000;

/**
 * Executes one route in a fresh browser realm and serializes its settled document.
 * Fresh module evaluation binds constructors to this window; only custom settle work needs a second barrier.
 * @param server Vite SSR module runner configured with the application's transforms.
 * @param template Built client HTML shell containing production asset references.
 * @param route Normalized route and safe output mapping.
 * @param outputDirectory Built client directory used to resolve same-origin fetch requests.
 * @param options Plugin options containing readiness and optional settle policy.
 * @param readAsset Build-local asset cache excluding every generated route destination.
 * @param networkCache Build-local cache of network responses shared by every route.
 * @returns Complete HTML, elapsed stage timings including cleanup, and whether settling finished.
 * @throws Error when the configured application readiness export is not a promise.
 */
export async function prerenderRoute(
  server: ViteDevServer,
  template: string,
  route: ResolvedDotaSsgRoute,
  outputDirectory: string,
  options: DotaSsgOptions,
  readAsset: PrerenderAssetReader,
  networkCache?: PrerenderNetworkCache
): Promise<PrerenderResult> {
  const runner = resolveSsrRunner(server);
  const started = nodePerformance.now();
  const timings: PrerenderTimings = {setup: 0, load: 0, ready: 0, settle: 0, serialize: 0, cleanup: 0, total: 0};
  const window = createPrerenderWindow(route.path);
  const waitForFetches = installPrerenderFetch(window, outputDirectory, options.fetchBaseUrl, readAsset, networkCache);
  const restoreGlobals = installWindowGlobals(window);
  window.document.write(template);
  window.document.close();
  // Re-evaluate modules against this route's window, but keep Vite's transform cache across routes.
  runner.clearCache();
  let finishPrerender: (() => void) | undefined;
  let phaseStarted = nodePerformance.now();
  timings.setup = phaseStarted - started;

  try {
    const loaded = await runner.import(VIRTUAL_SSG_ENTRY) as SsgEntryModule;
    timings.load = nodePerformance.now() - phaseStarted;
    phaseStarted = nodePerformance.now();
    finishPrerender = loaded.finishPrerender;
    const application = loaded.default;
    const readyExport = options.readyExport ?? 'applicationReady';
    const ready = application[readyExport];
    if (typeof (ready as PromiseLike<unknown> | undefined)?.then !== 'function') {
      throw new Error(`SSG entry must export a Promise named "${readyExport}"`);
    }
    await ready;
    timings.ready = nodePerformance.now() - phaseStarted;
    phaseStarted = nodePerformance.now();
    const settleTimeout = options.settleTimeout ?? DEFAULT_SETTLE_TIMEOUT;
    let settled = await settlePrerenderWindow(window, waitForFetches, settleTimeout);
    if (options.settle) {
      await options.settle(window, route);
      settled = await settlePrerenderWindow(window, waitForFetches, settleTimeout) && settled;
    }
    timings.settle = nodePerformance.now() - phaseStarted;
    phaseStarted = nodePerformance.now();
    markPrerenderedRoute(window, route.path);
    const html = `<!doctype html>\n${window.document.documentElement.outerHTML}\n`;
    timings.serialize = nodePerformance.now() - phaseStarted;
    return {html, timings, settled};
  } finally {
    const cleanupStarted = nodePerformance.now();
    waitForFetches.close();
    try {
      finishPrerender?.();
      await closePrerenderWindow(window);
    } finally {
      restoreGlobals();
      timings.cleanup = nodePerformance.now() - cleanupStarted;
      timings.total = nodePerformance.now() - started;
    }
  }
}

/**
 * Detaches the rendered tree, then closes the route window.
 * Disconnect callbacks may remove other nodes, such as a popover panel portalled to
 * `<body>`. happy-dom's window teardown walks child lists with a cached length and
 * fails when they shrink, so body children are removed one at a time first.
 * @param window Route window whose page has already been serialized.
 */
export async function closePrerenderWindow(window: Window): Promise<void> {
  const body = window.document.body;
  while (body?.lastChild) body.removeChild(body.lastChild);
  await window.happyDOM.close();
}

/** Module runner shared by every route rendered with one prerender server. */
type SsrRunner = ReturnType<typeof createServerModuleRunner>;

/** Runners keyed by SSR environment, so each prerender server keeps one runner for all its routes. */
const SSR_RUNNERS = new WeakMap<object, SsrRunner>();

/**
 * Returns one module runner per prerender server, created on first use.
 * Clearing its cache drops evaluated modules only; unlike `moduleGraph.invalidateAll()`, it keeps
 * transformed code, so each route pays for module evaluation instead of a full re-transform.
 * Source-map interception stays off, as in Vite's `ssrLoadModule` runner: the default enables
 * Node source maps, which parses every module's inline map again on each route. Modules run
 * through a {@link CompiledModuleEvaluator}, so each route evaluates them without recompiling.
 * @param server Prerender server whose SSR environment executes the application entry.
 * @returns Runner used to evaluate the virtual SSG entry for one route window.
 * @throws Error when the SSR environment cannot execute modules in this process.
 */
function resolveSsrRunner(server: ViteDevServer): SsrRunner {
  const environment = server.environments.ssr;
  const existing = SSR_RUNNERS.get(environment);
  if (existing) return existing;
  if (!isRunnableDevEnvironment(environment)) {
    throw new Error('SSG requires a runnable Vite SSR environment');
  }
  const runner = createServerModuleRunner(environment, {
    hmr: false,
    sourcemapInterceptor: false,
    evaluator: new CompiledModuleEvaluator()
  });
  SSR_RUNNERS.set(environment, runner);
  return runner;
}

/** Parameter names Vite's evaluator binds, in the order it passes the module context. */
const MODULE_CONTEXT_KEYS = [
  '__vite_ssr_exports__', '__vite_ssr_import_meta__', '__vite_ssr_import__',
  '__vite_ssr_dynamic_import__', '__vite_ssr_exportAll__', '__vite_ssr_exportName__'
] as const;

/** Constructor of the async module wrappers Vite's evaluator compiles. */
const AsyncFunction = (async () => undefined).constructor as new (...source: string[]) => (...context: unknown[]) => Promise<void>;

/**
 * Evaluates transformed modules like Vite's `ESModulesEvaluator`, compiling each module once.
 * Every route clears the evaluated modules and runs them again against its own window. Vite
 * compiles a new wrapper function for each evaluation, which makes V8 parse and compile the
 * whole application, including its dependencies, on every route. The wrapper only receives
 * the module context as arguments, so one compiled wrapper per transformed source can run
 * again: each call still creates new module state, while V8 keeps the compiled code.
 */
export class CompiledModuleEvaluator extends ESModulesEvaluator {
  /** Wrappers keyed by transformed source; Vite keeps the same source for every route. */
  private readonly wrappers = new Map<string, (...context: unknown[]) => Promise<void>>();

  override async runInlinedModule(context: ModuleRunnerContext, code: string): Promise<void> {
    let wrapper = this.wrappers.get(code);
    if (!wrapper) {
      wrapper = new AsyncFunction(...MODULE_CONTEXT_KEYS, `"use strict";\n${code}`);
      this.wrappers.set(code, wrapper);
    }
    await wrapper(...MODULE_CONTEXT_KEYS.map(key => context[key]));
    Object.seal(context.__vite_ssr_exports__);
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

/** Upper bound on settle passes for pages whose timers keep starting new requests. */
export const MAX_SETTLE_PASSES = 25;

/**
 * Re-checks both Happy DOM tasks and tracked fetches until a pass finds no fetch to wait for.
 * A completed fetch can start another fetch or schedule DOM work, so a fixed number of passes
 * misses content from loaders that chain requests. A pass in which no request was pending ends
 * the loop, because its task barrier already drained any work queued by earlier responses.
 * Waiting stops after `MAX_SETTLE_PASSES` passes or `timeout` milliseconds, whichever comes
 * first; the page is then serialized with whatever has rendered.
 * @param window Route-isolated Happy DOM window whose task queue is settling.
 * @param waitForFetches Barrier returned by the route fetch adapter.
 * @param timeout Milliseconds this settle may take before the page is serialized as it is.
 * @returns Whether the page went quiet before either limit.
 */
async function settlePrerenderWindow(window: Window, waitForFetches: PrerenderFetchWaiter, timeout: number): Promise<boolean> {
  const deadline = nodePerformance.now() + timeout;
  for (let pass = 0; pass < MAX_SETTLE_PASSES; pass += 1) {
    await Promise.resolve();
    await Promise.resolve();
    if (!await settlesBefore(window.happyDOM.waitUntilComplete(), deadline)) return false;
    const waited = await waitForFetches(deadline);
    if (nodePerformance.now() >= deadline) return false;
    if (!waited) return true;
  }
  return false;
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
