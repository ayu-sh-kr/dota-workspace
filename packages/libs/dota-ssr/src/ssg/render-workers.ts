import {createRequire} from 'node:module';
import {Worker} from 'node:worker_threads';
import type {ResolvedConfig} from 'vite';
import type {DotaSsgOptions, ResolvedDotaSsgRoute} from './types';
import type {PrerenderTimings} from './prerender-runtime';

/** Serializable initialization shared by isolated workers; callbacks stay in sequential mode. */
export interface RenderWorkerData {
  /** Original config file and mode used to reconstruct application transforms. */
  config: Pick<ResolvedConfig, 'configFile' | 'mode'>;
  /** Application root used by the worker's Vite server. */
  root: string;
  /** Original client HTML, captured before any route overwrites index.html. */
  template: string;
  /** Built assets read by route fetch adapters. */
  outputDirectory: string;
  /** Generated destinations excluded from each worker's immutable asset cache. */
  outputs: string[];
  /** Only cloneable renderer settings; function callbacks cannot cross threads. */
  options: Pick<DotaSsgOptions, 'entry' | 'renderingModule' | 'readyExport' | 'fetchBaseUrl' | 'logType'>;
}

/** One response per worker request, or a startup/shutdown notification. */
export type RenderWorkerResponse =
  | {type: 'ready' | 'closed'}
  | {type: 'rendered'; html: string; timings: PrerenderTimings}
  | {type: 'error'; message: string};

/**
 * Assigns the next route to each available worker and bounds pending HTML by worker count.
 * Waits for writes before reusing a worker; failures and timeouts terminate the entire pool.
 * @param routes Validated independent pages; they must not fetch other generated route HTML.
 * @param data Serializable configuration and original template shared by every worker.
 * @param concurrency Maximum isolated workers, already validated by the plugin.
 * @param timeout Maximum milliseconds for worker startup, each route/write, or shutdown.
 * @param write Output callback awaited before assigning another page to that worker.
 * @param workerFile Internal worker entry override for isolated integration fixtures.
 */
export async function renderRoutesInWorkers(
  routes: readonly ResolvedDotaSsgRoute[],
  data: RenderWorkerData,
  concurrency: number,
  timeout: number,
  write: (route: ResolvedDotaSsgRoute, html: string, timings: PrerenderTimings) => Promise<void>,
  workerFile = createRequire(import.meta.url).resolve('@ayu-sh-kr/dota-ssr/worker')
): Promise<void> {
  const workers: Worker[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let nextRoute = 0;
  let failed = false;
  try {
    const tasks = Array.from({length: Math.min(concurrency, routes.length)}, () => new Promise<void>((resolve, reject) => {
      const worker = new Worker(workerFile, {workerData: data});
      workers.push(worker);
      let route: ResolvedDotaSsgRoute | undefined;
      let closed = false;
      let timer: ReturnType<typeof setTimeout>;
      const fail = (error: Error): void => {
        failed = true;
        reject(new Error(`[dota-ssr] ${route?.path ?? 'worker startup/shutdown'}: ${error.message}`, {cause: error}));
      };
      const armTimeout = (): void => {
        clearTimeout(timer);
        timers.delete(timer);
        timer = setTimeout(() => fail(new Error(`render worker exceeded ${timeout}ms`)), timeout);
        timers.add(timer);
      };
      armTimeout();
      worker.on('error', fail);
      worker.on('exit', code => {
        if (!closed) fail(new Error(`render worker exited unexpectedly (${code})`));
      });
      worker.on('message', (message: RenderWorkerResponse) => {
        void (async () => {
          if (failed) return;
          if (message.type === 'error') throw new Error(message.message);
          if (message.type === 'closed') {
            closed = true;
            clearTimeout(timer);
            timers.delete(timer);
            resolve();
            return;
          }
          if (message.type === 'rendered' && route) await write(route, message.html, message.timings);
          if (failed) return;
          route = routes[nextRoute++];
          armTimeout();
          worker.postMessage(route ? {type: 'render', route} : {type: 'close'});
        })().catch(fail);
      });
    }));
    await Promise.all(tasks);
  } finally {
    for (const timer of timers) clearTimeout(timer);
    await Promise.all(workers.map(worker => worker.terminate()));
  }
}
