import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { parse, type CallExpression, type ClassDeclaration, type ClassMethod, type Expression, type Module } from '@swc/core';
import {
  AstTraversalUtils,
  CallExpressionView,
  ClassMethodView,
  ClassView,
  DecoratorUtils,
  DecoratorView,
  ExpressionTypeUtils,
  KeyValuePropertyView,
  ObjectExpressionView,
  TypeAnnotationUtils,
  findModuleSourceOffset,
  utf8ByteOffsetToSourceOffset,
  type ExpressionTypeInfo,
} from '@ayu-sh-kr/dota-ast-utils';
import { ASTFilterConstants, EventMapScanPath } from '@dota/Constants.ts';
import type {
  EventMapPayloadType,
  EventMapScanCandidate,
  EventMapScanOptions,
  EventMapSourceLocation,
  EventMapTypeImport,
} from '@dota/Types.ts';

/** Minimal AST shape needed when traversing nodes whose concrete SWC type varies. */
type AstRecord = Record<string, unknown> & { type: string };

/** Identifier shape used to inspect annotations on parameters and declarations. */
type AstIdentifier = {
  type?: unknown;
  typeAnnotation?: unknown;
  value?: unknown;
};

/** Declaration shape needed to identify an exported interface, alias, or class. */
type AstExportedDeclaration = {
  id?: { value?: unknown };
  identifier?: { value?: unknown };
  type?: unknown;
};

/** Import/export specifier shape needed to recover a local type name. */
type AstTypeSpecifier = {
  local?: AstIdentifier;
  orig?: { value?: unknown };
  type?: unknown;
};

/**
 * Associates a source-level binding with its annotation and source position.
 * The position lets syntax-only resolution choose the nearest preceding binding
 * when a local variable shadows another binding with the same name.
 */
type TypeBinding = {
  /** Source-level identifier whose annotation can describe an event payload. */
  name: string;
  /** Declaration start used to choose the nearest binding at a reference site. */
  position: number;
  /** Annotation-derived type information, including referenced type names. */
  type: ExpressionTypeInfo;
};

/**
 * Source information required to recover payload types without a TypeScript
 * program. It combines original text, local annotations, and type imports so
 * generated declarations can preserve author-written type references.
 */
type ModuleTypeContext = {
  /** Source-level names that can be imported by the generated declaration. */
  imports: Map<string, EventMapTypeImport>;
  /** SWC module offset used to convert node spans into source-text offsets. */
  moduleStart: number;
  /** Original module text from which exact annotation syntax is read. */
  sourceText: string;
  /** Annotated bindings used by identifier and member-expression resolution. */
  typeBindings: TypeBinding[];
};

/** Minimal span shape accepted by the source-offset conversion boundary. */
type SourceSpan = {
  start?: number;
};

/**
 * Builds the same-file type context used for identifier payloads and imports.
 * Annotation-only lookup intentionally avoids a TypeScript program while still
 * preserving the precise types authors wrote for parameters, locals, and fields.
 * @param ast - Parsed module from which declarations and imports are collected.
 * @param sourceText - Original source used to preserve annotation text.
 * @param sourceFile - Absolute path to the source file.
 * @returns Type bindings and import metadata available to payload expressions.
 */
function createModuleTypeContext(ast: Module, sourceText: string, sourceFile: string): ModuleTypeContext {
  const moduleStart = ast.span.start;
  const imports = new Map([
    ...collectTypeImports(ast, sourceFile),
    ...collectExportedTypeImports(ast, sourceFile),
  ]);
  const typeBindings = AstTraversalUtils.findNodes<AstRecord>(ast, 'VariableDeclarator')
    .concat(
      AstTraversalUtils.findNodes<AstRecord>(ast, 'Parameter'),
      AstTraversalUtils.findNodes<AstRecord>(ast, 'ClassProperty'),
      AstTraversalUtils.findNodes<AstRecord>(ast, 'PrivateProperty'),
    )
    .flatMap(node => createTypeBinding(node, sourceText, moduleStart));

  return { imports, moduleStart, sourceText, typeBindings };
}

/**
 * Collects source imports by local binding so generated declarations can retain
 * named payload types such as `ThemeName` without guessing module ownership.
 * @param ast - Parsed source module whose imports are inspected.
 * @param sourceFile - Source file that owns the discovered import declarations.
 * @returns Local identifier to module-specifier metadata.
 */
function collectTypeImports(ast: Module, sourceFile: string): Map<string, EventMapTypeImport> {
  const imports = new Map<string, EventMapTypeImport>();

  AstTraversalUtils.findNodes<AstRecord>(ast, 'ImportDeclaration').forEach(declaration => {
    const moduleSpecifier = (declaration.source as { value?: unknown } | undefined)?.value;
    const specifiers = declaration.specifiers;
    if (typeof moduleSpecifier !== 'string' || !Array.isArray(specifiers)) return;

    specifiers.forEach(specifier => {
      const localName = (specifier as AstTypeSpecifier).local?.value;
      if (typeof localName === 'string') {
        imports.set(localName, { name: localName, moduleSpecifier, sourceFile });
      }
    });
  });

  return imports;
}

/**
 * Exposes types declared and exported by the scanned source file to generated maps.
 * A declaration file has a different lexical scope from its source, so exported
 * local interfaces and aliases must become rebased type imports before reuse.
 * @param ast - Parsed source module whose exported declarations are inspected.
 * @param sourceFile - Absolute file path used to construct a rebased local import.
 * @returns Locally exported type names keyed by their source-level identifier.
 */
function collectExportedTypeImports(ast: Module, sourceFile: string): Map<string, EventMapTypeImport> {
  const imports = new Map<string, EventMapTypeImport>();

  AstTraversalUtils.findNodes<AstRecord>(ast, 'ExportDeclaration').forEach(exportDeclaration => {
    const declaration = exportDeclaration.declaration as AstExportedDeclaration | undefined;
    const name = declaration?.type === 'TsInterfaceDeclaration' || declaration?.type === 'TsTypeAliasDeclaration' || declaration?.type === 'ClassDeclaration'
      ? declaration.id?.value ?? declaration.identifier?.value
      : null;

    if (typeof name === 'string') {
      imports.set(name, { name, moduleSpecifier: `./${basename(sourceFile)}`, sourceFile });
    }
  });

  AstTraversalUtils.findNodes<AstRecord>(ast, 'ExportNamedDeclaration').forEach(exportDeclaration => {
    if (exportDeclaration.source != null || !Array.isArray(exportDeclaration.specifiers)) return;

    exportDeclaration.specifiers.forEach(specifier => {
      if ((specifier as AstTypeSpecifier).type !== 'ExportSpecifier') return;

      const name = (specifier as AstTypeSpecifier).orig?.value;
      if (typeof name === 'string') {
        imports.set(name, { name, moduleSpecifier: `./${basename(sourceFile)}`, sourceFile });
      }
    });
  });

  return imports;
}

/**
 * Converts an annotated declaration into a name-addressable payload type binding.
 * Only direct identifier declarations are safe to reuse; destructuring needs a
 * checker-aware binding model and therefore remains intentionally unresolved.
 * @param node - Parameter, variable, or class-property declaration from the module.
 * @param sourceText - Original source text used to recover the exact annotation.
 * @param moduleStart - SWC module span start used to normalize byte offsets.
 * @returns A binding, or an empty list when the declaration has no usable annotation.
 */
function createTypeBinding(node: AstRecord, sourceText: string, moduleStart: number): TypeBinding[] {
  const identifier = node.type === 'Parameter'
    ? (node.pat as AstIdentifier | undefined)
    : (node.id ?? node.key) as AstIdentifier | undefined;
  const annotationNode = node.type === 'ClassProperty' || node.type === 'PrivateProperty'
    ? node.typeAnnotation
    : identifier?.typeAnnotation;

  if (identifier?.type !== 'Identifier' || typeof identifier.value !== 'string' || annotationNode == null) {
    return [];
  }

  const annotation = TypeAnnotationUtils.read(annotationNode as never, sourceText, moduleStart);
  const position = ((node.span as { start?: unknown } | undefined)?.start);
  if (annotation == null || typeof position !== 'number') return [];

  return [{
    name: identifier.value,
    position,
    type: {
      text: annotation.text,
      isComplete: true,
      referencedNames: annotation.referencedNames,
    },
  }];
}

/**
 * Resolves identifiers and `this.field` expressions to the nearest annotation
 * found in the same module. Choosing the closest preceding binding honors local
 * shadowing while keeping resolution deterministic without semantic analysis.
 * @param expression - Identifier or member expression encountered in a payload.
 * @param context - Source-level declarations and imports available to the expression.
 * @returns The matching type information, or `null` when syntax cannot prove it.
 */
function resolveReferenceType(expression: Expression, context: ModuleTypeContext): ExpressionTypeInfo | null {
  const name = expression.type === 'Identifier'
    ? expression.value
    : expression.type === 'MemberExpression' && expression.property.type === 'Identifier'
      ? expression.property.value
      : null;
  const position = (expression as { span: { start: number } }).span.start;
  if (name == null) return null;

  const matchingBindings = context.typeBindings.filter(binding => binding.name === name);
  const preceding = matchingBindings.filter(binding => binding.position <= position);
  const binding = [...(preceding.length > 0 ? preceding : matchingBindings)]
    .sort((left, right) => right.position - left.position)[0];

  return binding?.type ?? null;
}

/**
 * Resolves a publish call's `data` field into the payload shape emitted in the map.
 * Missing and explicit `undefined` data represent no payload; other unresolved
 * expressions remain `unknown` so the generated declaration never invents a type.
 * @param call - Event publication call whose first object argument is inspected.
 * @param context - Same-file type declarations available to payload expressions.
 * @returns The payload type and imports needed to render it in a declaration file.
 */
function resolvePayloadType(call: CallExpressionView, context: ModuleTypeContext): EventMapPayloadType {
  const event = call.getObjectArgument(0);
  const data = event == null
    ? null
    : ObjectExpressionView.from(event).getProperty(ASTFilterConstants.APPLICATION_EVENT_DATA_PROPERTY)?.value;

  if (data == null || (data.type === 'Identifier' && data.value === 'undefined')) {
    return { text: 'null', isComplete: true, imports: [] };
  }

  const type = ExpressionTypeUtils.resolve(data, {
    sourceText: context.sourceText,
    moduleStart: context.moduleStart,
    resolveReference: expression => resolveReferenceType(expression, context),
  });
  return createPayloadType(type, context);
}

/**
 * Converts recovered type text into a declaration payload with the imports it needs.
 * @param type - Syntactic type information recovered from an expression or parameter.
 * @param context - Same-file imports and exports available to the source expression.
 * @returns Declaration-ready payload text and its required type-only imports.
 */
function createPayloadType(type: ExpressionTypeInfo, context: ModuleTypeContext): EventMapPayloadType {
  const imports = type.referencedNames
    .map(name => context.imports.get(name))
    .filter((typeImport): typeImport is EventMapTypeImport => typeImport != null)
    .sort((left, right) => left.name.localeCompare(right.name));

  return { text: type.text, isComplete: type.isComplete, imports };
}

/**
 * Recovers a handler payload when `event.data` is forwarded to another typed method.
 * This covers subscription-only events whose publisher is outside scanned roots,
 * while refusing to infer a type from arbitrary event-object annotations.
 * @param handler - Decorated method that receives the application event object.
 * @param classMethods - Methods declared beside the handler and callable through `this`.
 * @param context - Same-file declarations and imports available to the handler.
 * @returns A typed payload for direct forwarding, otherwise a compatibility-safe `any` fallback.
 */
function resolveHandlerPayloadType(handler: ClassMethod, classMethods: ClassMethod[], context: ModuleTypeContext): EventMapPayloadType {
  const eventParameterName = (handler.function.params[0]?.pat as { type?: unknown; value?: unknown } | undefined)?.type === 'Identifier'
    ? (handler.function.params[0]?.pat as { value?: unknown }).value
    : null;
  if (typeof eventParameterName !== 'string') {
    return { text: 'any', isComplete: false, imports: [] };
  }

  const forwardedCall = AstTraversalUtils.findNodes<CallExpression>(handler, 'CallExpression')
    .map(CallExpressionView.from)
    .find(call => call.getReceiver()?.type === 'ThisExpression' && isEventDataExpression(call.getArgument(0)?.expression, eventParameterName));
  const targetMethodName = forwardedCall?.getCalleeName();
  const target = targetMethodName == null
    ? null
    : classMethods.find(method => getMethodName(method) === targetMethodName) ?? null;
  const annotation = target == null ? null : getFirstParameterType(target, context);

  return annotation == null
    ? { text: 'any', isComplete: false, imports: [] }
    : createPayloadType(annotation, context);
}

/**
 * Checks the narrow forwarding form supported by handler payload inference.
 * Only a direct `<handlerParameter>.data` member is accepted; nested access,
 * aliases, and computed properties remain unresolved because syntax alone
 * cannot prove that they carry the decorated event's payload.
 * @param expression - Argument expression passed to a same-class method.
 * @param eventParameterName - Identifier bound to the decorated handler event.
 * @returns Whether the expression directly reads the event data property.
 */
function isEventDataExpression(expression: Expression | undefined, eventParameterName: string): boolean {
  return expression?.type === 'MemberExpression'
    && expression.object.type === 'Identifier'
    && expression.object.value === eventParameterName
    && expression.property.type === 'Identifier'
    && expression.property.value === ASTFilterConstants.APPLICATION_EVENT_DATA_PROPERTY;
}

/**
 * Converts a SWC span start into the source-string index used by navigation tools.
 * The module offset corrects SWC's process-global span and UTF-8 conversion preserves
 * exact JavaScript indices when comments, emoji, or other multibyte text precede a node.
 * @param span - SWC span whose start represents the desired source token.
 * @param ast - Parsed module that owns the span.
 * @param sourceText - Original source text associated with the module.
 * @param moduleSourceOffset - Source index represented by the module span start.
 * @returns A zero-based source index, or `null` when the span cannot be converted.
 */
function toSourceOffset(span: SourceSpan | undefined, ast: Module, sourceText: string, moduleSourceOffset: number): number | null {
  if (span?.start == null) return null;

  return utf8ByteOffsetToSourceOffset(sourceText, moduleSourceOffset, span.start - ast.span.start);
}

/**
 * Finds the smallest containing class so module-level publications remain classless.
 * The smallest span is selected for nested declarations, keeping class metadata local
 * to the occurrence instead of attaching it to an enclosing declaration.
 * @param span - Event occurrence span to locate.
 * @param classes - Class declarations discovered in the module.
 * @returns The innermost containing class, or `null` outside class bodies.
 */
function findContainingClass(span: SourceSpan | undefined, classes: ClassDeclaration[]): ClassDeclaration | null {
  const start = span?.start;
  if (start == null) return null;

  return classes
    .filter(classDeclaration => classDeclaration.span.start <= start && classDeclaration.span.end >= start)
    .sort((left, right) => (left.span.end - left.span.start) - (right.span.end - right.span.start))[0] ?? null;
}

/**
 * Builds a location for an event-key token and its containing class declaration.
 * Class offsets point to the identifier while event offsets point to the literal
 * value, allowing editors to open the exact key and its owning class independently.
 * @param eventSpan - Span of the event-key literal.
 * @param classDeclaration - Optional containing class declaration.
 * @param ast - Parsed module owning both spans.
 * @param sourceText - Original source text used for byte-to-character conversion.
 * @param sourceFile - Absolute source file containing the occurrence.
 * @param moduleSourceOffset - Source index represented by the module span start.
 * @returns Location metadata, or `null` when the event span cannot be converted.
 */
function createSourceLocation(
  eventSpan: SourceSpan | undefined,
  classDeclaration: ClassDeclaration | null,
  ast: Module,
  sourceText: string,
  sourceFile: string,
  moduleSourceOffset: number,
): EventMapSourceLocation | null {
  const offset = toSourceOffset(eventSpan, ast, sourceText, moduleSourceOffset);
  if (offset == null) return null;

  const classView = classDeclaration == null ? null : ClassView.from(classDeclaration);
  const className = classView?.className() ?? null;
  const classOffset = classView == null || className == null
    ? null
    : classView.getSourceOffset(sourceText, ast.span.start, moduleSourceOffset);

  return { sourceFile, offset, className, classOffset };
}

/**
 * Reads a class method name when SWC represents the key as a static identifier
 * or string literal. Computed and private keys are excluded because matching
 * them would require evaluating source expressions.
 * @param method - Class method whose key is being inspected.
 * @returns The statically known method name, or `null` when it cannot be read.
 */
export function getMethodName(method: ClassMethod): string | null {
  return method.key.type === 'Identifier' || method.key.type === 'StringLiteral'
    ? method.key.value
    : null;
}

/**
 * Reads the first target-method parameter annotation as a payload contract.
 * Destructured parameters keep their annotation on the pattern, so this works
 * for handlers such as `notify({ message }: SoftNotification)` as well as identifiers.
 * @param method - Same-class method receiving a forwarded `event.data` value.
 * @param context - Source text and module span needed to preserve type syntax.
 * @returns Recovered parameter type, or `null` when the method is unannotated.
 */
export function getFirstParameterType(method: ClassMethod, context: ModuleTypeContext): ExpressionTypeInfo | null {
  const pattern = method.function.params[0]?.pat as { typeAnnotation?: unknown } | undefined;
  if (pattern?.typeAnnotation == null) return null;

  const annotation = TypeAnnotationUtils.read(pattern.typeAnnotation as never, context.sourceText, context.moduleStart);
  return annotation == null
    ? null
    : { text: annotation.text, isComplete: true, referencedNames: annotation.referencedNames };
}

/**
 * Extracts event candidates from one module, preserving every payload type the
 * syntax can prove. Decorators establish name membership, while publication
 * calls carry the payload data that supplies the generated map's type details.
 * @param ast - Parsed SWC module for one source file.
 * @param sourceText - Original source text paired with the parsed module.
 * @param sourceFile - Absolute source path associated with emitted candidates.
 * @returns Event candidates in source traversal order with recoverable payload types.
 */
function collectCandidatesFromModule(
  ast: Module,
  sourceText: string,
  sourceFile: string,
  options: EventMapScanOptions,
): EventMapScanCandidate[] {
  const context = createModuleTypeContext(ast, sourceText, sourceFile);
  const candidates: EventMapScanCandidate[] = [];
  const candidatesByKey = new Map<string, EventMapScanCandidate>();
  const moduleSourceOffset = options.includeLocations === true ? findModuleSourceOffset(sourceText) : 0;
  const addCandidate = (
    name: string,
    kind: EventMapScanCandidate['kind'],
    payload: EventMapPayloadType,
    location?: EventMapSourceLocation | null,
  ) => {
    const candidateKey = `${kind}:${name}:${payload.text}`;
    const existing = candidatesByKey.get(candidateKey);
    if (existing != null) {
      if (location != null) existing.locations?.push(location);
      return;
    }

    const candidate: EventMapScanCandidate = { name, sourceFile, kind, payload };
    if (options.includeLocations === true) candidate.locations = location == null ? [] : [location];
    candidates.push(candidate);
    candidatesByKey.set(candidateKey, candidate);
  };

  const classDeclarations = AstTraversalUtils.findNodes<ClassDeclaration>(ast, 'ClassDeclaration');
  classDeclarations.forEach(classDeclaration => {
    const classMethods = classDeclaration.body.filter((member): member is ClassMethod => member.type === 'ClassMethod');
    classMethods.forEach(method => {
      ClassMethodView.from(method).getDecorators()
        .filter(decorator => DecoratorUtils.decoratorName(decorator) === ASTFilterConstants.ON_EVENT_DECORATOR_NAME)
        .forEach(decorator => {
          const decoratorView = DecoratorView.from(decorator);
          const eventName = decoratorView.getStringArgument();
          if (eventName != null) {
            addCandidate(
              eventName,
              'decorator',
              resolveHandlerPayloadType(method, classMethods, context),
              options.includeLocations === true
                ? createSourceLocation(
                  decoratorView.getArgument(0)?.expression as SourceSpan | undefined,
                  classDeclaration,
                  ast,
                  sourceText,
                  sourceFile,
                  moduleSourceOffset,
                )
                : null,
            );
          }
        });
    });
  });

  AstTraversalUtils.findNodes<CallExpression>(ast, 'CallExpression').forEach(callExpression => {
    const call = CallExpressionView.from(callExpression);
    const methodName = call.getCalleeName();
    if (![ASTFilterConstants.PUBLISH_METHOD_NAME, ASTFilterConstants.PUBLISH_ASYNC_METHOD_NAME, ASTFilterConstants.EMIT_METHOD_NAME].includes(methodName ?? '')) {
      return;
    }

    const event = call.getObjectArgument(0);
    const eventView = event == null ? null : ObjectExpressionView.from(event);
    const eventNameProperty = eventView?.getProperty(ASTFilterConstants.APPLICATION_EVENT_NAME_PROPERTY);
    const eventName = eventNameProperty == null ? null : KeyValuePropertyView.from(eventNameProperty).getString();
    if (eventName != null) {
      addCandidate(
        eventName,
        'publish',
        resolvePayloadType(call, context),
        options.includeLocations === true
          ? createSourceLocation(
            eventNameProperty.value as SourceSpan,
            findContainingClass(callExpression.span, classDeclarations),
            ast,
            sourceText,
            sourceFile,
            moduleSourceOffset,
          )
          : null,
      );
    }
  });

  return candidates;
}

/**
 * Scans configured roots once and returns every event key with its payload type.
 * Files are deduplicated before each is parsed once, then results are sorted so a
 * stable source tree produces byte-identical declaration output across runs.
 * @param root - Vite-resolved package root used to normalize scan roots.
 * @param scanRoots - Optional source roots to scan alongside the plugin root.
 * @returns Event candidates sorted by kind, key, and recovered payload text.
 */
export async function scanEventMapSources(
  root: string,
  scanRoots: string[] = [root],
  options: EventMapScanOptions = {},
): Promise<EventMapScanCandidate[]> {
  const discoveredFiles = await Promise.all(scanRoots.map(scanRoot => fg(
    [EventMapScanPath.SOURCE_DIRECTORY_SCAN_PATH],
    {
      cwd: resolve(root, scanRoot),
      absolute: true,
      onlyFiles: true,
      ignore: [EventMapScanPath.SOURCE_DECLARATION_IGNORE_PATTERN],
    },
  )));
  const files = [...new Set(discoveredFiles.flat())].sort((left, right) => left.localeCompare(right));
  const candidates: EventMapScanCandidate[] = [];

  for (const file of files) {
    const sourceText = await readFile(file, 'utf8');
    const ast = await parse(sourceText, { syntax: 'typescript', decorators: true });
    candidates.push(...collectCandidatesFromModule(ast, sourceText, file, options));
  }

  return candidates.sort((left, right) => {
    const kindOrder = left.kind.localeCompare(right.kind);
    if (kindOrder !== 0) return kindOrder;

    const nameOrder = left.name.localeCompare(right.name);
    return nameOrder !== 0 ? nameOrder : (left.payload?.text ?? 'unknown').localeCompare(right.payload?.text ?? 'unknown');
  });
}
