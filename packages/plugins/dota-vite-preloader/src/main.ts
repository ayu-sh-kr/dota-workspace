import {ASTFilterConstants, ComponentScanPath, VirtualImportID} from "@dota/Constants.ts";
import fg from "fast-glob";
import {readFile} from "node:fs/promises";
import {relative} from "node:path";
import {ClassDeclaration, type Module, parse} from "@swc/core";
import {Plugin, ViteDevServer} from "vite";
import {ASTHelperUtils} from "@dota/ASTHelperUtils.ts";
import {ComponentUtils} from "@dota/ComponentUtils.ts";
import {consola, createConsola, LogLevels, LogType} from 'consola';
import {
  DeclarationUtils,
  DecoratorView,
  ExportDeclarationQueryImpl,
  KeyValuePropertyView,
  ObjectExpressionView
} from "@ayu-sh-kr/dota-ast-utils";


/**
 * Represents a candidate Dota component discovered during the scanning process.
 * Contains metadata about the component, including its class name, file location,
 * and the custom element tag name used for registration.
 *
 * @property name - The class name of the component
 * @property filePath - The relative file path where the component is defined
 * @property tagName - The HTML custom element tag name (selector) for the component
 */
export type DotaComponentCandidate = {
  name: string;
  filePath: string;
  tagName: string;
}

let logger = consola;

/**
 * Extracts component metadata from a class declaration by analyzing its @Component decorator.
 * Searches for the Component decorator and extracts the selector (tag name) from its configuration.
 * Returns null if the class is not decorated with @Component or lacks required metadata.
 *
 * @param classDecl - The AST class declaration node to analyze
 * @returns A DotaComponentCandidate object if valid component found, null otherwise
 */
function extractComponentCandidateFromClassDeclaration(classDecl: ClassDeclaration): DotaComponentCandidate | null {
  const decorators = ASTHelperUtils.getDecorators(classDecl);
  for (const decorator of decorators) {
    const decoratorView = DecoratorView.from(decorator);
    const decoratorName = decoratorView.getName();
    if (decoratorName == null || decoratorName !== ASTFilterConstants.COMPONENT_DECORATOR_NAME) {
      continue;
    }

    const args = decoratorView.getArguments();
    if (args.length === 0) {
      continue;
    }

    const firstArgument = args[0];
    if (firstArgument == null || firstArgument.expression.type !== "ObjectExpression") {
      continue;
    }

    const componentObjectExpression = ObjectExpressionView.from(firstArgument.expression);
    const componentTagProperty = componentObjectExpression.getProperty(ASTFilterConstants.COMPONENT_TAG_NAME_PROPERTY);
    if (componentTagProperty == null) {
      continue;
    }

    const keyValuePropertyView = KeyValuePropertyView.from(componentTagProperty);
    const tagValue = keyValuePropertyView.getString();
    if (tagValue == null) {
      continue;
    }
    const className = ASTHelperUtils.getClassName(classDecl);
    if (className == null) {
      continue;
    }

    return {
      name: className,
      filePath: '',
      tagName: tagValue
    };
  }
  return null;
}

/**
 * Extracts all component candidates from a parsed TypeScript module AST.
 * Filters exported class declarations and attempts to extract component metadata from each.
 * Returns an array of component candidates, which may include null entries for non-components.
 *
 * @param ast - The parsed SWC module AST to analyze
 * @returns Array of DotaComponentCandidate objects (may contain nulls)
 */
function extractComponentCandidateFromAst(ast: Module): DotaComponentCandidate[] {
  const body = ast.body;
  return new ExportDeclarationQueryImpl(ast, DeclarationUtils.extractDeclarations(body, 'ExportDeclaration'))
    .getClassDeclarations()
    .filter(classDecl => classDecl.decorators != null)
    .map(classDecl => extractComponentCandidateFromClassDeclaration(classDecl))
}

/**
 * Scans the project directory for Dota component files and extracts component metadata.
 * Uses fast-glob to find TypeScript files in configured paths, then parses each file's AST
 * to identify classes decorated with @Component. Handles parsing errors gracefully and logs
 * discovered components.
 *
 * @param root - The root directory path to scan from
 * @returns Promise resolving to array of all discovered component candidates
 */
async function scanDotaComponents(root: string): Promise<DotaComponentCandidate[]> {
  const files = await fg([
    ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH
  ], {cwd: root, absolute: false});

  const candidated: DotaComponentCandidate[] = []

  for (const file of files) {
    const code = await readFile(file, 'utf-8');
    let ast: Module;
    try {
      ast = await parse(code, {syntax: 'typescript', decorators: true});
    } catch (e) {
      logger.error(`Failed to parse ${file}: ${e}`);
      continue;
    }

    const candidates = extractComponentCandidateFromAst(ast)
      .map(candidate => {
        candidate.filePath = file;
        logger.debug(`Found component candidate ${candidate.name} in file ${file} with tag ${candidate.tagName}`);
        return candidate;
      });
    candidated.push(...candidates);
  }

  return candidated;
}

/**
 * Generates ES module import statements for all discovered component candidates.
 * Creates a single import statement per component using relative file paths.
 * The generated imports are used in the virtual module to make components available.
 *
 * @param candidates - Array of component candidates to generate imports for
 * @returns Promise resolving to newline-separated import statements
 */
async function prepareComponentImports(candidates: DotaComponentCandidate[]): Promise<string> {
  const importStatementTemplate = "import { %s } from '%s';";
  return candidates.map(candidate => {
    const filePath = candidate.filePath;
    const componentName = candidate.name;
    const importPath = filePath.startsWith('./') ? filePath : `./${filePath}`;
    return importStatementTemplate
      .replace('%s', componentName)
      .replace('%s', importPath);
  }).join('\n');
}

/**
 * Generates a default export statement containing all component class names.
 * Creates an array export with all component classes for registration with the Dota framework.
 * The exported array is used by the application to register all discovered components.
 *
 * @param candidates - Array of component candidates to include in the export
 * @returns Promise resolving to a default export statement with component array
 */
async function prepareComponentExports(candidates: DotaComponentCandidate[]): Promise<string> {
  const exportStatementTemplate = "export default [%s]"
  const componentNames = candidates
    .map(candidate => candidate.name)
    .join(', ');
  return exportStatementTemplate.replace('%s', componentNames);
}

/**
 * Combines component imports and exports into a complete virtual module source.
 * Generates the full module code that imports all discovered components and exports
 * them as a default array. This module is served by the virtual module system.
 *
 * @param candidates - Array of component candidates to process
 * @returns Promise resolving to complete module source code with imports and exports
 */
async function resolveComponentExport(candidates: DotaComponentCandidate[]): Promise<string> {
  const imports = await prepareComponentImports(candidates);
  const exports = await prepareComponentExports(candidates);
  return `${imports}\n\n${exports}`;
}


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
  logger = createConsola({
    level: LogLevels[logType],
    formatOptions: {
      date: true,
      colors: true
    }
  });

  async function ensureCandidatesLoaded() {
    if (!cachedCandidates) {
      cachedCandidates = await scanDotaComponents(root);
    }
    return cachedCandidates;
  }

  function invalidateVirtualModule(server: ViteDevServer) {
    const mod = server.moduleGraph.getModuleById(VirtualImportID.RESOLVED_DOTA_COMPONENTS);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
    }
    server.ws.send({type: 'full-reload'});
  }

  return {
    name: 'vite-plugin-dota-preloader',
    resolveId(id) {
      if (id === VirtualImportID.DOTA_COMPONENTS) return VirtualImportID.RESOLVED_DOTA_COMPONENTS;
      return null;
    },

    async load(id) {
      if (id !== VirtualImportID.RESOLVED_DOTA_COMPONENTS) return null;
      const candidates = await ensureCandidatesLoaded();
      return await resolveComponentExport(candidates);
    },

    async buildStart() {
      cachedCandidates = await scanDotaComponents(root); // Cache the candidates for potential later use
      logger.info(`Loaded Dota Component Candidates: ${cachedCandidates.length} components found.`);
    },

    configureServer(server: ViteDevServer) {
      const reloadVirtualModule = (file: string, event: string) => {
        logger.debug(`Component file ${event}: ${file}. Reloading virtual module...`);
        cachedCandidates = null;
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

        const nextCandidates = extractComponentCandidateFromAst(ast).filter(Boolean);

        const metadataChanged =
          nextCandidates.length !== prevCandidates.length ||
          nextCandidates.some((next, i) => {
            const prev = prevCandidates[i];
            return !prev || next.name !== prev.name || next.tagName !== prev.tagName;
          });

        if (metadataChanged) {
          reloadVirtualModule(file, 'changed');
        }
        // else: let Vite HMR handle the implementation-only change
      });
    },
  }
}
