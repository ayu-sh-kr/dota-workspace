import type {Expression, Module} from '@swc/core';
import {resolve} from 'node:path';
import {AstModulePathResolver} from '@dota/utils/AstModulePathResolver.ts';
import type {
  AstConstantBinding,
  AstExportBinding,
  AstImportBinding,
  AstModuleIndex,
  AstModuleIndexOptions,
  AstModuleResolutionOptions,
  AstResolutionReason,
  AstResolutionResult,
  AstResolutionTraceStep,
  AstStaticPropertyBinding,
  AstVariableDeclarationCandidate,
  IndexedAstModule,
  ParsedAstModule,
} from '@dota/Types.ts';

type AstRecord = Record<string, any> & {type: string};

type ResolutionState = {
  visited: Set<string>;
  trace: AstResolutionTraceStep[];
  reason: AstResolutionReason;
  depth: number;
  options: Required<Pick<AstModuleResolutionOptions, 'maxDepth' | 'maxValueLength'>> & AstModuleResolutionOptions;
};

/**
 * Resolves explicit string values across a parsed module set without a checker.
 * It owns generic binding, export, alias, and bounded-expression traversal; scanners
 * decide which declarations are eligible and whether a resolved string is meaningful.
 */
export class AstModuleResolver {
  /**
   * Builds a normalized index from parsed modules and an optional name policy.
   * Direct const bindings, static properties, imports, exports, and wildcard edges are
   * indexed once so every event-site lookup reuses the same parsed module graph.
   * @param modules Parsed source modules, each read and parsed once by the caller.
   * @param options Declaration/property naming policy and optional path settings.
   * @returns Absolute normalized source path to indexed module metadata.
   */
  static createIndex(modules: ParsedAstModule[], options: AstModuleIndexOptions = {}): AstModuleIndex {
    const isDeclarationNameEligible = options.isDeclarationNameEligible ?? (() => true);
    return new Map(modules.map(module => {
      const indexed: IndexedAstModule = {
        ...module,
        constants: new Map(),
        staticProperties: new Map(),
        imports: this.collectImports(module.ast),
        exports: new Map(),
        wildcardExports: [],
      };

      this.indexTopLevelConstants(indexed, isDeclarationNameEligible);
      this.indexStaticProperties(indexed, isDeclarationNameEligible);
      this.indexExports(indexed);
      return [this.normalizeSourceFile(module.sourceFile), indexed];
    }));
  }

  /**
   * Resolves one expression to an explicit string without executing source code.
   * The compatibility method keeps callers independent from diagnostics while using the
   * richer trace-capable implementation underneath.
   * @param expression Expression whose statically known value is requested.
   * @param currentModule Parsed module containing the expression.
   * @param index Parsed-module index used for same-file and imported references.
   * @param options Alias, extension, and safety settings for module traversal.
   * @returns Explicit string value, or null when syntax cannot prove one.
   */
  static resolve(expression: Expression, currentModule: ParsedAstModule, index: AstModuleIndex, options: AstModuleResolutionOptions = {}): string | null {
    return this.resolveWithTrace(expression, currentModule, index, options).value;
  }

  /**
   * Resolves one expression and explains every module or binding edge it follows.
   * A null result is always conservative: dynamic code, unresolved paths, cycles, and
   * unsupported syntax never become fabricated event names.
   * @param expression Expression whose statically known value is requested.
   * @param currentModule Parsed module containing the expression.
   * @param index Parsed-module index used for same-file and imported references.
   * @param options Alias, extension, and safety settings for module traversal.
   * @returns Proven value, stable reason code, and traversal trace.
   */
  static resolveWithTrace(expression: Expression, currentModule: ParsedAstModule, index: AstModuleIndex, options: AstModuleResolutionOptions = {}): AstResolutionResult {
    const indexedModule = index.get(this.normalizeSourceFile(currentModule.sourceFile));
    if (indexedModule == null) return {value: null, reason: 'module-not-indexed', trace: []};

    const state = this.createResolutionState(options);
    const value = this.resolveExpression(expression, indexedModule, index, state);
    return {value, reason: value == null ? state.reason : 'resolved', trace: state.trace};
  }

  /**
   * Selects direct module-level variable declarations for indexing.
   * Export wrappers are unwrapped here so nested or destructured declarations never enter
   * the name-addressable binding model.
   * @param module Parsed module whose direct body items are inspected.
   * @returns Variable declarations with their direct-export status.
   */
  private static getVariableDeclarations(module: Module): AstVariableDeclarationCandidate[] {
    const declarations: AstVariableDeclarationCandidate[] = [];
    module.body.forEach(item => {
      const record = item as unknown as AstRecord;
      if (record.type === 'VariableDeclaration') {
        declarations.push({declaration: record, exported: false});
        return;
      }

      if (record.type === 'ExportDeclaration' && (record.declaration as AstRecord | undefined)?.type === 'VariableDeclaration') {
        declarations.push({declaration: record.declaration as AstRecord, exported: true});
      }
    });
    return declarations;
  }

  /**
   * Indexes direct const bindings and retains SWC context for shadow-safe lookup.
   * Destructuring, let, var, and unnamed bindings stay outside this narrow proof model.
   * @param module Module record being enriched with eligible constants.
   * @param isDeclarationNameEligible Policy deciding which binding names qualify.
   */
  private static indexTopLevelConstants(module: IndexedAstModule, isDeclarationNameEligible: (name: string) => boolean): void {
    this.getVariableDeclarations(module.ast).forEach(({declaration, exported}) => {
      if (declaration.kind !== 'const' || !Array.isArray(declaration.declarations)) return;

      declaration.declarations.forEach(rawDeclaration => {
        const declarationNode = rawDeclaration as AstRecord;
        const identifier = declarationNode.id as AstRecord | undefined;
        const initializer = declarationNode.init as Expression | undefined;
        const name = identifier?.type === 'Identifier' ? identifier.value : undefined;
        const position = identifier?.span?.start;
        if (typeof name !== 'string' || !isDeclarationNameEligible(name) || initializer == null || typeof position !== 'number') return;

        const binding: AstConstantBinding = {name, initializer, position, context: identifier?.ctxt};
        const bindings = module.constants.get(name) ?? [];
        bindings.push(binding);
        module.constants.set(name, bindings);
        if (exported) this.addLocalExport(module, name, name);
      });
    });
  }

  /**
   * Indexes static class properties selected by the caller's naming policy.
   * Computed, private, instance, and initializer-free properties remain unresolved because
   * their values cannot be established from this syntax boundary.
   * @param module Module record being enriched with static properties.
   * @param isDeclarationNameEligible Policy deciding which property names qualify.
   */
  private static indexStaticProperties(module: IndexedAstModule, isDeclarationNameEligible: (name: string) => boolean): void {
    const classes = module.ast.body.flatMap(item => this.findClassDeclarations(item as unknown as AstRecord));
    classes.forEach(classDeclaration => {
      const className = classDeclaration.identifier?.value ?? (classDeclaration.type === 'ClassExpression' ? 'default' : undefined);
      if (typeof className !== 'string' || !Array.isArray(classDeclaration.body)) return;

      classDeclaration.body.forEach(rawMember => {
        const member = rawMember as AstRecord;
        const key = member.key as AstRecord | undefined;
        const propertyName = key?.type === 'Identifier' || key?.type === 'StringLiteral' ? key.value : undefined;
        const initializer = member.value as Expression | undefined;
        if (member.type !== 'ClassProperty' || member.isStatic !== true || typeof propertyName !== 'string' || !isDeclarationNameEligible(propertyName) || initializer == null) return;

        module.staticProperties.set(`${className}.${propertyName}`, {className, propertyName, initializer});
      });
    });
  }

  /**
   * Collects named, default, and namespace imports with their local syntax contexts.
   * The context lets resolution reject a module-level constant when an inner parameter
   * or local binding shadows it at the event site.
   * @param ast Parsed module whose imports are inspected.
   * @returns Local import names mapped to source-level names and specifiers.
   */
  private static collectImports(ast: Module): Map<string, AstImportBinding> {
    const imports = new Map<string, AstImportBinding>();
    ast.body.forEach(item => {
      const declaration = item as unknown as AstRecord;
      if (declaration.type !== 'ImportDeclaration' || !Array.isArray(declaration.specifiers)) return;

      const source = declaration.source?.value;
      if (typeof source !== 'string') return;

      declaration.specifiers.forEach(rawSpecifier => {
        const specifier = rawSpecifier as AstRecord;
        const localName = specifier.local?.value;
        if (typeof localName !== 'string') return;

        if (specifier.type === 'ImportSpecifier') {
          const importedName = specifier.imported?.value ?? localName;
          if (typeof importedName === 'string') imports.set(localName, {localName, importedName, source, kind: 'named', context: specifier.local?.ctxt});
        } else if (specifier.type === 'ImportDefaultSpecifier') {
          imports.set(localName, {localName, importedName: 'default', source, kind: 'default', context: specifier.local?.ctxt});
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          imports.set(localName, {localName, importedName: '*', source, kind: 'namespace', context: specifier.local?.ctxt});
        }
      });
    });
    return imports;
  }

  /**
   * Indexes direct exports, re-exports, wildcard edges, and default class exports.
   * Wildcard sources are kept as graph edges so names are resolved lazily with the same
   * cycle guard as direct imports instead of copying an incomplete export snapshot.
   * @param module Module record receiving export metadata.
   */
  private static indexExports(module: IndexedAstModule): void {
    module.ast.body.forEach(item => {
      const declaration = item as unknown as AstRecord;
      if (declaration.type === 'ExportDeclaration') {
        const exportedDeclaration = declaration.declaration as AstRecord | undefined;
        const className = exportedDeclaration?.type === 'ClassDeclaration' ? exportedDeclaration.identifier?.value : undefined;
        if (typeof className === 'string') this.addLocalExport(module, className, className);
      }

      if (declaration.type === 'ExportDefaultDeclaration') {
        const defaultDeclaration = declaration.decl as AstRecord | undefined;
        const className = defaultDeclaration?.identifier?.value ?? (defaultDeclaration?.type === 'ClassExpression' ? 'default' : undefined);
        if (typeof className === 'string') this.addLocalExport(module, 'default', className, 'default');
      }

      if (declaration.type === 'ExportAllDeclaration') {
        const source = declaration.source?.value;
        if (typeof source === 'string') module.wildcardExports.push(source);
        return;
      }

      if (declaration.type !== 'ExportNamedDeclaration' || !Array.isArray(declaration.specifiers)) return;

      const source = declaration.source?.value;
      declaration.specifiers.forEach(rawSpecifier => {
        const specifier = rawSpecifier as AstRecord;
        if (specifier.type === 'ExportNamespaceSpecifier') {
          const exportedName = specifier.name?.value;
          if (typeof source === 'string' && typeof exportedName === 'string') {
            module.exports.set(exportedName, {exportedName, importedName: '*', source, kind: 'namespace'});
          }
          return;
        }

        if (specifier.type !== 'ExportSpecifier') return;
        const localName = specifier.orig?.value;
        const exportedName = (specifier.exported ?? specifier.orig)?.value;
        if (typeof localName !== 'string' || typeof exportedName !== 'string') return;

        if (typeof source === 'string') {
          module.exports.set(exportedName, {exportedName, importedName: localName, source, kind: 'named'});
        } else {
          this.addLocalExport(module, exportedName, localName);
        }
      });
    });
  }

  /**
   * Registers a same-module export without overwriting an earlier direct binding.
   * Equivalent export spellings therefore resolve deterministically.
   * @param module Module receiving the export binding.
   * @param exportedName Name visible to importers.
   * @param localName Local declaration or import alias behind that name.
   * @param kind Export shape, defaulting to a named binding.
   */
  private static addLocalExport(module: IndexedAstModule, exportedName: string, localName: string, kind: AstExportBinding['kind'] = 'named'): void {
    if (!module.exports.has(exportedName)) module.exports.set(exportedName, {exportedName, localName, kind});
  }

  /**
   * Resolves one expression branch while carrying cycle, depth, and trace state.
   * Only explicit strings, safe wrappers, static string composition, identifiers, and
   * non-computed member paths can produce a value.
   * @param expression Expression branch currently being inspected.
   * @param module Indexed module containing that branch.
   * @param index Parsed modules available for imports and re-exports.
   * @param state Shared safety and diagnostics state for one resolution request.
   * @returns Resolved string, or null for unsupported syntax/cycles.
   */
  private static resolveExpression(expression: Expression, module: IndexedAstModule, index: AstModuleIndex, state: ResolutionState): string | null {
    if (state.depth >= state.options.maxDepth) return this.fail(state, 'resolution-limit', 'maximum traversal depth reached', 'limit', module.sourceFile);
    state.depth += 1;
    state.trace.push({kind: 'expression', detail: expression.type, sourceFile: module.sourceFile});

    let value: string | null;
    switch (expression.type) {
      case 'StringLiteral':
        value = expression.value;
        break;
      case 'ParenthesisExpression':
      case 'TsAsExpression':
      case 'TsConstAssertion':
      case 'TsNonNullExpression':
      case 'TsSatisfiesExpression':
      case 'TsTypeAssertion':
        value = this.resolveExpression(expression.expression, module, index, state);
        break;
      case 'Identifier':
        value = this.resolveName(expression.value, expression.span.start, (expression as unknown as AstRecord).ctxt, module, index, state);
        break;
      case 'MemberExpression':
        value = expression.object.type === 'Identifier' && expression.property.type === 'Identifier' && (expression as unknown as AstRecord).computed !== true
          ? this.resolveStaticProperty(expression.object.value, expression.property.value, module, index, state)
          : this.fail(state, 'unsupported-expression', 'computed or nested member', 'expression', module.sourceFile);
        break;
      case 'TemplateLiteral':
        value = this.resolveTemplate(expression, module, index, state);
        break;
      case 'BinaryExpression':
        value = expression.operator === '+'
          ? this.resolveBinaryString(expression, module, index, state)
          : this.fail(state, 'dynamic-expression', 'non-string binary operator', 'expression', module.sourceFile);
        break;
      default:
        value = this.fail(state, 'unsupported-expression', expression.type, 'expression', module.sourceFile);
        break;
    }

    state.depth -= 1;
    return value;
  }

  /**
   * Resolves a template only when every interpolation is statically string-valued.
   * Bounded output prevents large source expressions from becoming generated metadata.
   * @param expression Template expression to evaluate.
   * @param module Indexed module containing the template.
   * @param index Parsed modules available for interpolation references.
   * @param state Shared safety and diagnostics state.
   * @returns Concatenated string, or null when one part is dynamic.
   */
  private static resolveTemplate(expression: AstRecord, module: IndexedAstModule, index: AstModuleIndex, state: ResolutionState): string | null {
    const quasis = Array.isArray(expression.quasis) ? expression.quasis : [];
    const expressions = Array.isArray(expression.expressions) ? expression.expressions : [];
    let value = '';
    for (let indexNumber = 0; indexNumber < quasis.length; indexNumber += 1) {
      const quasi = quasis[indexNumber] as AstRecord;
      value += quasi.cooked ?? quasi.raw ?? '';
      const interpolation = expressions[indexNumber] as Expression | undefined;
      if (interpolation != null) {
        const interpolationValue = this.resolveExpression(interpolation, module, index, state);
        if (interpolationValue == null) return null;
        value += interpolationValue;
      }
      if (value.length > state.options.maxValueLength) return this.fail(state, 'resolution-limit', 'static value is too long', 'limit', module.sourceFile);
    }
    return value;
  }

  /**
   * Resolves string concatenation without coercing numbers, booleans, or objects.
   * Every operand must prove a string so the resolver never imitates JavaScript coercion.
   * @param expression Binary expression using `+`.
   * @param module Indexed module containing the expression.
   * @param index Parsed modules available for operands.
   * @param state Shared safety and diagnostics state.
   * @returns Concatenated string, or null for dynamic operands.
   */
  private static resolveBinaryString(expression: AstRecord, module: IndexedAstModule, index: AstModuleIndex, state: ResolutionState): string | null {
    const left = this.resolveExpression(expression.left as Expression, module, index, state);
    const right = this.resolveExpression(expression.right as Expression, module, index, state);
    if (left == null || right == null) return null;
    const value = `${left}${right}`;
    return value.length <= state.options.maxValueLength
      ? value
      : this.fail(state, 'resolution-limit', 'static value is too long', 'limit', module.sourceFile);
  }

  /**
   * Resolves a same-module binding or follows an imported binding from its use site.
   * SWC context matching prevents an unsupported local shadow from falling back to an outer event.
   * @param name Identifier used by the expression or export binding.
   * @param position Reference position used for deterministic declaration selection.
   * @param context SWC lexical context of the reference, when available.
   * @param module Indexed module containing the reference.
   * @param index Parsed modules available for imports.
   * @param state Shared safety and diagnostics state.
   * @returns Resolved string, or null when no eligible binding exists.
   */
  private static resolveName(name: string, position: number, context: number | undefined, module: IndexedAstModule, index: AstModuleIndex, state: ResolutionState): string | null {
    const key = `${module.sourceFile}:name:${name}`;
    if (state.visited.has(key)) return this.fail(state, 'cycle', `binding cycle at ${name}`, 'binding', module.sourceFile);
    state.visited.add(key);

    const bindings = module.constants.get(name);
    const binding = this.findConstant(bindings, position, context);
    if (binding != null) {
      state.trace.push({kind: 'binding', detail: name, sourceFile: module.sourceFile});
      return this.resolveExpression(binding.initializer, module, index, state);
    }
    if (bindings != null && bindings.length > 0 && context != null) return this.fail(state, 'binding-shadowed', name, 'binding', module.sourceFile);

    const importBinding = module.imports.get(name);
    if (importBinding == null) return this.fail(state, 'binding-not-found', name, 'binding', module.sourceFile);
    if (context != null && importBinding.context != null && importBinding.context !== context) {
      return this.fail(state, 'binding-shadowed', name, 'binding', module.sourceFile);
    }
    return this.resolveImport(importBinding, module, index, state);
  }

  /**
   * Follows an import only when its mapped target has exactly one indexed module.
   * Alias and extension behavior is delegated to the generic path resolver so the AST package
   * remains independent from Vite and other build tools.
   * @param binding Import metadata collected from the current module.
   * @param module Module containing the import declaration.
   * @param index Parsed modules available for imports.
   * @param state Shared safety and diagnostics state.
   * @returns Resolved string, or null for unavailable targets/exports.
   */
  private static resolveImport(binding: AstImportBinding, module: IndexedAstModule, index: AstModuleIndex, state: ResolutionState): string | null {
    const candidates = AstModulePathResolver.findCandidates(module.sourceFile, binding.source, index, state.options);
    if (candidates.length === 0) {
      const reason = binding.source.startsWith('.') ? 'module-not-found' : 'module-specifier-unmapped';
      return this.fail(state, reason, binding.source, 'import', module.sourceFile);
    }
    if (candidates.length > 1) return this.fail(state, 'ambiguous-module', binding.source, 'import', module.sourceFile);

    const target = index.get(candidates[0]);
    if (target == null) return this.fail(state, 'module-not-indexed', candidates[0], 'import', module.sourceFile);
    state.trace.push({kind: 'import', detail: `${binding.localName} from ${binding.source}`, sourceFile: module.sourceFile});
    return binding.kind === 'namespace'
      ? null
      : this.resolveExport(target, binding.importedName, index, state);
  }

  /**
   * Resolves a local export, re-export, or wildcard export chain.
   * Direct bindings win; wildcard sources are visited in source order and cycles remain guarded.
   * @param module Indexed module containing the requested export.
   * @param name Export name requested by an importer.
   * @param index Parsed modules available for re-exports.
   * @param state Shared safety and diagnostics state.
   * @returns Resolved string, or null for missing/unsupported exports.
   */
  private static resolveExport(module: IndexedAstModule, name: string, index: AstModuleIndex, state: ResolutionState): string | null {
    const key = `${module.sourceFile}:export:${name}`;
    if (state.visited.has(key)) return this.fail(state, 'cycle', `export cycle at ${name}`, 'export', module.sourceFile);
    state.visited.add(key);

    const binding = module.exports.get(name);
    if (binding != null) {
      state.trace.push({kind: 'export', detail: name, sourceFile: module.sourceFile});
      if (binding.source != null && binding.importedName != null) {
        const target = this.resolveTargetModule(module.sourceFile, binding.source, index, state);
        return target == null ? null : this.resolveExport(target, binding.importedName, index, state);
      }
      return binding.localName == null ? this.fail(state, 'export-not-found', name, 'export', module.sourceFile)
        : this.resolveName(binding.localName, Number.MAX_SAFE_INTEGER, undefined, module, index, state);
    }

    for (const source of module.wildcardExports) {
      const target = this.resolveTargetModule(module.sourceFile, source, index, state);
      const value = target == null ? null : this.resolveExport(target, name, index, state);
      if (value != null) return value;
    }
    return this.fail(state, 'export-not-found', name, 'export', module.sourceFile);
  }

  /**
   * Resolves a local or imported static member, including namespace imports.
   * Computed properties stay outside the proof boundary; namespace members reuse normal export lookup.
   * @param className Local class or namespace identifier used by the member expression.
   * @param propertyName Static property/export name used by the member expression.
   * @param module Indexed module containing the member expression.
   * @param index Parsed modules available for imported members.
   * @param state Shared safety and diagnostics state.
   * @returns Resolved string, or null for unsupported class/property paths.
   */
  private static resolveStaticProperty(className: string, propertyName: string, module: IndexedAstModule, index: AstModuleIndex, state: ResolutionState): string | null {
    const localProperty = module.staticProperties.get(`${className}.${propertyName}`);
    if (localProperty != null) return this.resolveStaticInitializer(localProperty, module, index, state);

    const importBinding = module.imports.get(className);
    if (importBinding == null) return this.fail(state, 'binding-not-found', className, 'member', module.sourceFile);
    const target = this.resolveTargetModule(module.sourceFile, importBinding.source, index, state);
    if (target == null) return null;

    if (importBinding.kind === 'namespace') return this.resolveExport(target, propertyName, index, state);

    const targetModule = this.resolveExportedModule(target, importBinding.importedName, index, state);
    const importedProperty = targetModule == null ? null : [...targetModule.staticProperties.values()].find(property => property.propertyName === propertyName
      && (property.className === importBinding.importedName || property.className === className || importBinding.importedName === 'default'));
    return importedProperty == null || targetModule == null
      ? this.fail(state, 'export-not-found', `${className}.${propertyName}`, 'member', module.sourceFile)
      : this.resolveStaticInitializer(importedProperty, targetModule, index, state);
  }

  /**
   * Resolves one static initializer and guards repeated member traversal.
   * @param binding Static property selected from the owning module.
   * @param module Module owning the property initializer.
   * @param index Parsed modules available to nested references.
   * @param state Shared safety and diagnostics state.
   * @returns Resolved string, or null when the property cycle is detected.
   */
  private static resolveStaticInitializer(binding: AstStaticPropertyBinding, module: IndexedAstModule, index: AstModuleIndex, state: ResolutionState): string | null {
    const key = `${module.sourceFile}:static:${binding.className}.${binding.propertyName}`;
    if (state.visited.has(key)) return this.fail(state, 'cycle', key, 'member', module.sourceFile);
    state.visited.add(key);
    return this.resolveExpression(binding.initializer, module, index, state);
  }

  /**
   * Follows class exports/re-exports until the owning static-property module is found.
   * A module with no matching property is still retained for a local class export so callers
   * receive a normal unresolved result rather than an unsafe fallback.
   * @param module Indexed module containing the requested class export.
   * @param name Export name requested by the importing module.
   * @param index Parsed modules available for class re-exports.
   * @param state Shared safety and diagnostics state.
   * @returns Module owning the class properties, or null when unavailable.
   */
  private static resolveExportedModule(module: IndexedAstModule, name: string, index: AstModuleIndex, state: ResolutionState): IndexedAstModule | null {
    const key = `${module.sourceFile}:class-export:${name}`;
    if (state.visited.has(key)) return null;
    state.visited.add(key);

    const binding = module.exports.get(name);
    if (binding == null) return null;
    if (binding.source != null && binding.importedName != null) {
      const target = this.resolveTargetModule(module.sourceFile, binding.source, index, state);
      return target == null ? null : this.resolveExportedModule(target, binding.importedName, index, state);
    }

    if (binding.localName == null) return null;
    if ([...module.staticProperties.keys()].some(propertyKey => propertyKey.startsWith(`${binding.localName}.`))) return module;
    const localImport = module.imports.get(binding.localName);
    if (localImport == null) return module;
    const target = this.resolveTargetModule(module.sourceFile, localImport.source, index, state);
    return target == null ? null : this.resolveExportedModule(target, localImport.importedName, index, state);
  }

  /**
   * Selects the nearest eligible binding while honoring SWC lexical context.
   * A context mismatch is deliberately treated as shadowing instead of falling back to an outer value.
   * @param bindings Eligible bindings sharing one source-level name.
   * @param position Reference position used for deterministic fallback selection.
   * @param context Reference context used for lexical shadow checks.
   * @returns Selected binding, or null when no compatible candidate exists.
   */
  private static findConstant(bindings: AstConstantBinding[] | undefined, position: number, context?: number): AstConstantBinding | null {
    if (bindings == null || bindings.length === 0) return null;
    const scoped = context == null ? bindings : bindings.filter(binding => binding.context === context);
    if (scoped.length === 0) return null;
    const preceding = scoped.filter(binding => binding.position <= position);
    return [...(preceding.length > 0 ? preceding : scoped)].sort((left, right) => right.position - left.position)[0] ?? null;
  }

  /**
   * Resolves one import edge through the generic path mapper and records its failure category.
   * @param sourceFile Importing source file.
   * @param specifier Import or re-export module specifier.
   * @param index Parsed modules defining the allowed filesystem boundary.
   * @param state Shared resolver options and diagnostics state.
   * @returns Indexed target module, or null when the target is unavailable.
   */
  private static resolveTargetModule(sourceFile: string, specifier: string, index: AstModuleIndex, state: ResolutionState): IndexedAstModule | null {
    const candidates = AstModulePathResolver.findCandidates(sourceFile, specifier, index, state.options);
    if (candidates.length === 0) {
      const reason = specifier.startsWith('.') ? 'module-not-found' : 'module-specifier-unmapped';
      this.fail(state, reason, specifier, 'module', sourceFile);
      return null;
    }
    if (candidates.length > 1) {
      this.fail(state, 'ambiguous-module', specifier, 'module', sourceFile);
      return null;
    }
    return index.get(candidates[0]) ?? (this.fail(state, 'module-not-indexed', candidates[0], 'module', sourceFile), null);
  }

  /**
   * Creates one resolution state with conservative limits suitable for generated metadata.
   * @param options Caller-supplied alias, extension, and safety settings.
   * @returns Mutable state shared by one recursive resolution request.
   */
  private static createResolutionState(options: AstModuleResolutionOptions): ResolutionState {
    return {
      visited: new Set(),
      trace: [],
      reason: 'unsupported-expression',
      depth: 0,
      options: {maxDepth: 32, maxValueLength: 512, ...options},
    };
  }

  /**
   * Records a guarded failure and returns null so callers can compose failure branches directly.
   * The latest meaningful reason is retained for the final result while the trace preserves the path.
   * @param state Active resolution state.
   * @param reason Stable failure category.
   * @param detail Short source-level failure detail.
   * @param kind Trace category for the failure.
   * @param sourceFile Module associated with the failure.
   * @returns Always null, representing an unproven value.
   */
  private static fail(state: ResolutionState, reason: AstResolutionReason, detail: string, kind: string, sourceFile: string): null {
    state.reason = reason;
    state.trace.push({kind, detail, sourceFile});
    return null;
  }

  /**
   * Normalizes relative segments into the absolute key used by the module index.
   * @param sourceFile Source path collected by a scanner or derived from an import.
   * @returns Absolute normalized source path.
   */
  private static normalizeSourceFile(sourceFile: string): string {
    return resolve(sourceFile).replace(/\\/g, '/');
  }

  /**
   * Collects class declarations and default class expressions from direct module items.
   * Nested classes remain outside this index boundary because properties resolve through
   * named module-level class declarations.
   * @param node Direct module item to inspect.
   * @returns Class-like declarations represented by the item.
   */
  private static findClassDeclarations(node: AstRecord): AstRecord[] {
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') return [node];
    if (node.type === 'ExportDeclaration' && ['ClassDeclaration', 'ClassExpression'].includes((node.declaration as AstRecord | undefined)?.type ?? '')) {
      return [node.declaration as AstRecord];
    }
    if (node.type === 'ExportDefaultDeclaration' && ['ClassDeclaration', 'ClassExpression'].includes((node.decl as AstRecord | undefined)?.type ?? '')) {
      return [node.decl as AstRecord];
    }
    return [];
  }
}
