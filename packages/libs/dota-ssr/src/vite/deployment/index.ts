import type {DotaSsgDeploymentOptions, DotaSsgOptions, ResolvedDotaSsgRoute} from '../../ssg/types';
import {updateVercelConfig} from '../vercel-config';
import {prepareNetlify} from './netlify';
import {prepareCloudflarePages} from './cloudflare-pages';
import {prepareGithubPages} from './github-pages';
import {recordStaticDeployment} from './static-deployment';

/**
 * Prepares one platform's files; explicit deployment settings override the legacy Vercel fallback.
 * The written routes and target are recorded for the SSR plugin, which runs later in the same
 * build and keeps these pages static on hosts that route whole patterns to its function.
 * @param root Effective Vite root for Vercel discovery and relative configuration paths.
 * @param outputDirectory Absolute build directory for other platforms' published files.
 * @param routes Validated route outputs already written; an empty list still prepares hosting files.
 * @param options Plugin settings; false disables preparation, and omission falls back to `vercel`.
 *   `trailingSlash` (default `true`) selects which URL form Vercel and GitHub Pages expose.
 *   `deployment.redirects: false` skips route rules on every target.
 * @param base Vite public base, defaulting to `/`; its pathname prefixes Netlify and Cloudflare rules.
 * @throws If the target is unsupported or its handler cannot read, validate, or write deployment files.
 */
export async function prepareDeployment(
  root: string,
  outputDirectory: string,
  routes: readonly ResolvedDotaSsgRoute[],
  options: DotaSsgOptions,
  base = '/'
): Promise<void> {
  const deployment: DotaSsgOptions['deployment'] = options.deployment ?? (options.vercel
    ? {target: 'vercel', ...(options.vercel === true ? {} : options.vercel)}
    : false);
  const resolved = typeof deployment === 'string' ? {target: deployment} as DotaSsgDeploymentOptions : deployment;
  recordStaticDeployment(outputDirectory, {routes, deployment: resolved});
  if (resolved === false) return;
  const trailingSlash = options.trailingSlash ?? true;
  // `.nojekyll` is not a route rule, so GitHub Pages still gets it with rules turned off.
  const writesRules = resolved.redirects !== false;
  switch (resolved.target) {
    case 'vercel':
      if (writesRules) {
        await updateVercelConfig(root, routes, 'configFile' in resolved ? {configFile: resolved.configFile} : {}, trailingSlash);
      }
      return;
    case 'netlify':
      if (writesRules) await prepareNetlify(outputDirectory, routes, base);
      return;
    case 'cloudflare-pages':
      if (writesRules) await prepareCloudflarePages(outputDirectory, routes, base);
      return;
    case 'github-pages':
      await prepareGithubPages(outputDirectory, writesRules ? routes : [], trailingSlash);
      return;
    default:
      throw new Error(`Unsupported SSG deployment target: ${String(deployment)}`);
  }
}
