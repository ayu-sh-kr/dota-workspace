import type {Plugin, ResolvedConfig} from 'vite';
import type {DotaSsgOptions} from '../ssg/types';
import {generateStaticPages} from '../ssg/generate';

export type {
  DotaSsgOptions,
  DotaDecoratedRoute,
  DotaSsgRoute,
  DotaSsgRouteInput,
  DotaSsgVercelOptions,
  ResolvedDotaSsgRoute
} from '../ssg/types';
export {resolveDecoratedSsgRoutes, resolveSsgRoutes} from '../ssg/route-output';

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
  const concurrency = options.concurrency ?? 1;
  const renderTimeout = options.renderTimeout ?? 120_000;
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('SSG concurrency must be a positive integer');
  if (!Number.isInteger(renderTimeout) || renderTimeout < 1 || renderTimeout > 2_147_483_647) {
    throw new Error('SSG renderTimeout must be an integer between 1 and 2147483647 milliseconds');
  }
  if (concurrency > 1 && options.settle) {
    throw new Error('Parallel SSG cannot transfer a settle callback to workers; use concurrency: 1 or await the work in applicationReady');
  }
  let config: ResolvedConfig;

  return {
    name: 'vite-plugin-dota-ssg',
    apply(_config, environment) {
      return environment.command === 'build' && process.argv.includes('--ssg');
    },
    enforce: 'post',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    /** Hands the completed client build to static generation. */
    async closeBundle() {
      await generateStaticPages(config, {...options, concurrency, renderTimeout});
    }
  };
}
