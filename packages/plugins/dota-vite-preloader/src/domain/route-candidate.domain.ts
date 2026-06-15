import {ASTFilterConstants} from "@dota/Constants.ts";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {type ClassDeclaration, type Module, parse} from "@swc/core";
import {ASTHelperUtils} from "@dota/ASTHelperUtils.ts";
import {DecoratorView, KeyValuePropertyView, ObjectExpressionView} from "@ayu-sh-kr/dota-ast-utils";
import {DotaComponentCandidate} from "./component-candidate.domain.ts";

export type DotaRouteCandidate = {
  name: string;
  filePath: string;
  path: string;
  default?: boolean;
  render?: string;
}

export type RouteScanLogger = {
  debug?: (message: string) => void;
  error?: (message: string) => void;
}

function sliceSourceSpan(code: string, span: { start: number; end: number }): string {
  return code.slice(span.start - 1, span.end - 1);
}

function extractRouteCandidateFromClassDeclaration(
  classDecl: ClassDeclaration,
  code: string
): DotaRouteCandidate | null {
  const decorators = ASTHelperUtils.getDecorators(classDecl);
  for (const decorator of decorators) {
    const decoratorView = DecoratorView.from(decorator);
    const decoratorName = decoratorView.getName();
    if (decoratorName == null || decoratorName !== ASTFilterConstants.ROUTE_DECORATOR_NAME) {
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

    const routeObjectExpression = ObjectExpressionView.from(firstArgument.expression);
    const pathProperty = routeObjectExpression.getProperty(ASTFilterConstants.ROUTE_PATH_NAME_PROPERTY);
    if (pathProperty == null) {
      continue;
    }

    const pathValue = KeyValuePropertyView.from(pathProperty).getString();
    if (pathValue == null) {
      continue;
    }

    const className = ASTHelperUtils.getClassName(classDecl);
    if (className == null) {
      continue;
    }

    const defaultProperty = routeObjectExpression.getProperty(ASTFilterConstants.ROUTE_DEFAULT_NAME_PROPERTY);
    const renderProperty = routeObjectExpression.getProperty(ASTFilterConstants.ROUTE_RENDER_NAME_PROPERTY);
    const renderValue = renderProperty?.value as { span?: { start: number; end: number } } | undefined;

    return {
      name: className,
      filePath: "",
      path: pathValue,
      default: defaultProperty ? KeyValuePropertyView.from(defaultProperty).getBoolean() ?? undefined : undefined,
      render: renderValue?.span ? sliceSourceSpan(code, renderValue.span) : undefined
    };
  }

  return null;
}

export function extractRouteCandidatesFromAst(ast: Module, code: string): DotaRouteCandidate[] {
  return ASTHelperUtils.getClassDeclarations(
    ASTHelperUtils.getExportDeclarations(ast.body)
  )
    .filter(classDecl => classDecl.decorators != null)
    .map(classDecl => extractRouteCandidateFromClassDeclaration(classDecl, code))
    .filter((candidate): candidate is DotaRouteCandidate => candidate != null);
}

export async function extractRouteCandidatesFromComponents(
  components: DotaComponentCandidate[],
  root: string,
  logger: RouteScanLogger = console
): Promise<DotaRouteCandidate[]> {
  const pageCandidates = components.filter(candidate => candidate.filePath.endsWith(".page.ts"));
  const routeCandidates: DotaRouteCandidate[] = [];

  for (const candidate of pageCandidates) {
    const file = join(root, candidate.filePath);
    let code: string;
    try {
      code = await readFile(file, "utf-8");
    } catch (e) {
      logger.error?.(`Failed to read ${file}: ${e}`);
      continue;
    }

    let ast: Module;
    try {
      ast = await parse(code, {syntax: "typescript", decorators: true});
    } catch (e) {
      logger.error?.(`Failed to parse ${file}: ${e}`);
      continue;
    }

    const fileRoutes = extractRouteCandidatesFromAst(ast, code).map(routeCandidate => {
      routeCandidate.filePath = candidate.filePath;
      logger.debug?.(`Found route candidate ${routeCandidate.name} in file ${candidate.filePath} with path ${routeCandidate.path}`);
      return routeCandidate;
    });

    routeCandidates.push(...fileRoutes);
  }

  return routeCandidates;
}

export async function prepareRouteConfigExport(candidates: DotaRouteCandidate[]): Promise<string> {
  const imports = candidates.map(candidate => {
    const importPath = candidate.filePath.startsWith("./") ? candidate.filePath : `./${candidate.filePath}`;
    return `import { ${candidate.name} } from '${importPath}';`;
  });

  const routeEntries = candidates.map(candidate => {
    const properties = [
      `path: '${candidate.path}'`,
      `component: ${candidate.name}`
    ];

    if (candidate.default != null) {
      properties.push(`default: ${candidate.default ? "true" : "false"}`);
    }

    if (candidate.render != null) {
      properties.push(`render: ${candidate.render}`);
    }

    return `{ ${properties.join(", ")} }`;
  });

  return `${imports.join("\n")}\n\nexport const routeConfig = [${routeEntries.join(", ")}];`;
}

export function isRouteMetadataChanged(
  previousCandidates: DotaRouteCandidate[],
  nextCandidates: DotaRouteCandidate[]
): boolean {
  if (previousCandidates.length !== nextCandidates.length) {
    return true;
  }

  return nextCandidates.some((next, index) => {
    const prev = previousCandidates[index];
    return !prev
      || next.name !== prev.name
      || next.path !== prev.path
      || next.default !== prev.default
      || next.render !== prev.render;
  });
}
