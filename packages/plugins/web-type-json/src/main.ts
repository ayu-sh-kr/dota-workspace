import {ClassView, DeclarationUtils, DecoratorUtils, DecoratorView, ObjectExpressionView, PropertyView} from "@ayu-sh-kr/dota-ast-utils";
import type { Plugin } from 'vite';
import {ComponentScanPath} from "@dota/Constants.ts";
import fg from "fast-glob";
import {readFile, writeFile} from "node:fs/promises";
import {relative, resolve, sep} from "node:path";
import {ClassDeclaration, parse} from "@swc/core";
import {ConsolaInstance, createConsola, LogLevels} from "consola";
import type {PackageJsonWithWebTypes, WebComponentInfo, WebTypeJsonPluginConfig, WebTypesSchema} from "./Types.ts";


let log: ConsolaInstance

/**
 * Converts an absolute source path into the slash-normalized path web-types expects.
 * Keeps the path relative to the package root while preserving an explicit `./` prefix.
 * @param root Package root used as the source-path base.
 * @param file Absolute source file path discovered during scanning.
 */
function toWebTypesSourceFile(root: string, file: string) {
  const relativePath = relative(root, file).split(sep).join('/');
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function compareOptionalNumber(left?: number, right?: number) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

function compareOptionalString(left?: string, right?: string) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left.localeCompare(right);
}

/**
 * Keeps generated web-type entries stable across repeated scans.
 * Sorts components and their properties by identity, then uses source metadata as tie-breakers.
 * Returns copied arrays so callers do not observe mutations to scanned metadata.
 * @param scannedWebComponentInfos Component metadata collected from source files.
 * @returns A deterministically sorted copy of the component metadata.
 */
function sortWebComponentInfos(scannedWebComponentInfos: WebComponentInfo[]): WebComponentInfo[] {
  return [...scannedWebComponentInfos]
    .map(component => ({
      ...component,
      properties: [...component.properties].sort((left, right) =>
        left.name.localeCompare(right.name)
        || compareOptionalNumber(left.source?.offset, right.source?.offset)
        || compareOptionalString(left.source?.file, right.source?.file)
        || left.type.localeCompare(right.type),
      ),
    }))
    .sort((left, right) =>
      left.tagName.localeCompare(right.tagName)
      || left.className.localeCompare(right.className)
      || compareOptionalString(left.source?.file, right.source?.file)
      || compareOptionalNumber(left.source?.offset, right.source?.offset),
    );
}

/**
 * Limits watcher-triggered rescans to source files that can define web components.
 * Supports component files under `src/` and page files under `src/pages/`.
 * @param file Absolute or watcher-provided path to inspect.
 * @param root Package root used to calculate the file's relative path.
 * @returns Whether the file matches a supported component or page naming convention.
 */
function isScannableComponentFile(file: string, root: string) {
  const relativePath = relative(root, file).replace(/\\/g, '/');
  return (
    (relativePath.startsWith('src/') && relativePath.endsWith('.component.ts'))
    || (relativePath.startsWith('src/pages/') && relativePath.endsWith('.page.ts'))
  );
}

/**
 * Resets plugin state for test isolation and future stateful implementations.
 * The current scanner has no module-level state that requires cleanup.
 */
export function resetWebTypeJsonState() {
  // no module-level state to reset
}

/**
 * Scans configured source roots for decorated web components and their properties.
 * Reads and parses matching TypeScript files, then sorts results for stable generation.
 * @param root Package root used for source references in the generated schema.
 * @param scanRoots Roots to search; defaults to the package root when omitted.
 * @returns Component metadata extracted from all matching source files.
 */
export async function scanWebComponents(root: string, scanRoots: string[] = [root]) {
  log.debug('Start scanning web components...')
  const files = (await Promise.all(scanRoots.map(async (scanRoot) => {
    return fg([
      ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
      ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
      ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH
    ], {cwd: scanRoot, absolute: true});
  }))).flat().sort((left, right) => left.localeCompare(right));
  log.debug('Scanned files: ', files.length)

  const scannedWebComponentInfos: WebComponentInfo[] = [];
  for (const file of files) {
    const code = await readFile(file, 'utf-8');
    const ast = await parse(code, { syntax: 'typescript', decorators: true })
    const hasComponentDecorator = (classDeclaration: ClassDeclaration) =>
      DecoratorUtils.extractDecorators(classDeclaration)
        .map(decorator => DecoratorUtils.decoratorName(decorator))
        .some(name => name === 'Component');

    const query = DeclarationUtils.queryOf(ast);
    const classDeclarations: ClassDeclaration[] = [
      ...query.getExportDeclarations().getClassDeclarations().filter(hasComponentDecorator).toArray(),
      ...query.getClassDeclarations().filter(hasComponentDecorator).toArray(),
    ]

    const webComponentInfos = classDeclarations.flatMap(classDeclaration => {
      const componentDecorator = DecoratorUtils.extractDecorators(classDeclaration)
        .find(decorator => DecoratorUtils.decoratorName(decorator) === 'Component');
      if (!componentDecorator) return [];

      const componentDecoratorView = DecoratorView.from(componentDecorator);
      const args = componentDecoratorView.getArguments();
      if (args.length === 0) return [];
      const firstArgument = args[0];
      if (firstArgument == null || firstArgument.expression.type !== "ObjectExpression") {
        return [];
      }

      const componentObjectExpression = ObjectExpressionView.from(firstArgument.expression);
      const componentConfig = componentObjectExpression.toObject();
      const tagValue = componentConfig['selector'];
      if (tagValue == null || typeof tagValue !== 'string') return [];

      return {
        className: classDeclaration.identifier.value,
        tagName: tagValue,
        source: {
          file: toWebTypesSourceFile(root, file),
          offset: ClassView.from(classDeclaration).getSourceOffset(code) ?? classDeclaration.span.start,
        },
        properties: PropertyView.extractProperties(classDeclaration)
          .filter(propertyView => propertyView.hasDecorator('Property'))
          .flatMap(propertyView => {
            const propertyDecorator = propertyView.getDecorator('Property');
            const propertyDecoratorView = DecoratorView.from(propertyDecorator);
            const propertyDecoratorArgs = propertyDecoratorView.getArguments();
            if (propertyDecoratorArgs.length === 0) return []
            const propertyConfigArg = propertyDecoratorArgs[0]
            if (propertyConfigArg == null || propertyConfigArg.expression.type !== 'ObjectExpression') return []
            const propertyConfig = ObjectExpressionView.from(propertyConfigArg.expression)
              .toObject();

            const propertyName = String(propertyConfig['name'] ?? propertyView.propertyName())
            const propertyType = propertyConfig['type'] ?? propertyView.getType()
            const propertySourceOffset = propertyView.getSourceOffset(code);

            if (propertyName == null || propertyType == null) return []
            return {
              name: propertyName,
              type: propertyType,
              required: propertyView.isRequired(),
              source: propertySourceOffset == null ? undefined : {
                file: toWebTypesSourceFile(root, file),
                offset: propertySourceOffset,
              },
            }
          })
      }
    })
    scannedWebComponentInfos.push(...webComponentInfos)
  }

  return sortWebComponentInfos(scannedWebComponentInfos);
}

/**
 * Builds the Web Types schema consumed by IDEs for HTML custom-element assistance.
 * Maps scanned components to HTML elements and component properties to attributes.
 * @param scannedWebComponentInfos Component metadata produced by the source scanner.
 * @returns A schema object ready to be serialized as a web-types JSON artifact.
 */
export function createWebTypesSchema(scannedWebComponentInfos: WebComponentInfo[]): WebTypesSchema {
  return {
    $schema: "https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json",
    name: "",
    version: "",
    contributions: {
      html: {
        elements: scannedWebComponentInfos.map(component => ({
          name: component.tagName,
          source: component.source,
          attributes: component.properties.map(property => ({
            name: property.name,
            type: property.type,
            description: property.description,
            default: property.default,
            required: property.required,
            source: property.source,
          })),
        })),
      },
    },
  };
}

/**
 * Writes the generated web-types file and registers it in the package manifest.
 * Updates `package.json` only when its `web-types` entry differs from the requested output.
 * @param root Package root where the artifact and manifest are located.
 * @param outFile Output path relative to `root`.
 * @param scannedWebComponentInfos Component metadata to serialize.
 */
export async function writeWebTypesArtifacts({
  root,
  outFile,
  scannedWebComponentInfos,
}: {
  root: string;
  outFile: string;
  scannedWebComponentInfos: WebComponentInfo[];
}) {
  const outputPath = resolve(root, outFile);
  const webTypesSchema = createWebTypesSchema(scannedWebComponentInfos);
  const webTypesJson = JSON.stringify(webTypesSchema, null, 2);

  await writeFile(outputPath, webTypesJson, "utf-8");
  log.debug(`Wrote web component info JSON to ${outputPath}`);

  const packageJsonPath = resolve(root, "package.json");
  const packageJsonRaw = await readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonRaw) as PackageJsonWithWebTypes;
  const webTypesEntry = `./${outFile}`;
  if (packageJson["web-types"] !== webTypesEntry) {
    packageJson["web-types"] = webTypesEntry;
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");
    log.debug(`Updated package.json with web-types entry: ${webTypesEntry}`);
  } else {
    log.debug(`package.json already has web-types entry: ${webTypesEntry}`);
  }
}

/**
 * Creates a Vite plugin that generates web-types during builds and source changes.
 * Watcher refreshes are coalesced so overlapping file events produce one artifact update.
 * @param root Package root; defaults to the current working directory.
 * @param outFile Output path relative to `root`; defaults to `web-types.json`.
 * @param logType Consola log level; defaults to `info`.
 * @param scanRoots Roots to scan; defaults to `[root]`.
 * @returns A Vite plugin with build-time generation and development-server refresh hooks.
 */
export default function dotaWebTypeJson({
  root = process.cwd(),
  outFile = 'web-types.json',
  logType = 'info',
  scanRoots = [root],
}: WebTypeJsonPluginConfig = {}): Plugin {
  log = createConsola({
    level: LogLevels[logType],
    formatOptions: {
      date: true,
      colors: true
    }
  });
  return {
    name: 'vite-plugin-dota-web-type-json',

    async buildStart() {
      const scannedWebComponentInfos = await scanWebComponents(root, scanRoots);
      await writeWebTypesArtifacts({ root, outFile, scannedWebComponentInfos });
    },

    configureServer(server) {
      let pendingRefresh: Promise<void> | null = null;

      const refresh = async () => {
        if (pendingRefresh) {
          return pendingRefresh;
        }

        pendingRefresh = (async () => {
          const scannedWebComponentInfos = await scanWebComponents(root, scanRoots);
          await writeWebTypesArtifacts({ root, outFile, scannedWebComponentInfos });
          log.debug('Scanned web components:', scannedWebComponentInfos);
        })().finally(() => {
          pendingRefresh = null;
        });

        return pendingRefresh;
      };

      server.watcher.on('add', async (file) => {
        if (!isScannableComponentFile(file, root)) return;
        await refresh();
      });
      server.watcher.on('change', async (file) => {
        if (!isScannableComponentFile(file, root)) return;
        await refresh();
      });
      server.watcher.on('unlink', async (file) => {
        if (!isScannableComponentFile(file, root)) return;
        await refresh();
      });
    },
  };
}
