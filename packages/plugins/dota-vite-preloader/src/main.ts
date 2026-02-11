import {ASTFilterConstants, ComponentScanPath, VirtualImportID} from "@dota/Constants.ts";
import fg from "fast-glob";
import {readFile} from "node:fs/promises";
import {ClassDeclaration, type Module, parse} from "@swc/core";
import {Plugin} from "vite";
import {ASTHelperUtils} from "@dota/ASTHelperUtils.ts";
import {consola, createConsola, LogLevels, LogType} from 'consola';

export type DotaComponentCandidate = {
  name: string;
  filePath: string;
  tagName: string;
}

let logger = consola;

function extractComponentCandidateFromClassDeclaration(classDecl: ClassDeclaration): DotaComponentCandidate | null {
  const decorators = ASTHelperUtils.getDecorators(classDecl);
  for (const decorator of decorators) {
    const decoratorName = ASTHelperUtils.getDecoratorName(decorator);
    if (decoratorName && decoratorName === ASTFilterConstants.COMPONENT_DECORATOR_NAME) {
      const args = ASTHelperUtils.getDecoratorArguments(decorator);
      if (args.length > 0 && args[0].expression.type === 'ObjectExpression') {
        const componentExpression = args[0].expression;
        const componentSelector = ASTHelperUtils.getKeyValuePropertyFromObject(componentExpression, ASTFilterConstants.COMPONENT_TAG_NAME_PROPERTY);
        if (componentSelector.value.type === 'StringLiteral') {
          const tagName = componentSelector.value.value;
          const className = ASTHelperUtils.getClassName(classDecl);
          if (className) {
            return {
              name: className,
              filePath: '',
              tagName
            }
          }
        }
      }
    }
  }
  return null;
}

function extractComponentCandidateFromAst(ast: Module): DotaComponentCandidate[] {
  const body = ast.body;
  const exportDeclarations = ASTHelperUtils.getExportDeclarations(body);
  const classDeclarations = ASTHelperUtils.getClassDeclarations(exportDeclarations);
  return classDeclarations
    .map(classDecl => extractComponentCandidateFromClassDeclaration(classDecl));
}

async function scanDotaComponents(root: string): Promise<DotaComponentCandidate[]> {
  const files = await fg([
    ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH
  ], { cwd: root, absolute: false });

  const candidated:DotaComponentCandidate[] = []

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

async function prepareComponentExports(candidates: DotaComponentCandidate[]): Promise<string> {
  const exportStatementTemplate = "export default [%s]"
  const componentNames = candidates
    .map(candidate => candidate.name)
    .join(', ');
  return exportStatementTemplate.replace('%s', componentNames);
}

async function resolveComponentExport(candidates: DotaComponentCandidate[]): Promise<string> {
  const imports = await prepareComponentImports(candidates);
  const exports = await prepareComponentExports(candidates);
  return `${imports}\n\n${exports}`;
}


export type PluginConfig = {
  root?: string;
  logType?: LogType
}

export default function dotaVitePreloader({ root = process.cwd(), logType = 'info' }: PluginConfig): Plugin {
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

  return {
    name: 'vite-plugin-dota-preloader',
    resolveId(id) {
      if(id === VirtualImportID.DOTA_COMPONENTS) return VirtualImportID.RESOLVED_DOTA_COMPONENTS;
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
  }
}