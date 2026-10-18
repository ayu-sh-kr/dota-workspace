import type {LogType} from 'consola';
import {resolveDotaLogType} from '@ayu-sh-kr/dota-common-utils';
import type {Plugin} from 'vite';
import dotaVitePreloader from '../preloader-plugin';
import eventMapGenerator, {type EventMapGeneratorPluginConfig} from '../event-map-generator';
import dotaWebTypeJson, {type WebTypeJsonPluginConfig} from '../web-type-json';
import dotaSsg, {dotaSsr, type DotaServerTarget, type DotaSsgOptions, type DotaSsrOptions} from '../ssg';

/** Options forwarded to the wrapped Dota preloader plugin. */
export type DotaVitePreloaderOptions = {logType?: LogType};

/** Options forwarded to the wrapped event-map generator. */
export type DotaEventMapOptions = Omit<EventMapGeneratorPluginConfig, 'root' | 'scanRoots'>;

/** Options forwarded to the wrapped Web Types generator. */
export type DotaWebTypesOptions = Omit<WebTypeJsonPluginConfig, 'root' | 'scanRoots'>;

/**
 * Coordinates the Dota Vite plugins while leaving each plugin's nested options
 * in its native configuration shape.
 */
export type DotaVitePluginsOptions = {
  /** Project root shared by all enabled Dota plugins. */
  root?: string;
  /** Source roots shared by plugins that scan component or event declarations. */
  scanRoots?: string[];
  /** Default log level applied unless a nested plugin overrides it. */
  logType?: LogType;
  /** Package-specific defaults, keyed by package slug such as `dota-ssr`. */
  packageLogTypes?: Record<string, LogType>;
  /** Preloader options, or `false` to omit the default preloader. */
  preloader?: DotaVitePreloaderOptions | false;
  /** Event-map options, or `false` to omit event-map generation. */
  eventMap?: DotaEventMapOptions | false;
  /** Web Types options, or `false` to omit Web Types generation. */
  webTypes?: DotaWebTypesOptions | false;
  /** SSG options, or `false`/omission to keep the build client-only. */
  ssg?: DotaSsgOptions | false;
  /**
   * Request-time rendering for `@Route({mode: 'ssr'})` routes; on by default and a no-op
   * for applications without such routes. `false` removes it.
   */
  ssr?: DotaSsrOptions | false;
  /**
   * Hosting platform for both SSG and SSR output, unless `ssg.deployment` or
   * `ssr.deployment` says otherwise. SSR defaults to `node` when no target is set.
   */
  deployment?: DotaServerTarget;
  /** Explicitly supplied third-party or application-specific Vite plugins. */
  extensions?: Plugin[];
};

/**
 * Creates the ordered Dota Vite plugin list used by an application.
 * The factory applies shared root, scan-root, and logging defaults, then returns
 * the original plugin objects so Vite controls their native hooks and ordering.
 * Nitro and other server-owning integrations remain explicit extensions.
 * @param options Shared defaults and per-plugin configuration.
 * @returns Vite plugins in preloader, event-map, Web Types, SSG, SSR, and extension order.
 */
export function dotaVitePlugins(options: DotaVitePluginsOptions = {}): Plugin[] {
  const root = options.root ?? process.cwd();
  const scanRoots = options.scanRoots ?? [root];
  const plugins: Plugin[] = [];

  if (options.preloader !== false) {
    plugins.push(dotaVitePreloader({
      root,
      logType: resolveDotaLogType('dota-vite-preloader', options.preloader?.logType, options.logType, options.packageLogTypes?.['dota-vite-preloader']),
      ...options.preloader,
    }));
  }

  if (options.eventMap !== false) {
    plugins.push(eventMapGenerator({
      root,
      scanRoots,
      logType: resolveDotaLogType('dota-event-map-generator', options.eventMap?.logType, options.logType, options.packageLogTypes?.['dota-event-map-generator']),
      moduleSpecifier: '@ayu-sh-kr/dota-wrap/event',
      ...options.eventMap,
    }));
  }

  if (options.webTypes !== false) {
    plugins.push(dotaWebTypeJson({
      root,
      scanRoots,
      logType: resolveDotaLogType('dota-web-type-json', options.webTypes?.logType, options.logType, options.packageLogTypes?.['dota-web-type-json']),
      ...options.webTypes,
    }));
  }

  if (options.ssg !== false && options.ssg !== undefined) {
    plugins.push(dotaSsg({
      root,
      logType: resolveDotaLogType('dota-ssr', options.ssg.logType, options.logType, options.packageLogTypes?.['dota-ssr']),
      ...(options.deployment && options.deployment !== 'node' ? {deployment: options.deployment} : {}),
      ...options.ssg,
    }));
  }

  if (options.ssr !== false) {
    plugins.push(dotaSsr({
      root,
      logType: resolveDotaLogType('dota-ssr', options.ssr?.logType, options.logType, options.packageLogTypes?.['dota-ssr']),
      deployment: options.deployment ?? ssgDeploymentTarget(options.ssg),
      ...options.ssr,
    }));
  }

  plugins.push(...(options.extensions ?? []));
  return plugins;
}

/** The SSG deployment target, so SSR deploys to the same platform without repeating it. */
function ssgDeploymentTarget(ssg: DotaSsgOptions | false | undefined): DotaServerTarget | undefined {
  if (!ssg) return undefined;
  const deployment = ssg.deployment ?? (ssg.vercel ? 'vercel' : undefined);
  if (!deployment) return undefined;
  return typeof deployment === 'string' ? deployment : deployment.target;
}
