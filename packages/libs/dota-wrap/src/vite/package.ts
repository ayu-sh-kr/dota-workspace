import type {Plugin} from 'vite';
import dotaSsg, {dotaSsr, type DotaServerTarget, type DotaSsgOptions, type DotaSsrOptions} from '../ssg';

/**
 * Hosting platform a Dota build is packaged for. Every target keeps one canonical URL per
 * page, `/blog/post/` by default or `/blog/post` with `trailingSlash: false`: Vercel through
 * generated redirects or `cleanUrls`, Netlify, Cloudflare Pages, and GitHub Pages natively,
 * and `node` through the generated server.
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
  /** Whether page URLs end with a slash; defaults to `true`. See `DotaSsgOptions.trailingSlash`. */
  trailingSlash?: boolean;
};

/** Deployment targets accepted from `DOTA_DEPLOYMENT`. */
const TARGETS: readonly DotaPackageTarget[] = ['node', 'vercel', 'netlify', 'cloudflare-pages', 'github-pages'];

/**
 * Environment variables read by {@link dotaPackage}. Each one, when set, wins over the
 * matching plugin option, including `ssg.deployment`, `ssg.trailingSlash`, and
 * `ssr.deployment`, so CI can retarget a build without editing `vite.config.ts`.
 */
export const DOTA_PACKAGE_ENV = {
  /** Hosting platform: `node`, `vercel`, `netlify`, `cloudflare-pages`, or `github-pages`. */
  target: 'DOTA_DEPLOYMENT',
  /** `true` or `false`; see {@link DotaPackageOptions.trailingSlash}. */
  trailingSlash: 'DOTA_TRAILING_SLASH',
  /** Vercel configuration file; see {@link DotaPackageOptions.vercelConfigFile}. */
  vercelConfigFile: 'DOTA_VERCEL_CONFIG_FILE',
  /** Node server output directory; see {@link DotaPackageOptions.serverOutDir}. */
  serverOutDir: 'DOTA_SERVER_OUT_DIR',
} as const;

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
 * instead of per plugin. Precedence, highest first: {@link DOTA_PACKAGE_ENV} variables, then
 * `ssg.*`/`ssr.*` options, then `deployment`. Without any target, SSR builds a Node server and
 * SSG writes no hosting files.
 * @param deployment Hosting platform, or `undefined` to keep each plugin's own setting.
 * @param plugins SSG and SSR options; root and log level are expected to be resolved already.
 * @param env Variables to read; defaults to `process.env`.
 * @returns The SSG plugin when enabled, then the SSR plugin when enabled.
 * @throws If `DOTA_DEPLOYMENT` or `DOTA_TRAILING_SLASH` holds an unsupported value.
 */
export function dotaPackage(
  deployment: DotaDeployment | undefined,
  plugins: DotaPackagePlugins = {},
  env: Record<string, string | undefined> = process.env
): Plugin[] {
  const configured = typeof deployment === 'string' ? {target: deployment} : deployment;
  const overrides = readPackageEnv(env);
  // The shared deployment with environment values applied; plugin options sit between the two.
  const shared = configured && {...configured, ...overrides};
  const fromEnv = overrides.target ? {...configured, ...overrides, target: overrides.target} : undefined;
  const result: Plugin[] = [];

  if (plugins.ssg) {
    result.push(dotaSsg({
      ...(shared ? {deployment: ssgDeployment(shared)} : {}),
      ...(shared?.trailingSlash === false ? {trailingSlash: false} : {}),
      ...plugins.ssg,
      ...(fromEnv ? {deployment: ssgDeployment(fromEnv)} : {}),
      ...(overrides.trailingSlash !== undefined ? {trailingSlash: overrides.trailingSlash} : {}),
    }));
  }

  if (plugins.ssr !== false) {
    const serverOutDir = overrides.serverOutDir ?? plugins.ssr?.serverOutDir ?? configured?.serverOutDir;
    result.push(dotaSsr({
      deployment: configured?.target ?? ssgDeploymentTarget(plugins.ssg),
      ...plugins.ssr,
      ...(overrides.target ? {deployment: overrides.target} : {}),
      ...(serverOutDir ? {serverOutDir} : {}),
    }));
  }

  return result;
}

/**
 * Reads the {@link DOTA_PACKAGE_ENV} variables that are set; empty values count as unset.
 * Values are validated here so a typo fails the build instead of silently using the config.
 * @param env Variables to read.
 * @returns Only the settings present in the environment.
 * @throws If the target or trailing-slash value is not one of the accepted spellings.
 */
export function readPackageEnv(env: Record<string, string | undefined>): Partial<DotaPackageOptions> {
  const value = (name: string) => env[name]?.trim() || undefined;
  const target = value(DOTA_PACKAGE_ENV.target);
  if (target && !TARGETS.includes(target as DotaPackageTarget)) {
    throw new Error(`${DOTA_PACKAGE_ENV.target} must be one of ${TARGETS.join(', ')}; got "${target}"`);
  }
  const trailingSlash = value(DOTA_PACKAGE_ENV.trailingSlash)?.toLowerCase();
  if (trailingSlash && trailingSlash !== 'true' && trailingSlash !== 'false') {
    throw new Error(`${DOTA_PACKAGE_ENV.trailingSlash} must be "true" or "false"; got "${trailingSlash}"`);
  }
  const vercelConfigFile = value(DOTA_PACKAGE_ENV.vercelConfigFile);
  const serverOutDir = value(DOTA_PACKAGE_ENV.serverOutDir);
  return {
    ...(target ? {target: target as DotaPackageTarget} : {}),
    ...(trailingSlash ? {trailingSlash: trailingSlash === 'true'} : {}),
    ...(vercelConfigFile ? {vercelConfigFile} : {}),
    ...(serverOutDir ? {serverOutDir} : {}),
  };
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
