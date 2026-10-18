import type {Plugin, ResolvedConfig, UserConfig} from 'vite';
import {loadConfigFromFile} from 'vite';

/**
 * Plugins a secondary Vite instance (prerender server, server build) must not run again:
 * the metadata writers already ran in the client build, and the Dota SSG/SSR plugins
 * would recurse into another prerender or server build.
 */
const PRIMARY_BUILD_ONLY_PLUGINS = new Set([
  'vite-plugin-event-map-generator',
  'vite-plugin-dota-web-type-json',
  'vite-plugin-dota-ssg',
  'vite-plugin-dota-ssr'
]);

/** The application's own Vite configuration, re-read for a secondary Vite instance. */
export type ApplicationConfig = {
  /** The config file's settings, with `plugins` removed (see {@link plugins}). */
  readonly config: UserConfig;
  /** The config's plugins, flattened, without {@link PRIMARY_BUILD_ONLY_PLUGINS}. */
  readonly plugins: Plugin[];
};

/**
 * Re-reads the application's Vite config so a secondary Vite instance uses the same
 * transforms, aliases, and preloader virtual modules as the client build.
 * @param config Resolved config of the running build or dev server.
 * @param root Application root used to resolve the config file.
 * @param command Vite command the secondary instance runs as.
 */
export async function loadApplicationConfig(config: Pick<ResolvedConfig, 'configFile' | 'mode'>, root: string, command: 'serve' | 'build'): Promise<ApplicationConfig> {
  const loaded = config.configFile
    ? (await loadConfigFromFile({command, mode: config.mode}, config.configFile, root))?.config
    : undefined;
  const plugins: Plugin[] = [];
  const pending = [...(loaded?.plugins ?? [])];
  while (pending.length) {
    const plugin = await pending.shift();
    if (Array.isArray(plugin)) pending.unshift(...plugin);
    else if (plugin && !PRIMARY_BUILD_ONLY_PLUGINS.has(plugin.name)) plugins.push(plugin);
  }
  const {plugins: _plugins, ...rest} = loaded ?? {};
  return {config: rest, plugins};
}
