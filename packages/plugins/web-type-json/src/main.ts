import {
  ClassView,
  DeclarationUtils,
  DecoratorUtils,
  DecoratorView,
  ObjectExpressionView,
  PropertyView,
} from "@ayu-sh-kr/dota-ast-utils";
import type {Plugin} from "vite";
import {ComponentScanPath} from "@dota/Constants.ts";
import fg from "fast-glob";
import {readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {parse} from "@swc/core";
import type {ClassDeclaration} from "@swc/core";
import {createConsola, LogLevels} from "consola";
import type {ConsolaInstance} from "consola";
import {ComponentMetadataUtils} from "./utils/ComponentMetadataUtils.ts";
import {ComponentSourceUtils} from "./utils/ComponentSourceUtils.ts";
import {CustomElementsManifestUtils} from "./utils/CustomElementsManifestUtils.ts";
import type {
  ComponentClassScanCandidate,
  CustomElementsManifestGenerationOptions,
  CustomElementsManifestModule,
  CustomElementsManifestSchema,
  GeneratedArtifactsWriteOptions,
  PackageJsonWithGeneratedArtifacts,
  WebComponentInfo,
  WebTypeJsonPluginConfig,
  WebTypesArtifactsWriteOptions,
  WebTypesSchema,
} from "./Types.ts";

export type {
  CustomElementsManifestConfig,
  CustomElementsManifestGenerationOptions,
  CustomElementsManifestSchema,
  PropertyInfo,
  WebComponentInfo,
  WebTypeJsonPluginConfig,
  WebTypesArtifactsWriteOptions,
  WebTypesSchema,
} from "./Types.ts";


let log: ConsolaInstance = createConsola();

/**
 * Resets plugin state for test isolation and future stateful implementations.
 * The current scanner has no module-level cache that requires cleanup.
 */
export function resetWebTypeJsonState(): void {
  // no module-level state to reset
}

/**
 * Scans configured roots once for Dota components and public properties.
 * Each file is read and parsed once even when scan roots overlap, and the result
 * retains both HTML attribute and JavaScript field identities for all serializers.
 * @param root Package root used for Web Types source paths and CEM ownership.
 * @param scanRoots Roots to search; defaults to the package root.
 * @returns Deterministically sorted component metadata shared by every output format.
 */
export async function scanWebComponents(
  root: string,
  scanRoots: string[] = [root],
): Promise<WebComponentInfo[]> {
  log.debug("Start scanning web components...");
  const discoveredFiles = await Promise.all(scanRoots.map(scanRoot => fg([
    ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH,
  ], {cwd: scanRoot, absolute: true})));
  const files = [...new Set(discoveredFiles.flat())].sort((left, right) => left.localeCompare(right));
  log.debug("Scanned files: ", files.length);

  const scannedInfos: WebComponentInfo[] = [];
  for (const file of files) {
    const code = await readFile(file, "utf-8");
    const ast = await parse(code, {syntax: "typescript", decorators: true});
    const hasComponentDecorator = (classDeclaration: ClassDeclaration) =>
      DecoratorUtils.extractDecorators(classDeclaration)
        .some(decorator => DecoratorUtils.decoratorName(decorator) === "Component");

    const query = DeclarationUtils.queryOf(ast);
    const namedExports = new Map(
      query.getExportNamedDeclarations()
        .filterLocalExports()
        .getNamedSpecifiers()
        .toArray()
        .filter(specifier => !specifier.isTypeOnly)
        .map(specifier => [
          specifier.orig.value,
          specifier.exported?.value ?? specifier.orig.value,
        ]),
    );
    const classDeclarations: ComponentClassScanCandidate[] = [
      ...query.getExportDeclarations()
        .getClassDeclarations()
        .filter(hasComponentDecorator)
        .toArray()
        .map(declaration => ({
          declaration,
          exported: true,
          exportName: declaration.identifier.value,
        })),
      ...query.getClassDeclarations()
        .filter(hasComponentDecorator)
        .toArray()
        .map(declaration => ({
          declaration,
          exported: namedExports.has(declaration.identifier.value),
          exportName: namedExports.get(declaration.identifier.value),
        })),
    ];
    const moduleSourceOffset = ComponentSourceUtils.findModuleSourceOffset(code);

    for (const {declaration: classDeclaration, exported, exportName} of classDeclarations) {
      const componentDecorator = DecoratorUtils.extractDecorators(classDeclaration)
        .find(decorator => DecoratorUtils.decoratorName(decorator) === "Component");
      if (!componentDecorator) continue;

      const args = DecoratorView.from(componentDecorator).getArguments();
      const firstArgument = args[0];
      if (firstArgument?.expression.type !== "ObjectExpression") continue;

      const componentConfig = ObjectExpressionView.from(firstArgument.expression).toObject();
      const tagValue = componentConfig["selector"];
      if (typeof tagValue !== "string") continue;

      const properties = PropertyView.extractProperties(classDeclaration)
        .filter(propertyView => propertyView.hasDecorator("Property"))
        .flatMap(propertyView => {
          const propertyDecorator = propertyView.getDecorator("Property");
          if (!propertyDecorator) return [];

          const propertyConfigArg = DecoratorView.from(propertyDecorator).getArguments()[0];
          if (propertyConfigArg?.expression.type !== "ObjectExpression") return [];

          const propertyConfig = ObjectExpressionView.from(propertyConfigArg.expression).toObject();
          const propertyName = propertyView.propertyName();
          const propertyType = propertyConfig["type"] ?? propertyView.getType();
          if (propertyName == null || propertyType == null) return [];

          const propertySourceOffset = propertyView.getSourceOffset(
            code,
            ast.span.start,
            moduleSourceOffset,
          );
          const configuredDefault = propertyConfig["default"];

          return [{
            name: String(propertyConfig["name"] ?? propertyName),
            propertyName,
            type: String(propertyType),
            description: typeof propertyConfig["description"] === "string"
              ? propertyConfig["description"]
              : undefined,
            default: configuredDefault == null
              ? ComponentMetadataUtils.defaultValueFromExpression(propertyView.defaultValue())
              : String(configuredDefault),
            required: propertyView.isRequired(),
            source: propertySourceOffset == null ? undefined : {
              file: ComponentSourceUtils.toWebTypesSourceFile(root, file),
              offset: propertySourceOffset,
            },
          }];
        });

      scannedInfos.push({
        className: classDeclaration.identifier.value,
        tagName: tagValue,
        description: typeof componentConfig["description"] === "string"
          ? componentConfig["description"]
          : undefined,
        exported,
        exportName,
        sourceFile: file,
        superclass: classDeclaration.superClass?.type === "Identifier"
          ? classDeclaration.superClass.value
          : undefined,
        source: {
          file: ComponentSourceUtils.toWebTypesSourceFile(root, file),
          offset: ClassView.from(classDeclaration).getSourceOffset(
            code,
            ast.span.start,
            moduleSourceOffset,
          ) ?? classDeclaration.span.start,
        },
        properties,
      });
    }
  }

  return ComponentMetadataUtils.sortWebComponentInfos(scannedInfos);
}

/**
 * Builds the JetBrains Web Types schema from shared scan metadata.
 * HTML attributes retain decorator names while JavaScript properties use actual
 * class-field names, keeping both IDE surfaces accurate when those names differ.
 * @param scannedInfos Component metadata produced by the source scanner.
 * @returns A Web Types object ready for deterministic JSON serialization.
 */
export function createWebTypesSchema(scannedInfos: WebComponentInfo[]): WebTypesSchema {
  return {
    $schema: "https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json",
    name: "",
    version: "",
    contributions: {
      html: {
        elements: scannedInfos.map(component => ({
          name: component.tagName,
          description: component.description,
          source: component.source,
          attributes: component.properties.map(property => ({
            name: property.name,
            description: property.description,
            default: property.default,
            required: property.required,
            value: {
              type: ComponentMetadataUtils.normalizePropertyType(property.type),
            },
            source: property.source,
          })),
          js: {
            properties: component.properties.map(property => ({
              name: property.propertyName ?? property.name,
              type: ComponentMetadataUtils.normalizePropertyType(property.type),
              description: property.description,
              default: property.default,
              source: property.source,
            })),
          },
        })),
      },
    },
  };
}

/**
 * Projects package-owned scan metadata into the official CEM 2.1 shape.
 * Components from external scan roots are intentionally excluded because one
 * manifest can only advertise importable modules belonging to its package root.
 * @param scannedInfos Shared component metadata from the single source scan.
 * @param options Package root and optional published-module path mapper.
 * @returns A deterministically ordered Custom Elements Manifest 2.1 document.
 * @throws When a package-owned component lacks an absolute source file or maps outside the package.
 */
export function createCustomElementsManifest(
  scannedInfos: WebComponentInfo[],
  options: CustomElementsManifestGenerationOptions,
): CustomElementsManifestSchema {
  const modulesByPath = new Map<string, WebComponentInfo[]>();

  for (const component of scannedInfos) {
    if (component.sourceFile == null) {
      throw new Error(`Cannot generate a Custom Elements Manifest for ${component.className}: sourceFile is missing`);
    }

    if (!CustomElementsManifestUtils.isPackageOwnedSource(options.root, component.sourceFile)) {
      continue;
    }

    const mappedPath = (options.modulePath ?? CustomElementsManifestUtils.defaultModulePath)(
      component.sourceFile,
      options.root,
    );
    const modulePath = CustomElementsManifestUtils.normalizeModulePath(mappedPath, component.sourceFile);
    const moduleComponents = modulesByPath.get(modulePath) ?? [];
    moduleComponents.push(component);
    modulesByPath.set(modulePath, moduleComponents);
  }

  const modules: CustomElementsManifestModule[] = [...modulesByPath.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([modulePath, components]) => {
      const sortedComponents = [...components].sort((left, right) =>
        left.className.localeCompare(right.className)
        || left.tagName.localeCompare(right.tagName),
      );

      return {
        kind: "javascript-module",
        path: modulePath,
        declarations: sortedComponents.map(component => {
          const sortedProperties = [...component.properties].sort((left, right) =>
            (left.propertyName ?? left.name).localeCompare(right.propertyName ?? right.name)
            || left.name.localeCompare(right.name),
          );

          return {
            kind: "class",
            name: component.className,
            customElement: true,
            tagName: component.tagName,
            description: component.description,
            superclass: component.superclass == null ? undefined : {name: component.superclass},
            members: sortedProperties.map(property => ({
              kind: "field",
              name: property.propertyName ?? property.name,
              attribute: property.name,
              description: property.description,
              type: {text: ComponentMetadataUtils.normalizePropertyType(property.type)},
              default: property.default,
            })),
            attributes: sortedProperties.map(property => ({
              name: property.name,
              fieldName: property.propertyName ?? property.name,
              description: property.description,
              type: {text: ComponentMetadataUtils.normalizePropertyType(property.type)},
              default: property.default,
            })),
          };
        }),
        exports: sortedComponents.flatMap(component => [
          ...(component.exported === true ? [{
            kind: "js" as const,
            name: component.exportName ?? component.className,
            declaration: {name: component.className},
          }] : []),
          {
            kind: "custom-element-definition" as const,
            name: component.tagName,
            declaration: {name: component.className},
          },
        ]),
      };
    });

  return {
    schemaVersion: "2.1.0",
    modules,
  };
}

/**
 * Writes every enabled generated JSON file in parallel, then updates package metadata once.
 * The single package read-modify-write prevents concurrent Web Types and CEM writers
 * from losing one another's discovery fields.
 * @param options Package root, output paths, scan result, and normalized CEM settings.
 * @returns A promise that resolves after artifacts and package registration are durable.
 * @throws When Web Types and CEM resolve to the same output file.
 */
async function writeGeneratedArtifacts(options: GeneratedArtifactsWriteOptions): Promise<void> {
  const webTypesOutputPath = resolve(options.root, options.outFile);
  const cemConfig = options.customElementsManifest;
  const customElementsOutputPath = cemConfig?.enabled
    ? resolve(options.root, cemConfig.outFile)
    : undefined;

  if (customElementsOutputPath === webTypesOutputPath) {
    throw new Error("Web Types and Custom Elements Manifest outputs must use different files");
  }

  const webTypesJson = JSON.stringify(createWebTypesSchema(options.scannedWebComponentInfos), null, 2);
  const customElementsJson = cemConfig?.enabled
    ? JSON.stringify(createCustomElementsManifest(options.scannedWebComponentInfos, {
      root: options.root,
      modulePath: cemConfig.modulePath,
    }), null, 2)
    : undefined;
  const writes: Array<Promise<void>> = [
    writeFile(webTypesOutputPath, webTypesJson, "utf-8").then(() => {
      log.debug(`Wrote Web Types JSON to ${webTypesOutputPath}`);
    }),
  ];

  if (customElementsJson != null && customElementsOutputPath) {
    writes.push(writeFile(customElementsOutputPath, customElementsJson, "utf-8").then(() => {
      log.debug(`Wrote Custom Elements Manifest to ${customElementsOutputPath}`);
    }));
  }

  await Promise.all(writes);

  const packageJsonPath = resolve(options.root, "package.json");
  const packageJsonRaw = await readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonRaw) as PackageJsonWithGeneratedArtifacts;
  const webTypesEntry = `./${options.outFile.replace(/^\.\//, "")}`;
  let packageJsonChanged = false;

  if (packageJson["web-types"] !== webTypesEntry) {
    packageJson["web-types"] = webTypesEntry;
    packageJsonChanged = true;
  }

  if (cemConfig?.enabled && cemConfig.updatePackageJson) {
    const customElementsEntry = cemConfig.outFile.replace(/^\.\//, "");
    if (packageJson.customElements !== customElementsEntry) {
      packageJson.customElements = customElementsEntry;
      packageJsonChanged = true;
    }
  }

  if (packageJsonChanged) {
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");
    log.debug("Updated package.json generated-artifact entries");
  }
}

/**
 * Preserves the existing public Web Types-only writer while delegating package updates
 * to the coordinated artifact path used by the plugin.
 * @param options Package root, Web Types output path, and shared scan metadata.
 * @returns A promise that resolves after Web Types and package metadata are written.
 */
export async function writeWebTypesArtifacts(options: WebTypesArtifactsWriteOptions): Promise<void> {
  await writeGeneratedArtifacts(options);
}

/**
 * Creates a Vite plugin that scans Dota components once and always emits Web Types.
 * CEM 2.1 generation is opt-in and projects the same metadata before both JSON files
 * are written concurrently; package discovery fields are then registered in one update.
 * Build scans run in `buildStart`, while dev changes share a coalesced refresh promise.
 * @param config Root, scan roots, output, logging, and optional CEM generation settings.
 * @returns A Vite plugin with build and development-watcher integration.
 */
export default function dotaWebTypeJson(config: WebTypeJsonPluginConfig = {}): Plugin {
  const {
    root = process.cwd(),
    outFile = "web-types.json",
    logType = "info",
    scanRoots = [root],
  } = config;
  const customElementsManifest = CustomElementsManifestUtils.normalizeConfig(config.customElementsManifest);

  log = createConsola({
    level: LogLevels[logType],
    formatOptions: {
      date: true,
      colors: true,
    },
  });

  /**
   * Coordinates one source scan with every enabled serializer and artifact writer.
   * Keeping this boundary shared by build and dev hooks prevents either lifecycle
   * from accidentally introducing a second scan for CEM.
   * @returns The shared metadata for optional watcher diagnostics.
   */
  const generateArtifacts = async (): Promise<WebComponentInfo[]> => {
    const scannedWebComponentInfos = await scanWebComponents(root, scanRoots);
    await writeGeneratedArtifacts({
      root,
      outFile,
      scannedWebComponentInfos,
      customElementsManifest,
    });
    return scannedWebComponentInfos;
  };

  return {
    name: "vite-plugin-dota-web-type-json",

    async buildStart() {
      await generateArtifacts();
    },

    configureServer(server) {
      let pendingRefresh: Promise<void> | null = null;

      /**
       * Coalesces rapid watcher events around the shared generation coordinator.
       * Concurrent callers receive the active promise, preventing queued duplicate
       * scans while ensuring failures still clear the pending state.
       * @returns The active or newly started refresh promise.
       */
      const refresh = async (): Promise<void> => {
        if (pendingRefresh) return pendingRefresh;

        pendingRefresh = generateArtifacts()
          .then(scannedInfos => {
            log.debug("Scanned web components:", scannedInfos);
          })
          .finally(() => {
            pendingRefresh = null;
          });
        return pendingRefresh;
      };

      for (const event of ["add", "change", "unlink"] as const) {
        server.watcher.on(event, async file => {
          if (!ComponentSourceUtils.isScannableComponentFile(file, scanRoots)) return;
          await refresh();
        });
      }
    },
  };
}
