import type {Plugin} from 'vite';
import dotaSsg, {dotaSsr, type DotaServerTarget, type DotaSsgOptions, type DotaSsrOptions} from '../ssg';

/**
 * Hosting platform a Dota build is packaged for. Every target keeps trailing-slash URLs
 * (`/blog/post/`) canonical: Vercel through generated redirects, Netlify, Cloudflare Pages,
 * and GitHub Pages through their native directory-index redirects, and `node` through the
 * generated server.
 */
export type DotaPackageTarget = DotaServerTarget;

/** Object form of a deployment, for settings that only some platforms read. */
export type DotaPackageOptions = {
  /** Hosting platform. */
  target: DotaPackageTarget;
  /** `vercel` only: existing `vercel.json`, relative to the root; omission searches ancestors. */
  vercelConfigFile?: string;
  /** `node` only: server output directory relative to the root; defaults to `dist-server`. */
  serverOutDir?: string;
};

/** A deployment target name or its object form. */
export type DotaDeployment = DotaPackageTarget | DotaPackageOptions;

/** SSG and SSR plugins that {@link dotaPackage} configures for one deployment. */
export type DotaPackagePlugins = {
  /** SSG options, or `false`/omission for no prerendering. */
  ssg?: DotaSsgOptions | false;
  /** SSR options, or `false` to omit request-time rendering. */
  ssr?: DotaSsrOptions | false;
};

/**
 * Packages SSG and SSR output for one hosting platform, so the target is named once
 * instead of per plugin. An explicit `ssg.deployment` or `ssr.deployment` still wins;
 * without any target, SSR builds a Node server and SSG writes no hosting files.
 * @param deployment Hosting platform, or `undefined` to keep each plugin's own setting.
 * @param plugins SSG and SSR options; root and log level are expected to be resolved already.
 * @returns The SSG plugin when enabled, then the SSR plugin when enabled.
 */
export function dotaPackage(deployment: DotaDeployment | undefined, plugins: DotaPackagePlugins = {}): Plugin[] {
  const resolved = typeof deployment === 'string' ? {target: deployment} : deployment;
  const result: Plugin[] = [];

  if (plugins.ssg) {
    result.push(dotaSsg({...(resolved ? {deployment: ssgDeployment(resolved)} : {}), ...plugins.ssg}));
  }

  if (plugins.ssr !== false) {
    result.push(dotaSsr({
      deployment: resolved?.target ?? ssgDeploymentTarget(plugins.ssg),
      ...(resolved?.serverOutDir ? {serverOutDir: resolved.serverOutDir} : {}),
      ...plugins.ssr,
    }));
  }

  return result;
}

/** SSG hosting files for a deployment; a Node server serves directory indexes itself, so it needs none. */
function ssgDeployment(deployment: DotaPackageOptions): DotaSsgOptions['deployment'] {
  if (deployment.target === 'node') return false;
  if (deployment.target === 'vercel' && deployment.vercelConfigFile) {
    return {target: 'vercel', configFile: deployment.vercelConfigFile};
  }
  return deployment.target;
}

/** The SSG deployment target, so SSR deploys to the same platform without repeating it. */
function ssgDeploymentTarget(ssg: DotaSsgOptions | false | undefined): DotaServerTarget | undefined {
  if (!ssg) return undefined;
  const deployment = ssg.deployment ?? (ssg.vercel ? 'vercel' : undefined);
  if (!deployment) return undefined;
  return typeof deployment === 'string' ? deployment : deployment.target;
}
