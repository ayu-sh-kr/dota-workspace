
import type {Expression, Module} from '@swc/core';

/**
 * Holds one parsed source module before syntax-only AST consumers resolve references.
 * Keeping the source text beside the AST lets callers combine traversal and source offsets
 * without rereading or executing the module.
 */
export type ParsedAstModule = {
  /** Absolute source path used as the stable module-index key. */
  sourceFile: string;
  /** Original source text retained for source-aware AST policies. */
  sourceText: string;
  /** SWC module AST shared by declaration indexing and expression resolution. */
  ast: Module;
};

/** Describes a top-level const initializer eligible for syntax-only reference resolution. */
export type AstConstantBinding = {
  /** Original declaration name used by same-module and export lookup. */
  name: string;
  /** Expression recursively inspected for an explicit string literal. */
  initializer: Expression;
  /** SWC byte position used to choose the nearest preceding binding. */
  position: number;
};

/** Describes a static class property eligible for syntax-only reference resolution. */
export type AstStaticPropertyBinding = {
  /** Owning class name used by non-computed member expressions. */
  className: string;
  /** Property name used to identify the named value. */
  propertyName: string;
  /** Expression recursively inspected for an explicit string literal. */
  initializer: Expression;
};

/** Records a named import whose source declaration can be followed in an indexed module set. */
export type AstImportBinding = {
  /** Local identifier visible at the reference site. */
  localName: string;
  /** Exported identifier requested from the imported module. */
  importedName: string;
  /** Module specifier written by the importing source. */
  source: string;
};

/** Records a local export or relative re-export that can be followed without a checker. */
export type AstExportBinding = {
  /** Name visible to importers of the containing module. */
  exportedName: string;
  /** Local declaration or imported alias behind a same-module export. */
  localName?: string;
  /** Name requested from another module for a relative re-export. */
  importedName?: string;
  /** Relative module specifier for a re-export, when present. */
  source?: string;
};

/** Associates a direct variable declaration with whether an export wrapper owns it. */
export type AstVariableDeclarationCandidate = {
  /** Variable declaration node containing one or more declarators. */
  declaration: Record<string, unknown> & {type: string};
  /** Whether the declaration appeared inside an `export` wrapper. */
  exported: boolean;
};

/** Enriched parsed module metadata used internally by the AST module resolver. */
export type IndexedAstModule = ParsedAstModule & {
  /** Eligible top-level constants keyed by original declaration name. */
  constants: Map<string, AstConstantBinding[]>;
  /** Eligible static properties keyed by `ClassName.propertyName`. */
  staticProperties: Map<string, AstStaticPropertyBinding>;
  /** Named imports keyed by local identifier. */
  imports: Map<string, AstImportBinding>;
  /** Local exports and relative re-exports keyed by public name. */
  exports: Map<string, AstExportBinding>;
};

/** Maps normalized absolute source paths to the parsed declarations available to a resolver. */
export type AstModuleIndex = Map<string, IndexedAstModule>;

/** Configures which declaration/property names enter an AST module index. */
export type AstModuleIndexOptions = {
  /** Optional naming policy; omitted means every direct identifier const/static property is eligible. */
  isDeclarationNameEligible?: (name: string) => boolean;
};
