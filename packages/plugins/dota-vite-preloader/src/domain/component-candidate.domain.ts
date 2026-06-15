import {ASTFilterConstants, ComponentScanPath} from "@dota/Constants.ts";
import fg from "fast-glob";
import {readFile} from "node:fs/promises";
import {ClassDeclaration, type Module, parse} from "@swc/core";
import {ASTHelperUtils} from "@dota/ASTHelperUtils.ts";
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
 */
export type DotaComponentCandidate = {
  name: string;
  filePath: string;
  tagName: string;
}

export type ComponentScanLogger = {
  debug?: (message: string) => void;
  error?: (message: string) => void;
}

function normalizeRelativeImportPath(filePath: string): string {
  return filePath.startsWith("./") ? filePath : `./${filePath}`;
}

/**
 * Extracts component metadata from a class declaration by analyzing its @Component decorator.
 */
export function extractComponentCandidateFromClassDeclaration(classDecl: ClassDeclaration): DotaComponentCandidate | null {
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
      filePath: "",
      tagName: tagValue
    };
  }

  return null;
}

/**
 * Extracts all component candidates from a parsed TypeScript module AST.
 */
export function extractComponentCandidatesFromAst(ast: Module): DotaComponentCandidate[] {
  const body = ast.body;
  return new ExportDeclarationQueryImpl(ast, DeclarationUtils.extractDeclarations(body, "ExportDeclaration"))
    .getClassDeclarations()
    .filter(classDecl => classDecl.decorators != null)
    .map(classDecl => extractComponentCandidateFromClassDeclaration(classDecl))
    .filter((candidate): candidate is DotaComponentCandidate => candidate != null);
}

/**
 * Scans the project directory for Dota component files and extracts component metadata.
 */
export async function scanDotaComponents(root: string, logger: ComponentScanLogger = console): Promise<DotaComponentCandidate[]> {
  const files = await fg([
    ComponentScanPath.SOURCE_ROOT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_COMPONENT_DIRECTORY_SCAN_PATH,
    ComponentScanPath.SOURCE_PAGE_DIRECTORY_SCAN_PATH
  ], {cwd: root, absolute: false});

  const candidates: DotaComponentCandidate[] = [];

  for (const file of files) {
    const code = await readFile(file, "utf-8");
    let ast: Module;
    try {
      ast = await parse(code, {syntax: "typescript", decorators: true});
    } catch (e) {
      logger.error?.(`Failed to parse ${file}: ${e}`);
      continue;
    }

    const fileCandidates = extractComponentCandidatesFromAst(ast).map(candidate => {
      candidate.filePath = file;
      logger.debug?.(`Found component candidate ${candidate.name} in file ${file} with tag ${candidate.tagName}`);
      return candidate;
    });

    candidates.push(...fileCandidates);
  }

  return candidates;
}

/**
 * Generates ES module import statements for all discovered component candidates.
 */
export async function prepareComponentImports(candidates: DotaComponentCandidate[]): Promise<string> {
  const importStatementTemplate = "import { %s } from '%s';";
  return candidates.map(candidate => {
    const importPath = normalizeRelativeImportPath(candidate.filePath);
    return importStatementTemplate
      .replace("%s", candidate.name)
      .replace("%s", importPath);
  }).join("\n");
}

/**
 * Generates a default export statement containing all component class names.
 */
export async function prepareComponentExports(candidates: DotaComponentCandidate[]): Promise<string> {
  const exportStatementTemplate = "export default [%s]";
  const componentNames = candidates
    .map(candidate => candidate.name)
    .join(", ");
  return exportStatementTemplate.replace("%s", componentNames);
}

/**
 * Combines component imports and exports into a complete virtual module source.
 */
export async function resolveComponentExport(candidates: DotaComponentCandidate[]): Promise<string> {
  const imports = await prepareComponentImports(candidates);
  const exports = await prepareComponentExports(candidates);
  return `${imports}\n\n${exports}`;
}

export function isComponentMetadataChanged(
  previousCandidates: DotaComponentCandidate[],
  nextCandidates: DotaComponentCandidate[]
): boolean {
  if (nextCandidates.length !== previousCandidates.length) {
    return true;
  }

  return nextCandidates.some((next, index) => {
    const prev = previousCandidates[index];
    return !prev || next.name !== prev.name || next.tagName !== prev.tagName;
  });
}
