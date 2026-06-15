import {ASTFilterConstants} from "@dota/Constants.ts";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {type ClassDeclaration, type Expression, type ExpressionStatement, type Module, type Script, type Span, parse, printSync} from "@swc/core";
import {ASTHelperUtils} from "@dota/ASTHelperUtils.ts";
import {DeclarationUtils, DecoratorView, ExportDeclarationQueryImpl, KeyValuePropertyView, ObjectExpressionView} from "@ayu-sh-kr/dota-ast-utils";
import {DotaComponentCandidate} from "./component-candidate.domain.ts";

/**
 * Extracts route metadata from exported page classes and normalizes it for codegen.
 * The scanner only considers `.page.ts` files and looks for `@Route` decorators.
 * Each candidate preserves the class name, source file, route path, and optional flags.
 * Parsing happens at the AST level, so user code is never executed during discovery.
 * The resulting candidates are used to build the virtual route config module.
 * Change detection stays in this file so route-specific updates can be diffed quickly.
 */
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

function printExpressionSource(expression: Expression): string | undefined {
  const span = (expression as { span?: Span }).span;
  if (!span) {
    return undefined;
  }

  const script: Script = {
    type: "Script",
    span,
    body: [
      {
        type: "ExpressionStatement",
        span,
        expression
      } as ExpressionStatement
    ],
    interpreter: null
  };

  return printSync(script).code.replace(/;\s*$/, "").trim();
}

/**
 * Reads one exported class declaration and turns it into a route candidate when possible.
 * The class must have a `@Route` decorator with an object argument that includes `path`.
 * If the decorator, path value, or class name is missing, the function returns `null`.
 * `default` is copied as a boolean flag when present on the decorator payload.
 * `render` is preserved by printing the original AST expression back to source text.
 * This function is intentionally strict so invalid route metadata is skipped early.
 */
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
    const renderSource = renderProperty ? printExpressionSource(renderProperty.value as Expression) : undefined;

    return {
      name: className,
      filePath: "",
      path: pathValue,
      default: defaultProperty ? KeyValuePropertyView.from(defaultProperty).getBoolean() ?? undefined : undefined,
      render: renderSource
    };
  }

  return null;
}

/**
 * Walks a parsed module, keeps only exported decorated classes, and extracts route metadata.
 * This is the AST-level entry point for single-file route discovery.
 * Non-class exports and undecorated classes are ignored by design.
 * The output order follows the declaration order in the module body.
 * A `code` argument is accepted so stringified expressions can be reconstructed consistently.
 * The function returns only candidates that passed the validation rules above.
 */
export function extractRouteCandidatesFromAst(ast: Module, code: string): DotaRouteCandidate[] {
  return new ExportDeclarationQueryImpl(ast, DeclarationUtils.extractDeclarations(ast.body, "ExportDeclaration"))
    .getClassDeclarations()
    .filter(classDecl => classDecl.decorators != null)
    .map(classDecl => extractRouteCandidateFromClassDeclaration(classDecl, code))
    .filter((candidate): candidate is DotaRouteCandidate => candidate != null);
}

/**
 * Resolves page files from component scan results and extracts routes from each one.
 * Only files ending in `.page.ts` are considered for route discovery.
 * Read and parse failures are logged and skipped so a single bad file does not stop the scan.
 * The returned candidates are tagged with their original relative file path.
 * This is the file-system entry point used by the preloader to build route metadata.
 * Debug logging records every discovered route for traceability during scanning.
 */
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

/**
 * Generates the virtual module source that imports route classes and exports `routeConfig`.
 * Every candidate becomes a named import followed by one object in the config array.
 * The emitted object includes `path`, `component`, and optional `default`/`render` fields.
 * Import paths are normalized to be relative so the output works as an ES module string.
 * The output is deterministic, which makes cache invalidation and snapshotting reliable.
 * This function is the final codegen step after route discovery is complete.
 */
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

/**
 * Compares two ordered candidate lists and reports whether route metadata changed.
 * It first checks list length, then compares candidates by index to keep the diff cheap.
 * Only route fields relevant to generated output are considered: name, path, default, and render.
 * This intentionally ignores unrelated component metadata because it does not affect the route config.
 * Ordering matters here, because the generated module is emitted in declaration order.
 * The result is used to decide whether the route virtual module should be regenerated.
 */
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
