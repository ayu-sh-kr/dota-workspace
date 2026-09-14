import type {DotaSsgOptions, ResolvedDotaSsgRoute} from '../../ssg/types';
import {updateVercelConfig} from '../vercel-config';
import {prepareNetlify} from './netlify';
import {prepareCloudflarePages} from './cloudflare-pages';
import {prepareGithubPages} from './github-pages';

/**
 * Prepares one platform's files; explicit deployment settings override the legacy Vercel fallback.
 * @param root Effective Vite root for Vercel discovery and relative configuration paths.
 * @param outputDirectory Absolute build directory for other platforms' published files.
 * @param routes Validated route outputs already written; an empty list still prepares hosting files.
 * @param options Plugin settings; false disables preparation, and omission falls back to `vercel`.
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
  const deployment = options.deployment ?? (options.vercel
    ? {target: 'vercel', ...(options.vercel === true ? {} : options.vercel)} as const
    : false);
  if (deployment === false) return;
  const resolved = typeof deployment === 'string' ? {target: deployment} : deployment;
  switch (resolved.target) {
    case 'vercel':
      await updateVercelConfig(root, routes, 'configFile' in resolved ? {configFile: resolved.configFile} : {});
      return;
    case 'netlify':
      await prepareNetlify(outputDirectory, routes, base);
      return;
    case 'cloudflare-pages':
      await prepareCloudflarePages(outputDirectory, routes, base);
      return;
    case 'github-pages':
      await prepareGithubPages(outputDirectory, routes);
      return;
    default:
      throw new Error(`Unsupported SSG deployment target: ${String(deployment)}`);
  }
}
