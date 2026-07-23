import {dirname, extname, resolve} from 'node:path';
import type {ClassDeclaration, Expression, Module} from '@swc/core';
import type {
  AstConstantBinding,
  AstExportBinding,
  AstImportBinding,
  AstModuleIndex,
  AstModuleIndexOptions,
  AstStaticPropertyBinding,
  AstVariableDeclarationCandidate,
  IndexedAstModule,
  ParsedAstModule,
} from '@dota/Types.ts';

type AstRecord = Record<string, unknown> & {type: string};

/**
 * Resolves explicit string values across a parsed module set without a checker.
 * It provides the reusable AST boundary for scanners that need imports, exports,
 * static properties, wrappers, and cycle-safe identifier resolution.
 */
export class AstModuleResolver {
  /**
   * Builds a normalized index from parsed modules and an optional name policy.
   * Only direct const bindings, named imports/exports, and static class properties
   * enter the index; unsupported runtime expressions remain outside the model.
   * @param modules Parsed source modules, each read and parsed once by the caller.
   * @param options Optional declaration/property naming policy.
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
      };

      this.indexTopLevelConstants(indexed, isDeclarationNameEligible);
      this.indexStaticProperties(indexed, isDeclarationNameEligible);
      this.indexExports(indexed);
      return [this.normalizeSourceFile(module.sourceFile), indexed];
    }));
  }

  /**
   * Resolves one expression to an explicit string without executing source code.
   * TypeScript wrappers are transparent, while unsupported or cyclic references
   * return null so callers never receive identifier text as a fabricated value.
   * @param expression Expression whose statically known value is requested.
   * @param currentModule Parsed module containing the expression.
   * @param index Parsed-module index used for same-file and relative imports.
   * @returns Explicit string value, or null when syntax cannot prove one.
   */
  static resolve(expression: Expression, currentModule: ParsedAstModule, index: AstModuleIndex): string | null {
    const indexedModule = index.get(this.normalizeSourceFile(currentModule.sourceFile));
    return indexedModule == null ? null : this.resolveExpression(expression, indexedModule, index, new Set());
  }

  /**
   * Selects direct module-level variable declarations for indexing.
   * Export wrappers are unwrapped here so nested or destructured declarations
   * never enter the name-addressable binding model.
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
   * Indexes direct identifier const declarations and their initializers.
   * Destructuring, let, var, and unnamed bindings are excluded because their
   * values cannot be followed by a narrow lexical resolver.
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
        const position = (identifier?.span as {start?: unknown} | undefined)?.start;
        if (typeof name !== 'string' || !isDeclarationNameEligible(name) || initializer == null || typeof position !== 'number') return;

        const binding: AstConstantBinding = {name, initializer, position};
        const bindings = module.constants.get(name) ?? [];
        bindings.push(binding);
        module.constants.set(name, bindings);
        if (exported) this.addLocalExport(module, name, name);
      });
    });
  }

  /**
   * Indexes static class properties selected by the caller's naming policy.
   * Computed, private, instance, and initializer-free properties stay unresolved
   * because their values cannot be established from this syntax boundary.
   * @param module Module record being enriched with static properties.
   * @param isDeclarationNameEligible Policy deciding which property names qualify.
   */
  private static indexStaticProperties(module: IndexedAstModule, isDeclarationNameEligible: (name: string) => boolean): void {
    const classes = module.ast.body.flatMap(item => this.findClassDeclarations(item as unknown as AstRecord));
    classes.forEach(classDeclaration => {
      const className = (classDeclaration.identifier as {value?: unknown} | undefined)?.value;
      if (typeof className !== 'string' || !Array.isArray(classDeclaration.body)) return;

      classDeclaration.body.forEach(rawMember => {
        const member = rawMember as unknown as AstRecord;
        const key = member.key as AstRecord | undefined;
        const propertyName = key?.type === 'Identifier' || key?.type === 'StringLiteral' ? key.value : undefined;
        const initializer = member.value as Expression | undefined;
        if (member.type !== 'ClassProperty' || member.isStatic !== true || typeof propertyName !== 'string' || !isDeclarationNameEligible(propertyName) || initializer == null) return;

        module.staticProperties.set(`${className}.${propertyName}`, {className, propertyName, initializer});
      });
    });
  }

  /**
   * Collects named imports while preserving same-name import syntax.
   * Default and namespace imports remain unsupported because they do not identify
   * one declaration that can be validated by a caller's naming policy.
   * @param ast Parsed module whose import declarations are inspected.
   * @returns Local import names mapped to source-level names and specifiers.
   */
  private static collectImports(ast: Module): Map<string, AstImportBinding> {
    const imports = new Map<string, AstImportBinding>();
    ast.body.forEach(item => {
      const declaration = item as unknown as AstRecord;
      if (declaration.type !== 'ImportDeclaration' || !Array.isArray(declaration.specifiers)) return;

      const source = (declaration.source as {value?: unknown} | undefined)?.value;
      if (typeof source !== 'string') return;

      declaration.specifiers.forEach(rawSpecifier => {
        const specifier = rawSpecifier as AstRecord;
        if (specifier.type !== 'ImportSpecifier') return;

        const localName = (specifier.local as {value?: unknown} | undefined)?.value;
        const importedName = (specifier.imported as {value?: unknown} | undefined)?.value ?? localName;
        if (typeof localName !== 'string' || typeof importedName !== 'string') return;
        imports.set(localName, {localName, importedName, source});
      });
    });
    return imports;
  }

  /**
   * Indexes direct exports and relative re-exports so imported aliases can be
   * followed without a TypeScript program or runtime module loading.
   * @param module Module record being enriched with export bindings.
   */
  private static indexExports(module: IndexedAstModule): void {
    module.ast.body.forEach(item => {
      const declaration = item as unknown as AstRecord;
      if (declaration.type === 'ExportDeclaration') {
        const exportedDeclaration = declaration.declaration as AstRecord | undefined;
        const className = exportedDeclaration?.type === 'ClassDeclaration'
          ? (exportedDeclaration.identifier as {value?: unknown} | undefined)?.value
          : null;
        if (typeof className === 'string') this.addLocalExport(module, className, className);
      }

      if (declaration.type !== 'ExportNamedDeclaration' || !Array.isArray(declaration.specifiers)) return;

      const source = (declaration.source as {value?: unknown} | undefined)?.value;
      declaration.specifiers.forEach(rawSpecifier => {
        const specifier = rawSpecifier as AstRecord;
        if (specifier.type !== 'ExportSpecifier') return;

        const localName = (specifier.orig as {value?: unknown} | undefined)?.value;
        const exportedName = ((specifier.exported ?? specifier.orig) as {value?: unknown} | undefined)?.value;
        if (typeof localName !== 'string' || typeof exportedName !== 'string') return;

        if (typeof source === 'string') {
          module.exports.set(exportedName, {exportedName, importedName: localName, source});
        } else {
          this.addLocalExport(module, exportedName, localName);
        }
      });
    });
  }

  /**
   * Registers a same-module export without overwriting an earlier direct binding.
   * This keeps equivalent export syntax deterministic when the AST exposes more
   * than one declaration for a visible name.
   * @param module Indexed module receiving the export binding.
   * @param exportedName Name visible to importers.
   * @param localName Local declaration or import alias behind that name.
   */
  private static addLocalExport(module: IndexedAstModule, exportedName: string, localName: string): void {
    if (!module.exports.has(exportedName)) module.exports.set(exportedName, {exportedName, localName});
  }

  /**
   * Resolves one expression branch while carrying a cycle guard across aliases.
   * Only literals, transparent wrappers, indexed identifiers, and non-computed
   * static members can produce a value.
   * @param expression Expression branch currently being inspected.
   * @param module Indexed module containing that branch.
   * @param index Parsed modules available for relative imports.
   * @param visited Binding keys already followed in this resolution chain.
   * @returns Resolved string, or null for unsupported syntax/cycles.
   */
  private static resolveExpression(expression: Expression, module: IndexedAstModule, index: AstModuleIndex, visited: Set<string>): string | null {
    switch (expression.type) {
      case 'StringLiteral':
        return expression.value;
      case 'ParenthesisExpression':
      case 'TsAsExpression':
      case 'TsConstAssertion':
      case 'TsNonNullExpression':
        return this.resolveExpression(expression.expression, module, index, visited);
      case 'Identifier':
        return this.resolveName(expression.value, expression.span.start, module, index, visited);
      case 'MemberExpression':
        if (expression.object.type !== 'Identifier' || expression.property.type !== 'Identifier') return null;
        return this.resolveStaticProperty(expression.object.value, expression.property.value, module, index, visited);
      default:
        return null;
    }
  }

  /**
   * Resolves a same-module binding or follows a named import from its use site.
   * The visited key is added before traversal so aliases and initializers cannot
   * recurse forever through a cycle.
   * @param name Identifier used by the expression or export binding.
   * @param position Reference position used for deterministic shadow selection.
   * @param module Indexed module containing the reference.
   * @param index Parsed modules available for relative imports.
   * @param visited Binding keys already followed in this chain.
   * @returns Resolved string, or null when no eligible binding exists.
   */
  private static resolveName(name: string, position: number, module: IndexedAstModule, index: AstModuleIndex, visited: Set<string>): string | null {
    const key = `${module.sourceFile}:name:${name}`;
    if (visited.has(key)) return null;
    visited.add(key);

    const binding = this.findConstant(module.constants.get(name), position);
    if (binding != null) return this.resolveExpression(binding.initializer, module, index, visited);

    const importBinding = module.imports.get(name);
    return importBinding == null ? null : this.resolveImport(importBinding, module, index, visited);
  }

  /**
   * Follows a named import only when its relative target is part of the index.
   * Package and alias specifiers stop at this boundary instead of guessing paths
   * outside the configured source roots.
   * @param binding Import metadata collected from the current module.
   * @param module Module containing the import declaration.
   * @param index Parsed modules available for relative imports.
   * @param visited Binding keys already followed in this chain.
   * @returns Resolved string, or null for unavailable targets/exports.
   */
  private static resolveImport(binding: AstImportBinding, module: IndexedAstModule, index: AstModuleIndex, visited: Set<string>): string | null {
    const targetPath = this.resolveImportPath(module.sourceFile, binding.source, index);
    const target = targetPath == null ? null : index.get(targetPath);
    return target == null ? null : this.resolveExport(target, binding.importedName, index, visited);
  }

  /**
   * Resolves a local export or traverses a relative re-export chain.
   * Export names are checked against indexed declarations, so aliases cannot
   * bypass the caller's declaration-name policy.
   * @param module Indexed module containing the requested export.
   * @param name Export name requested by an importer.
   * @param index Parsed modules available for relative re-exports.
   * @param visited Binding keys already followed in this chain.
   * @returns Resolved string, or null for missing/unsupported exports.
   */
  private static resolveExport(module: IndexedAstModule, name: string, index: AstModuleIndex, visited: Set<string>): string | null {
    const key = `${module.sourceFile}:export:${name}`;
    if (visited.has(key)) return null;
    visited.add(key);

    const binding = module.exports.get(name);
    if (binding == null) return null;
    if (binding.source != null && binding.importedName != null) {
      const targetPath = this.resolveImportPath(module.sourceFile, binding.source, index);
      const target = targetPath == null ? null : index.get(targetPath);
      return target == null ? null : this.resolveExport(target, binding.importedName, index, visited);
    }

    return binding.localName == null ? null : this.resolveName(binding.localName, Number.MAX_SAFE_INTEGER, module, index, visited);
  }

  /**
   * Resolves a local or imported static property and guards initializer cycles.
   * Imported classes are followed through named exports before their property
   * initializer is resolved in the owning module.
   * @param className Local class identifier used by the member expression.
   * @param propertyName Static property identifier used by the member expression.
   * @param module Indexed module containing the member expression.
   * @param index Parsed modules available for relative class imports.
   * @param visited Binding keys already followed in this chain.
   * @returns Resolved string, or null for unsupported class/property paths.
   */
  private static resolveStaticProperty(className: string, propertyName: string, module: IndexedAstModule, index: AstModuleIndex, visited: Set<string>): string | null {
    const key = `${className}.${propertyName}`;
    const binding = module.staticProperties.get(key);
    if (binding != null) {
      const visitedKey = `${module.sourceFile}:static:${key}`;
      if (visited.has(visitedKey)) return null;
      visited.add(visitedKey);
      return this.resolveExpression(binding.initializer, module, index, visited);
    }

    const importBinding = module.imports.get(className);
    if (importBinding == null) return null;
    const targetPath = this.resolveImportPath(module.sourceFile, importBinding.source, index);
    const target = targetPath == null ? null : index.get(targetPath);
    if (target == null) return null;

    const targetModule = this.resolveExportedModule(target, importBinding.importedName, index, visited);
    const importedProperty = targetModule == null
      ? null
      : [...targetModule.staticProperties.values()].find(property => property.propertyName === propertyName
        && (property.className === importBinding.importedName || property.className === className));
    if (importedProperty == null || targetModule == null) return null;

    const visitedKey = `${targetModule.sourceFile}:static:${importedProperty.className}.${propertyName}`;
    if (visited.has(visitedKey)) return null;
    visited.add(visitedKey);
    return this.resolveExpression(importedProperty.initializer, targetModule, index, visited);
  }

  /**
   * Follows class exports/re-exports until the owning static-property module is found.
   * Local imports and relative re-export chains share the same cycle guard as constants.
   * @param module Indexed module containing the requested class export.
   * @param name Export name requested by the importing module.
   * @param index Parsed modules available for relative re-exports.
   * @param visited Binding keys already followed in this chain.
   * @returns Module owning the class properties, or null when unavailable.
   */
  private static resolveExportedModule(module: IndexedAstModule, name: string, index: AstModuleIndex, visited: Set<string>): IndexedAstModule | null {
    const key = `${module.sourceFile}:class-export:${name}`;
    if (visited.has(key)) return null;
    visited.add(key);

    const binding = module.exports.get(name);
    if (binding == null) return null;
    if (binding.source != null && binding.importedName != null) {
      const targetPath = this.resolveImportPath(module.sourceFile, binding.source, index);
      const target = targetPath == null ? null : index.get(targetPath);
      return target == null ? null : this.resolveExportedModule(target, binding.importedName, index, visited);
    }

    if (binding.localName == null) return null;
    if ([...module.staticProperties.keys()].some(propertyKey => propertyKey.startsWith(`${binding.localName}.`))) return module;
    const localImport = module.imports.get(binding.localName);
    if (localImport == null) return module;
    const targetPath = this.resolveImportPath(module.sourceFile, localImport.source, index);
    const target = targetPath == null ? null : index.get(targetPath);
    return target == null ? null : this.resolveExportedModule(target, localImport.importedName, index, visited);
  }

  /**
   * Chooses the nearest preceding eligible binding, with a deterministic fallback.
   * Preceding declarations model source shadowing while the fallback keeps forward
   * references stable without executing the module.
   * @param bindings Eligible bindings sharing one source-level name.
   * @param position Reference position used to select the binding.
   * @returns Selected binding, or null when no candidates exist.
   */
  private static findConstant(bindings: AstConstantBinding[] | undefined, position: number): AstConstantBinding | null {
    if (bindings == null || bindings.length === 0) return null;
    const preceding = bindings.filter(binding => binding.position <= position);
    return [...(preceding.length > 0 ? preceding : bindings)].sort((left, right) => right.position - left.position)[0] ?? null;
  }

  /**
   * Resolves only relative module specifiers against indexed TypeScript files.
   * Extensionless imports try file and index-module forms; package and alias
   * fallbacks are intentionally outside this filesystem boundary.
   * @param sourceFile Absolute importing source path.
   * @param specifier Module specifier written by the importer.
   * @param index Parsed modules defining the allowed filesystem boundary.
   * @returns Indexed absolute target path, or null when unavailable.
   */
  private static resolveImportPath(sourceFile: string, specifier: string, index: AstModuleIndex): string | null {
    if (!specifier.startsWith('.')) return null;

    const base = resolve(dirname(sourceFile), specifier);
    const extension = extname(base);
    const candidates = extension === '.ts'
      ? [base, resolve(base, 'index.ts')]
      : [base, `${base}.ts`, resolve(base, 'index.ts')];
    return candidates.map(candidate => this.normalizeSourceFile(candidate)).find(candidate => index.has(candidate)) ?? null;
  }

  /**
   * Normalizes relative segments into the absolute key used by the module index.
   * @param sourceFile Source path collected by a scanner or derived from an import.
   * @returns Absolute normalized source path.
   */
  private static normalizeSourceFile(sourceFile: string): string {
    return resolve(sourceFile);
  }

  /**
   * Collects class declarations from a direct module item or export wrapper.
   * Nested classes remain outside this index boundary because properties resolve
   * through named module-level class declarations.
   * @param node Direct module item to inspect.
   * @returns Class declarations represented by the item.
   */
  private static findClassDeclarations(node: AstRecord): ClassDeclaration[] {
    if (node.type === 'ClassDeclaration') return [node as unknown as ClassDeclaration];
    if (node.type === 'ExportDeclaration' && (node.declaration as AstRecord | undefined)?.type === 'ClassDeclaration') {
      return [node.declaration as unknown as ClassDeclaration];
    }
    return [];
  }
}
