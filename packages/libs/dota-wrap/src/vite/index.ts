import type {LogType} from 'consola';
import type {Plugin} from 'vite';
import dotaVitePreloader from '../preloader-plugin';
import eventMapGenerator, {type EventMapGeneratorPluginConfig} from '../event-map-generator';
import dotaWebTypeJson, {type WebTypeJsonPluginConfig} from '../web-type-json';
import dotaSsg, {type DotaSsgOptions} from '../ssg';

/** Options forwarded to the wrapped Dota preloader plugin. */
export type DotaVitePreloaderOptions = Record<string, never>;

/** Options forwarded to the wrapped event-map generator. */
export type DotaEventMapOptions = Omit<EventMapGeneratorPluginConfig, 'root' | 'scanRoots' | 'logType'>;

/** Options forwarded to the wrapped Web Types generator. */
export type DotaWebTypesOptions = Omit<WebTypeJsonPluginConfig, 'root' | 'scanRoots' | 'logType'>;

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
  /** Preloader options, or `false` to omit the default preloader. */
  preloader?: DotaVitePreloaderOptions | false;
  /** Event-map options, or `false` to omit event-map generation. */
  eventMap?: DotaEventMapOptions | false;
  /** Web Types options, or `false` to omit Web Types generation. */
  webTypes?: DotaWebTypesOptions | false;
  /** SSG options, or `false`/omission to keep the build client-only. */
  ssg?: DotaSsgOptions | false;
  /** Explicitly supplied third-party or application-specific Vite plugins. */
  extensions?: Plugin[];
};

/**
 * Creates the ordered Dota Vite plugin list used by an application.
 * The factory applies shared root, scan-root, and logging defaults, then returns
 * the original plugin objects so Vite controls their native hooks and ordering.
 * Nitro and other server-owning integrations remain explicit extensions.
 * @param options Shared defaults and per-plugin configuration.
 * @returns Vite plugins in preloader, event-map, Web Types, SSG, and extension order.
 */
export function dotaVitePlugins(options: DotaVitePluginsOptions = {}): Plugin[] {
  const root = options.root ?? process.cwd();
  const scanRoots = options.scanRoots ?? [root];
  const logType = options.logType ?? 'info';
  const plugins: Plugin[] = [];

  if (options.preloader !== false) {
    plugins.push(dotaVitePreloader({
      root,
      logType,
      ...options.preloader,
    }));
  }

  if (options.eventMap !== false) {
    plugins.push(eventMapGenerator({
      root,
      scanRoots,
      logType,
      moduleSpecifier: '@ayu-sh-kr/dota-wrap/event',
      ...options.eventMap,
    }));
  }

  if (options.webTypes !== false) {
    plugins.push(dotaWebTypeJson({
      root,
      scanRoots,
      logType,
      ...options.webTypes,
    }));
  }

  if (options.ssg !== false && options.ssg !== undefined) {
    plugins.push(dotaSsg({
      root,
      logType,
      ...options.ssg,
    }));
  }

  plugins.push(...(options.extensions ?? []));
  return plugins;
}
