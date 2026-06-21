import { DeclarationUtils, DecoratorUtils, DecoratorView, ExportDeclarationQueryImpl, KeyValuePropertyView,
  ObjectExpressionView, PropertyView } from "@ayu-sh-kr/dota-ast-utils";
import type { Plugin } from 'vite';
import {ComponentScanPath} from "@dota/Constants.ts";
import fg from "fast-glob";
import {readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {ClassDeclaration, parse} from "@swc/core";
import {ConsolaInstance, createConsola, LogLevels, LogType} from "consola";


let log: ConsolaInstance

export type WebTypeJsonPluginConfig = {
  root?: string;
  outFile?: string;
  logType?: LogType;
}

export type PropertyInfo = {
  name: string;
  type: string;
  description?: string;
  default?: string;
  required?: boolean;
}

export type WebComponentInfo = {
  className: string;
  tagName: string;
  properties: PropertyInfo[];
}

type PackageJsonWithWebTypes = {
  name?: string;
  version?: string;
  private?: boolean;
  [key: string]: unknown;
  "web-types"?: string;
};

type WebTypesAttribute = {
  name: string;
  type?: string;
  description?: string;
  default?: string;
  required?: boolean;
};

type WebTypesElement = {
  name: string;
  description?: string;
  attributes: WebTypesAttribute[];
};

type WebTypesSchema = {
  $schema: string;
  name: string;
  version: string;
  contributions: {
    html: {
      elements: WebTypesElement[];
    };
  };
};

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

    async buildStart() {
      const files = await fg([
        ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
        ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
        ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH
      ], {cwd: root, absolute: false});

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
          const componentTagProperty = componentObjectExpression.getProperty('selector');
          if (componentTagProperty == null) return [];

          const keyValuePropertyView = KeyValuePropertyView.from(componentTagProperty);
          const tagValue = keyValuePropertyView.getString();
          if (tagValue == null) {
            return [];
          }

          return {
            className: classDeclaration.identifier.value,
            tagName: tagValue,
            properties: PropertyView.extractProperties(classDeclaration)
              .filter(propertyView => propertyView.hasDecorator('Property'))
              .flatMap(propertyView => {
                const propertyName = propertyView.propertyName()
                const propertyType = propertyView.getType()

                if (propertyName == null || propertyType == null) return []
                return {
                  name: propertyName,
                  type: propertyType,
                  required: propertyView.isRequired(),
                }
              })
          }
        })
        scannedWebComponentInfos.push(...webComponentInfos)
      }

      const outputPath = resolve(root, outFile);
      const webTypesSchema: WebTypesSchema = {
        $schema: "https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json",
        name: "",
        version: "",
        contributions: {
          html: {
            elements: scannedWebComponentInfos.map(component => ({
              name: component.tagName,
              attributes: component.properties.map(property => ({
                name: property.name,
                type: property.type,
                description: property.description,
                default: property.default,
                required: property.required,
              })),
            })),
          },
        },
      };

      await writeFile(outputPath, JSON.stringify(webTypesSchema, null, 2), "utf-8");
      log.info(`Wrote web component info JSON to ${outputPath}`);

      const packageJsonPath = resolve(root, "package.json");
      const packageJsonRaw = await readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonRaw) as PackageJsonWithWebTypes;
      const webTypesEntry = `./${outFile}`;
      if (packageJson["web-types"] !== webTypesEntry) {
        packageJson["web-types"] = webTypesEntry;
        await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");
        log.info(`Updated package.json with web-types entry: ${webTypesEntry}`);
      } else {
        log.info(`package.json already has web-types entry: ${webTypesEntry}`);
      }

      log.info('Scanned web components:', scannedWebComponentInfos);
      // TODO: scan components and generate web-types.json
    }
  };
}
