import { createConsola, LogLevels, type LogType } from 'consola';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { EventMapModuleConstants } from '@dota/Constants.ts';
import { EventMapDeclarationUtils } from '@dota/generate/EventMapDeclarationUtils.ts';
import { EventMapLocationUtils } from '@dota/generate/EventMapLocationUtils.ts';
import { scanEventMapSources } from '@dota/scan/EventMapScanner.ts';
import type { EventMapGeneratorPluginConfig, EventMapLocationGeneratorConfig } from '@dota/Types.ts';

let log = createConsola();

/**
 * Writes the declaration and optional source-navigation artifacts from one scan.
 * Both outputs share candidates so enabling locations adds metadata without a second
 * filesystem discovery or parse pass; each output creates its own parent directory.
 * @param root Package root used to resolve scan roots and output paths.
 * @param options Plugin configuration controlling declaration and location output.
 * @returns A promise that resolves after every enabled file is durable.
 * @throws When the declaration and location paths resolve to the same file.
 */
async function writeGeneratedArtifacts(
  root: string,
  options: EventMapGeneratorPluginConfig,
): Promise<void> {
  const scanRoots = options.scanRoots ?? [root];
  const locationOutput = resolveLocationOutput(root, options.eventLocations);
  const outFile = resolve(root, options.outFile ?? EventMapModuleConstants.DEFAULT_OUTPUT_PATH);
  if (locationOutput === outFile) {
    throw new Error('Event declaration and location outputs must use different files');
  }

  const scannedCandidates = await scanEventMapSources(root, scanRoots, {
    includeLocations: locationOutput != null,
  });
  const artifact = EventMapDeclarationUtils.createDeclaration(scannedCandidates, {
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
  return file.endsWith('.ts') && !file.endsWith('.d.ts');
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

  log = createConsola({
    level: LogLevels[logType],
    formatOptions: {
      date: true,
      colors: true
    }
  });

  /** Runs the shared scan and writes every artifact enabled by the plugin options. */
  const regenerate = async (): Promise<void> => {
    await writeGeneratedArtifacts(root, options);
  };

  return {
    name: 'vite-plugin-event-map-generator',
    async configResolved(config: ResolvedConfig) {
      if (!options.root) {
        root = config.root;
      }
    },
    async buildStart() {
      await regenerate();
    },
    configureServer(server: ViteDevServer) {
      /**
       * Regenerates artifacts for one supported source change, then reloads the client.
       * @param file Absolute or watcher-provided source path that triggered the refresh.
       */
      const rebuild = async (file: string) => {
        if (!shouldRebuild(file)) return;
        await regenerate();
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
  EventMapScanCandidate,
  EventMapScanOptions,
  EventMapSourceLocation,
} from '@dota/Types.ts';
export { EventMapDeclarationUtils } from '@dota/generate/EventMapDeclarationUtils.ts';
export { EventMapLocationUtils } from '@dota/generate/EventMapLocationUtils.ts';
export { scanEventMapSources } from '@dota/scan/EventMapScanner.ts';
