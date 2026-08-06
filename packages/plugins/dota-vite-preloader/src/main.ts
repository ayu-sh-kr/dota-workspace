import {Plugin, ViteDevServer} from "vite";
import {ComponentUtils} from "@dota/ComponentUtils.ts";
import {consola, createConsola, LogLevels, LogType} from 'consola';
import {VirtualImportID} from "@dota/Constants.ts";
import {readFile} from "node:fs/promises";
import {relative} from "node:path";
import {type Module, parse} from "@swc/core";
import {
  DotaComponentCandidate,
  extractComponentCandidatesFromAst,
  extractRouteCandidatesFromAst,
  extractRouteCandidatesFromComponents,
  isComponentMetadataChanged,
  isRouteMetadataChanged,
  resolveComponentExport,
  scanDotaComponents,
  type DotaRouteCandidate,
  prepareRouteMetadataExport,
  prepareRouteConfigExport
} from "@dota/domain";

let logger = consola;

/**
 * Configuration options for the Dota Vite Preloader plugin.
 * Allows customization of the component scanning root directory and logging verbosity.
 *
 * @property root - Root directory path for component scanning (defaults to process.cwd())
 * @property logType - Logging level for plugin output (defaults to 'info')
 */
export type PluginConfig = {
  root?: string;
  logType?: LogType
}

/**
 * Vite plugin that automatically discovers and preloads Dota web components.
 * Scans the project for @Component decorated classes, generates a virtual module
 * that imports and exports them, enabling automatic component registration.
 * The plugin caches component candidates for performance and provides detailed logging.
 *
 * @param config - Plugin configuration with optional root path and log level
 * @returns Vite plugin instance with resolveId, load, and buildStart hooks
 */
export default function dotaVitePreloader({root = process.cwd(), logType = 'info'}: PluginConfig): Plugin {
  // Plugin-scope cache: accessible from buildStart/resolveId/load/etc.
  let cachedCandidates: DotaComponentCandidate[] | null = null;
  let cachedRouteCandidates: DotaRouteCandidate[] | null = null;
  logger = createConsola({
    level: LogLevels[logType],
    formatOptions: {
      date: true,
      colors: true
    }
  });

  async function ensureCandidatesLoaded() {
    if (!cachedCandidates) {
      cachedCandidates = await scanDotaComponents(root, logger);
    }
    return cachedCandidates;
  }

  async function ensureRouteCandidatesLoaded() {
    if (!cachedRouteCandidates) {
      const candidates = await ensureCandidatesLoaded();
      cachedRouteCandidates = await extractRouteCandidatesFromComponents(candidates, root, logger);
    }
    return cachedRouteCandidates;
  }

  function invalidateVirtualModule(server: ViteDevServer) {
    const componentModule = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_COMPONENTS);
    if (componentModule) server.moduleGraph.invalidateModule(componentModule);

    const routeModule = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_ROUTES);
    if (routeModule) server.moduleGraph.invalidateModule(routeModule);

    const routeMetadataModule = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_ROUTE_METADATA);
    if (routeMetadataModule) server.moduleGraph.invalidateModule(routeMetadataModule);

    server.ws.send({type: 'full-reload'});
  }

  return {
    name: 'vite-plugin-dota-preloader',
    resolveId(id) {
      if (id === VirtualImportID.DOTA_COMPONENTS) return VirtualImportID.RESOLVED_DOTA_COMPONENTS;
      if (id === VirtualImportID.DOTA_ROUTES) return VirtualImportID.RESOLVED_DOTA_ROUTES;
      if (id === VirtualImportID.DOTA_ROUTE_METADATA) return VirtualImportID.RESOLVED_DOTA_ROUTE_METADATA;
      return null;
    },

    async load(id) {
      if (id === VirtualImportID.RESOLVED_DOTA_COMPONENTS) {
        const candidates = await ensureCandidatesLoaded();
        return await resolveComponentExport(candidates);
      }

      if (id === VirtualImportID.RESOLVED_DOTA_ROUTES) {
        const routeCandidates = await ensureRouteCandidatesLoaded();
        return await prepareRouteConfigExport(routeCandidates);
      }

      if (id === VirtualImportID.RESOLVED_DOTA_ROUTE_METADATA) {
        const routeCandidates = await ensureRouteCandidatesLoaded();
        return prepareRouteMetadataExport(routeCandidates);
      }

      return null;
    },

    async buildStart() {
      cachedCandidates = await scanDotaComponents(root, logger); // Cache the candidates for potential later use
      cachedRouteCandidates = await extractRouteCandidatesFromComponents(cachedCandidates, root, logger);
      logger.info(`Loaded Dota Component Candidates: ${cachedCandidates.length} components found.`);
      logger.info(`Loaded Dota Route Candidates: ${cachedRouteCandidates.length} routes found.`);
    },

    configureServer(server: ViteDevServer) {
      const reloadVirtualModule = (file: string, event: string) => {
        logger.debug(`Component file ${event}: ${file}. Reloading virtual module...`);
        cachedCandidates = null;
        cachedRouteCandidates = null;
        invalidateVirtualModule(server);
      };

      server.watcher.on('add', (file) => {
        if (!ComponentUtils.isComponentFile(file, root)) return;
        reloadVirtualModule(file, 'added');
      });

      server.watcher.on('unlink', (file) => {
        if (!ComponentUtils.isComponentFile(file, root)) return;
        reloadVirtualModule(file, 'removed');
      });

      server.watcher.on('change', async (file) => {
        if (!ComponentUtils.isComponentFile(file, root)) return;

        // Only reload the virtual module if registration metadata (class name / selector)
        // actually changed. Pure implementation edits are handled by Vite's normal HMR.
        const relPath = relative(root, file).replace(/\\/g, '/');
        const prevCandidates = cachedCandidates?.filter(c => c.filePath === relPath) ?? [];
        const prevRouteCandidates = cachedRouteCandidates?.filter(c => c.filePath === relPath) ?? [];

        let code: string;
        try {
          code = await readFile(file, 'utf-8');
        } catch {
          reloadVirtualModule(file, 'changed (read error)');
          return;
        }

        let ast: Module;
        try {
          ast = await parse(code, {syntax: 'typescript', decorators: true});
        } catch {
          reloadVirtualModule(file, 'changed (parse error)');
          return;
        }

        const nextCandidates = extractComponentCandidatesFromAst(ast);
        const nextRouteCandidates = extractRouteCandidatesFromAst(ast, code);
        const metadataChanged =
          isComponentMetadataChanged(prevCandidates, nextCandidates) ||
          isRouteMetadataChanged(prevRouteCandidates, nextRouteCandidates);

        if (metadataChanged) {
          reloadVirtualModule(file, 'changed');
        }
        // else: let Vite HMR handle the implementation-only change
      });
    },
  }
}
