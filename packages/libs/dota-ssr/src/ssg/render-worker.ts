import {parentPort, workerData} from 'node:worker_threads';
import type {ViteDevServer} from 'vite';
import {createPrerenderAssetReader} from './asset-reader';
import {createPrerenderServer} from '../vite/prerender-server';
import {prerenderRoute} from './prerender-runtime';
import type {RenderWorkerData, RenderWorkerResponse} from './render-workers';
import type {ResolvedDotaSsgRoute} from './types';

/** Starts one server per worker; the coordinator sends only one render request at a time. */
async function startWorker(): Promise<void> {
  const port = parentPort;
  if (!port) throw new Error('The SSG worker must run in a worker thread');
  const data = workerData as RenderWorkerData;
  const {config, root, options, template, outputDirectory, outputs} = data;
  const readAsset = createPrerenderAssetReader(new Set(outputs));
  let server: ViteDevServer;
  try {
    server = await createPrerenderServer(config, root, options.entry ?? '/src/main.ts',
      options.renderingModule ?? '@ayu-sh-kr/dota-rendering', options.logType ?? 'info');
  } catch (error) {
    port.postMessage({type: 'error', message: error instanceof Error ? error.message : String(error)} satisfies RenderWorkerResponse);
    port.close();
    return;
  }
  port.on('message', (message: {type: 'render'; route: ResolvedDotaSsgRoute} | {type: 'close'}) => {
    void (async () => {
      if (message.type === 'close') {
        await server.close();
        port.postMessage({type: 'closed'} satisfies RenderWorkerResponse);
        port.close();
        return;
      }
      const result = await prerenderRoute(server, template, message.route, outputDirectory, options, readAsset);
      port.postMessage({type: 'rendered', ...result} satisfies RenderWorkerResponse);
    })().catch(error => {
      port.postMessage({type: 'error', message: error instanceof Error ? error.message : String(error)} satisfies RenderWorkerResponse);
    });
  });
  port.postMessage({type: 'ready'} satisfies RenderWorkerResponse);
}

void startWorker();
