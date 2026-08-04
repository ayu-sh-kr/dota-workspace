import { createConsola, LogLevels, type LogType } from 'consola';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { AstPathAlias } from '@ayu-sh-kr/dota-ast-utils';
import { BUILT_IN_EVENT_NAMES, EventMapModuleConstants, ViteAliasConstants } from '@dota/Constants.ts';
import { EventMapDeclarationUtils } from '@dota/generate/EventMapDeclarationUtils.ts';
import { EventMapLocationUtils } from '@dota/generate/EventMapLocationUtils.ts';
import { scanEventMapSources } from '@dota/scan/EventMapScanner.ts';
import type {
  EventMapGeneratorPluginConfig,
  EventMapLocationGeneratorConfig,
  EventMapResolutionDiagnostic,
  EventMapResolverOptions,
  EventMapScanCandidate,
} from '@dota/Types.ts';

let log = createConsola();

/**
 * Writes the declaration and optional source-navigation artifacts from one scan.
 * Both outputs share candidates, so enabling locations adds metadata without a second
 * filesystem discovery or parse pass; each output creates its own parent directory.
 * @param root Package root used to resolve scan roots and output paths.
 * @param options Plugin configuration controlling declaration and location output.
 * @returns A promise that resolves after every enabled file is durable.
 * @throws When the declaration and location paths resolve to the same file.
 */
async function writeGeneratedArtifacts(
  root: string,
  options: EventMapGeneratorPluginConfig,
  resolverOptions?: EventMapResolverOptions,
): Promise<void> {
  const scanRoots = options.scanRoots ?? [root];
  const locationOutput = resolveLocationOutput(root, options.eventLocations);
  const outFile = resolve(root, options.outFile ?? EventMapModuleConstants.DEFAULT_OUTPUT_PATH);
  if (locationOutput === outFile) {
    throw new Error('Event declaration and location outputs must use different files');
  }

  const scanOptions = {
    includeLocations: locationOutput != null,
    ...(resolverOptions == null ? {} : {
      resolver: resolverOptions,
      onResolutionFailure: (diagnostic: EventMapResolutionDiagnostic) => {
        log.debug(`Skipped unresolved event expression ${diagnostic.expressionType} in ${diagnostic.sourceFile}: ${diagnostic.reason}`);
      },
    }),
  };
  const scannedCandidates = await scanEventMapSources(root, scanRoots, scanOptions);
  const candidates = mergeBuiltInEventCandidates(root, scannedCandidates);
  const artifact = EventMapDeclarationUtils.createDeclaration(candidates, {
    moduleSpecifier: options.moduleSpecifier ?? EventMapModuleConstants.DEFAULT_MODULE_SPECIFIER,
    outFile,
  });

  const locationContents = locationOutput == null
    ? null
    : `${JSON.stringify(EventMapLocationUtils.createArtifact(scannedCandidates, {root}), null, 2)}\n`;
  const writes: Array<Promise<void>> = [writeGeneratedFile(outFile, artifact.declaration)];
  if (locationOutput != null && locationContents != null) {
    writes.push(writeGeneratedFile(locationOutput, locationContents));
  }

  await Promise.all(writes);
  log.info(`Generated ${artifact.names.length} application event entries at ${outFile}`);
  if (locationOutput != null) {
    log.info(`Generated event source locations at ${locationOutput}`);
  }
}

/**
 * Adds the library-owned lifecycle contract to application observations.
 * Built-ins use incomplete `any` payloads for compatibility and carry no
 * source location because they are registry entries rather than source calls.
 * @param root Package root used as the synthetic ownership context.
 * @param candidates User-source event observations from the scanner.
 * @returns A new candidate list containing each built-in event exactly once.
 */
function mergeBuiltInEventCandidates(root: string, candidates: EventMapScanCandidate[]): EventMapScanCandidate[] {
  const builtInCandidates: EventMapScanCandidate[] = BUILT_IN_EVENT_NAMES.map(name => ({
    name,
    sourceFile: root,
    kind: 'decorator',
    payload: {text: 'any', isComplete: false, imports: []},
  }));

  return [...builtInCandidates, ...candidates];
}

/**
 * Resolves the opt-in location artifact path while keeping declaration defaults unchanged.
 * A boolean enables the standard path; an object allows consumers to choose a relative path.
 * @param root Package root used to resolve the configured output.
 * @param config Optional location shorthand or path configuration.
 * @returns An absolute output path when enabled, otherwise `null`.
 */
function resolveLocationOutput(
  root: string,
  config: EventMapGeneratorPluginConfig['eventLocations'],
): string | null {
  if (config == null || config === false) return null;

  const locationConfig: EventMapLocationGeneratorConfig = config === true ? {} : config;
  return resolve(root, locationConfig.outFile ?? EventMapModuleConstants.DEFAULT_LOCATION_OUTPUT_PATH);
}

/**
 * Creates the parent directory and writes one generated artifact as UTF-8 text.
 * Keeping this side effect at the file boundary lets declaration and location writes
 * run concurrently without duplicating directory setup policy in the orchestrator.
 * @param file Absolute destination path for the generated artifact.
 * @param contents Complete generated text, including its final newline policy.
 * @returns A promise that resolves after the file is written.
 */
async function writeGeneratedFile(file: string, contents: string): Promise<void> {
  await mkdir(dirname(file), {recursive: true});
  await writeFile(file, contents, 'utf8');
}

/**
 * Limits watcher regeneration to source files that can contribute event metadata.
 * Declaration files are excluded because the plugin owns their output and would
 * otherwise trigger a feedback loop during development.
 * @param file Absolute or watcher-provided path to inspect.
 * @returns Whether the file is a supported source input.
 */
function shouldRebuild(file: string): boolean {
  return !file.endsWith('.d.ts');
}

/**
 * Converts Vite's resolved alias list and explicit plugin aliases into one plain AST model.
 * Regex aliases are skipped because the generic resolver only accepts deterministic string mappings.
 * Vite's internal client aliases are ignored silently; unsupported user aliases retain a warning.
 * Explicit aliases take precedence when their visible prefix is equal.
 * @param root Effective Vite/project root used to normalize relative replacements.
 * @param explicit Explicit aliases supplied directly to the event generator.
 * @param viteAliases Alias entries produced by Vite's resolved configuration.
 * @returns Resolver settings safe to pass into `dota-ast-utils`.
 */
function normalizeResolverOptions(
  root: string,
  explicit: EventMapResolverOptions | undefined,
  viteAliases?: unknown,
): EventMapResolverOptions | undefined {
  const explicitAliases = normalizeAliasEntries(root, explicit?.aliases ?? [], false);
  const configAliases = normalizeAliasEntries(root, viteAliases, true);
  const aliases = [...explicitAliases, ...configAliases];
  if (explicit == null && aliases.length === 0) return undefined;
  return {...explicit, ...(aliases.length === 0 ? {} : {aliases})};
}

/**
 * Normalizes either Vite's array/object alias shape or the explicit AST alias contract.
 * Replacements become absolute before the resolver sees them, preventing process-cwd dependent
 * imports and keeping all alias targets inside the scanner's indexed boundary.
 * @param root Effective Vite/project root used for relative replacements.
 * @param aliases Alias collection from plugin options or Vite.
 * @param fromVite Whether entries should be interpreted as Vite alias records.
 * @returns Deterministically ordered string alias mappings.
 */
function normalizeAliasEntries(root: string, aliases: unknown, fromVite: boolean): AstPathAlias[] {
  const records = Array.isArray(aliases)
    ? aliases
    : aliases != null && typeof aliases === 'object'
      ? Object.entries(aliases as Record<string, unknown>).map(([find, replacement]) => ({find, replacement}))
      : [];

  return records.flatMap(record => {
    const entry = record as {find?: unknown; replacement?: unknown; kind?: unknown};
    const find = entry.find;
    const replacement = entry.replacement;
    if (typeof find !== 'string' || typeof replacement !== 'string') {
      if (find instanceof RegExp) {
        const isViteInternalAlias = fromVite
          && find.source.startsWith(ViteAliasConstants.INTERNAL_ALIAS_SOURCE_PREFIX);
        if (!isViteInternalAlias) log.warn(`Skipping unsupported regex event alias ${find}`);
      }
      return [];
    }

    const kind = fromVite
      ? (find.includes('*') ? 'wildcard' : 'prefix')
      : entry.kind === 'exact' || entry.kind === 'wildcard' ? entry.kind : 'prefix';
    return [{find, replacement: isAbsolute(replacement) ? replacement : resolve(root, replacement), kind}];
  });
}

/**
 * Checks whether a watcher path can affect the configured event scan.
 * Declaration outputs, unsupported suffixes, and files outside every scan root are ignored
 * before a scan is scheduled, which is important when shared UI roots sit outside Vite root.
 * @param file Absolute or watcher-provided source path.
 * @param root Effective project root used to resolve relative scan roots.
 * @param scanRoots Configured roots whose `src` trees are scanned.
 * @param extensions Accepted source suffixes, defaulting to `.ts`.
 * @returns Whether the path is a contributing source file.
 */
export function isEventMapSourceFile(file: string, root: string, scanRoots: string[], extensions: string[] = ['.ts']): boolean {
  if (!shouldRebuild(file)) return false;
  const normalizedFile = resolve(file);
  const normalizedExtensions = extensions.map(extension => extension.startsWith('.') ? extension : `.${extension}`);
  if (!normalizedExtensions.some(extension => normalizedFile.endsWith(extension)) || normalizedFile.endsWith('.d.ts')) return false;

  return scanRoots.some(scanRoot => {
    const normalizedRoot = resolve(root, scanRoot);
    return normalizedFile === normalizedRoot || normalizedFile.startsWith(`${normalizedRoot}/`);
  });
}

/**
 * Creates the Vite plugin that generates the event declaration and optional locations.
 * Build and watcher hooks share one scan so enabling source navigation does not duplicate
 * filesystem work; location JSON remains disabled unless `eventLocations` is configured.
 * @param options Root, outputs, scan roots, logging, and optional location settings.
 * @returns A Vite plugin with build-time and source-change generation hooks.
 */
export default function eventMapGenerator(options: EventMapGeneratorPluginConfig = {}): Plugin {
  const { logType = 'info' } = options;
  let root = options.root ?? process.cwd();
  let resolverOptions = normalizeResolverOptions(root, options.resolver);

  log = createConsola({
    level: LogLevels[logType],
    formatOptions: {
      date: true,
      colors: true
    }
  });

  /** Runs the shared scan and writes every artifact enabled by the plugin options. */
  const regenerate = async (): Promise<void> => {
    await writeGeneratedArtifacts(root, options, resolverOptions);
  };

  return {
    name: 'vite-plugin-event-map-generator',
    async configResolved(config: ResolvedConfig) {
      if (!options.root) {
        root = config.root;
      }
      resolverOptions = normalizeResolverOptions(root, options.resolver, config.resolve.alias);
    },
    async buildStart() {
      await regenerate();
    },
    configureServer(server: ViteDevServer) {
      const scanRoots = options.scanRoots ?? [root];
      const extensions = resolverOptions?.extensions ?? ['.ts'];
      const externalScanRoots = scanRoots.map(scanRoot => resolve(root, scanRoot)).filter(scanRoot => scanRoot !== root);
      if (externalScanRoots.length > 0) server.watcher.add(externalScanRoots);

      let pendingRefresh: Promise<void> | null = null;
      const refresh = (): Promise<void> => {
        if (pendingRefresh != null) return pendingRefresh;
        pendingRefresh = regenerate().finally(() => {
          pendingRefresh = null;
        });
        return pendingRefresh;
      };

      /**
       * Regenerates artifacts for one supported source change, then reloads the client.
       * @param file Absolute or watcher-provided source path that triggered the refresh.
       */
      const rebuild = async (file: string) => {
        if (!isEventMapSourceFile(file, root, scanRoots, extensions)) return;
        await refresh();
        server.ws.send({type: 'full-reload'});
      };

      server.watcher.on('add', rebuild);
      server.watcher.on('change', rebuild);
      server.watcher.on('unlink', rebuild);
    }
  };
}

export type { EventMapGeneratorPluginConfig } from '@dota/Types.ts';
export type {
  EventMapLocationArtifact,
  EventMapLocationEntry,
  EventMapLocationGenerationOptions,
  EventMapLocationGeneratorConfig,
  EventMapResolutionDiagnostic,
  EventMapResolverOptions,
  EventMapScanCandidate,
  EventMapScanOptions,
  EventMapSourceLocation,
} from '@dota/Types.ts';
export { EventMapDeclarationUtils } from '@dota/generate/EventMapDeclarationUtils.ts';
export { EventMapLocationUtils } from '@dota/generate/EventMapLocationUtils.ts';
export { scanEventMapSources } from '@dota/scan/EventMapScanner.ts';
