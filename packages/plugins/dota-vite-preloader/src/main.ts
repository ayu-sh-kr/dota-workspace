import {Plugin, ViteDevServer} from "vite";
import {ComponentUtils} from "@dota/ComponentUtils.ts";
import {createDotaLogger} from '@ayu-sh-kr/dota-common-utils';
import type {LogType} from 'consola';
import {VirtualImportID} from "@dota/Constants.ts";
import {relative} from "node:path";
import {SourceFileIndex} from "@ayu-sh-kr/dota-ast-utils";
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
  prepareRouteConfigExport,
  buildComponentDependencyGraph,
  prepareComponentRegistryExport,
  prepareSharedChunkGroup,
  type ComponentDependencyGraph
} from "@dota/domain";

let logger = createDotaLogger('dota-vite-preloader', 'main.ts');

/**
 * Configuration options for the Dota Vite Preloader plugin.
 * Allows customization of the component scanning root directory and logging verbosity.
 *
 * @property root - Root directory path for component scanning (defaults to process.cwd())
 * @property logType - Logging level for plugin output (defaults to 'info')
 * @property sharedChunk - `false` stops merging shared support modules into one client chunk
 */
export type PluginConfig = {
  root?: string;
  logType?: LogType;
  sharedChunk?: false;
}

/**
 * Vite plugin that automatically discovers and preloads Dota web components.
 * Scans the project for @Component decorated classes, generates a virtual module
 * that imports and exports them, enabling automatic component registration.
 * `virtual:dota-component-registry` exposes the same components as per-tag lazy loaders
 * plus their template dependencies, so applications can load each route's code on demand.
 * The plugin caches component candidates for performance and provides detailed logging.
 *
 * @param config - Plugin configuration with optional root path and log level
 * @returns Vite plugin instance with resolveId, load, and buildStart hooks
 */
export default function dotaVitePreloader({root = process.cwd(), logType, sharedChunk}: PluginConfig): Plugin {
  // Plugin-scope cache: accessible from buildStart/resolveId/load/etc.
  let cachedCandidates: DotaComponentCandidate[] | null = null;
  let cachedRouteCandidates: DotaRouteCandidate[] | null = null;
  let cachedDependencies: ComponentDependencyGraph | null = null;
  logger = createDotaLogger('dota-vite-preloader', 'main.ts', logType);

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

  async function ensureDependenciesLoaded() {
    if (!cachedDependencies) {
      cachedDependencies = await buildComponentDependencyGraph(await ensureCandidatesLoaded(), root, logger);
    }
    return cachedDependencies;
  }

  /** Template edits can add or drop child tags without changing registration metadata. */
  function invalidateRegistryModule(server: ViteDevServer) {
    cachedDependencies = null;
    const registryModule = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_COMPONENT_REGISTRY);
    if (registryModule) server.moduleGraph.invalidateModule(registryModule);
  }

  function invalidateVirtualModule(server: ViteDevServer) {
    const componentModule = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_COMPONENTS);
    if (componentModule) server.moduleGraph.invalidateModule(componentModule);

    const routeModule = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_ROUTES);
    if (routeModule) server.moduleGraph.invalidateModule(routeModule);

    const routeMetadataModule = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_ROUTE_METADATA);
    if (routeMetadataModule) server.moduleGraph.invalidateModule(routeMetadataModule);

    invalidateRegistryModule(server);

    server.ws.send({type: 'full-reload'});
  }

  return {
    name: 'vite-plugin-dota-preloader',

    /** Groups shared support modules for client builds; server builds keep Vite's defaults. */
    config(_config, env) {
      if (sharedChunk === false || env.command !== 'build' || env.isSsrBuild) return;
      // Only the matched modules join the group; libraries they import keep their own chunks.
      const codeSplitting = {includeDependenciesRecursively: false, groups: [prepareSharedChunkGroup(root)]};
      return {build: {rolldownOptions: {output: {codeSplitting}}}};
    },
    resolveId(id) {
      if (id === VirtualImportID.DOTA_COMPONENTS) return VirtualImportID.RESOLVED_DOTA_COMPONENTS;
      if (id === VirtualImportID.DOTA_ROUTES) return VirtualImportID.RESOLVED_DOTA_ROUTES;
      if (id === VirtualImportID.DOTA_ROUTE_METADATA) return VirtualImportID.RESOLVED_DOTA_ROUTE_METADATA;
      if (id === VirtualImportID.DOTA_COMPONENT_REGISTRY) return VirtualImportID.RESOLVED_DOTA_COMPONENT_REGISTRY;
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

      if (id === VirtualImportID.RESOLVED_DOTA_COMPONENT_REGISTRY) {
        const candidates = await ensureCandidatesLoaded();
        return prepareComponentRegistryExport(candidates, await ensureDependenciesLoaded());
      }

      return null;
    },

    async buildStart() {
      cachedCandidates = await scanDotaComponents(root, logger); // Cache the candidates for potential later use
      cachedRouteCandidates = await extractRouteCandidatesFromComponents(cachedCandidates, root, logger);
      cachedDependencies = null;
      logger.info(`Loaded ${cachedCandidates.length} components and ${cachedRouteCandidates.length} routes`);
      logger.debug(`Component and route metadata loaded from ${root}`);
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

        let module;
        try {
          module = await SourceFileIndex.shared().load(file);
        } catch {
          reloadVirtualModule(file, 'changed (read or parse error)');
          return;
        }

        const nextCandidates = extractComponentCandidatesFromAst(module.ast);
        const nextRouteCandidates = extractRouteCandidatesFromAst(module.ast, module.sourceText);
        const metadataChanged =
          isComponentMetadataChanged(prevCandidates, nextCandidates) ||
          isRouteMetadataChanged(prevRouteCandidates, nextRouteCandidates);

        if (metadataChanged) {
          reloadVirtualModule(file, 'changed');
        } else {
          // Vite HMR handles the implementation; only the template dependency graph may be stale.
          invalidateRegistryModule(server);
        }
      });
    },
  }
}
