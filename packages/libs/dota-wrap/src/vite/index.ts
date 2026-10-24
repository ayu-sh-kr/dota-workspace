import type {LogType} from 'consola';
import {resolveDotaLogType} from '@ayu-sh-kr/dota-common-utils';
import type {Plugin} from 'vite';
import dotaVitePreloader from '../preloader-plugin';
import eventMapGenerator, {type EventMapGeneratorPluginConfig} from '../event-map-generator';
import dotaWebTypeJson, {type WebTypeJsonPluginConfig} from '../web-type-json';
import type {DotaSsgOptions, DotaSsrOptions} from '../ssg';
import {dotaPackage, type DotaDeployment} from './package';
import {dotaRemoteStylesheets} from './remote-stylesheets';

export {dotaRemoteStylesheets, extractRemoteImports, remoteStylesheetTags} from './remote-stylesheets';
export {dotaPackage} from './package';
export type {DotaDeployment, DotaPackageOptions, DotaPackagePlugins, DotaPackageTarget} from './package';

/** Options forwarded to the wrapped Dota preloader plugin. */
export type DotaVitePreloaderOptions = {
  logType?: LogType;
  /** `false` stops grouping start-up support modules into one `app-shared` client chunk. */
  sharedChunk?: false;
};

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
   * Hosting platform for both SSG and SSR output (see {@link dotaPackage}), unless
   * `ssg.deployment` or `ssr.deployment` says otherwise. SSR defaults to `node` when no target is set.
   */
  deployment?: DotaDeployment;
  /**
   * Moves remote stylesheet `@import`s (web fonts) from the built CSS into `<link>`s in the
   * HTML head so they no longer wait for the CSS bundle; on by default, `false` removes it.
   */
  remoteStylesheets?: false;
  /** Explicitly supplied third-party or application-specific Vite plugins. */
  extensions?: Plugin[];
};

/**
 * Creates the ordered Dota Vite plugin list used by an application.
 * The factory applies shared root, scan-root, and logging defaults, then returns
 * the original plugin objects so Vite controls their native hooks and ordering.
 * Nitro and other server-owning integrations remain explicit extensions.
 * @param options Shared defaults and per-plugin configuration.
 * @returns Vite plugins in preloader, event-map, Web Types, SSG, SSR, remote stylesheet, and extension order.
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

  const logType = (nested?: LogType) => resolveDotaLogType('dota-ssr', nested, options.logType, options.packageLogTypes?.['dota-ssr']);
  plugins.push(...dotaPackage(options.deployment, {
    ssg: options.ssg && {root, logType: logType(options.ssg.logType), ...options.ssg},
    ssr: options.ssr !== false && {root, logType: logType(options.ssr?.logType), ...options.ssr},
  }));

  if (options.remoteStylesheets !== false) plugins.push(dotaRemoteStylesheets());

  plugins.push(...(options.extensions ?? []));
  return plugins;
}
