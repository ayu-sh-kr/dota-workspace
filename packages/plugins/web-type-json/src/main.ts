import {ClassView, DeclarationUtils, DecoratorUtils, DecoratorView, ObjectExpressionView, PropertyView} from "@ayu-sh-kr/dota-ast-utils";
import type { Plugin } from 'vite';
import {ComponentScanPath} from "@dota/Constants.ts";
import fg from "fast-glob";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {ClassDeclaration, parse} from "@swc/core";
import {ConsolaInstance, createConsola, LogLevels} from "consola";
import type {ResolvedConfig} from "vite";
import type {PackageJsonWithWebTypes, WebComponentInfo, WebTypeJsonPluginConfig, WebTypesSchema} from "./Types.ts";


let log: ConsolaInstance
let viteConfig: ResolvedConfig | null = null;

export default function dotaWebTypeJson({ root = process.cwd(), outFile = 'web-types.json', logType = 'info' }: WebTypeJsonPluginConfig = {}): Plugin {
  log = createConsola({
    level: LogLevels[logType],
    formatOptions: {
      date: true,
      colors: true
    }
  });
  return {
    name: 'vite-plugin-dota-web-type-json',

    configResolved(config) {
      viteConfig = config;
    },

    async buildStart() {
      log.debug('Start scanning web components...')
      const files = await fg([
        ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
        ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
        ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH
      ], {cwd: root, absolute: false});
      log.debug('Scanned files: ', files.length)

      const scannedWebComponentInfos: WebComponentInfo[] = [];
      for (const file of files) {
        const code = await readFile(file, 'utf-8');
        const ast = await parse(code, { syntax: 'typescript', decorators: true })
        const classDeclarations: ClassDeclaration[] = DeclarationUtils.queryOf(ast)
          .getExportDeclarations()
          .getClassDeclarations()
          .filter(classDeclaration => {
            return DecoratorUtils.extractDecorators(classDeclaration)
              .map(decorator => DecoratorUtils.decoratorName(decorator))
              .some(name => name === 'Component')
          })
          .toArray()

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
              file,
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
                    file,
                    offset: propertySourceOffset,
                  },
                }
              })
          }
        })
        scannedWebComponentInfos.push(...webComponentInfos)
      }

      const outputPath = resolve(root, outFile);
      const buildOutDir = viteConfig?.build.outDir ?? 'dist';
      const buildOutputPath = resolve(root, buildOutDir, outFile);
      await mkdir(dirname(buildOutputPath), { recursive: true });
      const webTypesSchema: WebTypesSchema = {
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

      const webTypesJson = JSON.stringify(webTypesSchema, null, 2);
      await writeFile(outputPath, webTypesJson, "utf-8");
      if (buildOutputPath !== outputPath) {
        await writeFile(buildOutputPath, webTypesJson, "utf-8");
      }
      log.debug(`Wrote web component info JSON to ${outputPath}`);
      if (buildOutputPath !== outputPath) {
        log.debug(`Wrote web component info JSON to ${buildOutputPath}`);
      }

      const packageJsonPath = resolve(root, "package.json");
      const packageJsonRaw = await readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonRaw) as PackageJsonWithWebTypes;
      const normalizedBuildOutDir = buildOutDir.replace(/\\/g, '/');
      const webTypesEntry = normalizedBuildOutDir === '.'
        ? `./${outFile}`
        : `./${normalizedBuildOutDir}/${outFile}`;
      if (packageJson["web-types"] !== webTypesEntry) {
        packageJson["web-types"] = webTypesEntry;
        await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");
        log.debug(`Updated package.json with web-types entry: ${webTypesEntry}`);
      } else {
        log.debug(`package.json already has web-types entry: ${webTypesEntry}`);
      }

      log.debug('Scanned web components:', scannedWebComponentInfos);
    }
  };
}
