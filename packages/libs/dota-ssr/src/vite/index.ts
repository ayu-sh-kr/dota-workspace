import type {Plugin, ResolvedConfig} from 'vite';
import type {DotaSsgOptions} from '../ssg/types';
import {generateStaticPages} from '../ssg/generate';

export type {
  DotaSsgOptions,
  DotaSsgDeploymentTarget,
  DotaSsgDeploymentOptions,
  DotaDecoratedRoute,
  DotaSsgRoute,
  DotaSsgRouteInput,
  DotaSsgVercelOptions,
  ResolvedDotaSsgRoute
} from '../ssg/types';
export {resolveDecoratedSsgRoutes, resolveSsgRoutes} from '../ssg/route-output';

/**
 * Prerenders isolated route documents and prepares optional hosting files after the client build.
 * Runs only for builds with `--ssg`; separate windows prevent state leaking between route outputs.
 * @param options Route selection, entry, readiness, shell, and optional deployment configuration.
 * @returns A post-build Vite plugin that writes marked route documents and selected deployment files.
 * @throws For invalid concurrency/timeouts or a settle callback that cannot be transferred to workers.
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
    /**
     * Keeps ordinary builds and development sessions on the existing client-rendered path.
     * @param _config Unresolved Vite settings, not needed for the explicit command-line opt-in.
     * @param environment Vite command context; only builds with `--ssg` activate this plugin.
     * @returns Whether Vite should include the SSG plugin in this run.
     */
    apply(_config, environment) {
      return environment.command === 'build' && process.argv.includes('--ssg');
    },
    enforce: 'post',
    /**
     * Captures final paths and build settings for rendering and deployment preparation.
     * @param resolvedConfig Vite settings after defaults and other plugins have been applied.
     */
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    /**
     * Generates pages before preparing hosting files so every mapping refers to completed output.
     * @throws If route rendering or deployment preparation fails; propagates failure to the build.
     */
    async closeBundle() {
      await generateStaticPages(config, {...options, concurrency, renderTimeout});
    }
  };
}
