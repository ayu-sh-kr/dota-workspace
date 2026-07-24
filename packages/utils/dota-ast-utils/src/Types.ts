
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
  /** SWC syntax context used to reject references shadowed by a nearer binding. */
  context?: number;
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
  /** Import shape used to distinguish named, default, and namespace members. */
  kind: 'named' | 'default' | 'namespace';
  /** SWC syntax context used to identify the binding at a reference site. */
  context?: number;
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
  /** Export shape used when resolving namespace and default members. */
  kind?: 'named' | 'default' | 'namespace';
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
  /** `export * from` sources traversed when a direct export is absent. */
  wildcardExports: string[];
};

/** Maps normalized absolute source paths to the parsed declarations available to a resolver. */
export type AstModuleIndex = Map<string, IndexedAstModule>;

/** Maps a source-level module prefix to an indexed filesystem location. */
export type AstPathAlias = {
  /** Import prefix or wildcard pattern matched against a module specifier. */
  find: string;
  /** Absolute or caller-normalized directory/file replacement path. */
  replacement: string;
  /** Exact aliases match one specifier; prefix and wildcard aliases preserve the suffix. */
  kind: 'exact' | 'prefix' | 'wildcard';
};

/** Controls the filesystem and safety boundary used by syntax-only module resolution. */
export type AstModuleResolutionOptions = {
  /** Vite-independent aliases already normalized by the caller. */
  aliases?: AstPathAlias[];
  /** Source extensions probed after an extensionless import; defaults to `.ts`. */
  extensions?: string[];
  /** Maximum binding/export traversal depth before the resolver returns a guarded failure. */
  maxDepth?: number;
  /** Maximum string length accepted from a static expression. */
  maxValueLength?: number;
};

/** Explains why syntax-only resolution did or did not produce an explicit string. */
export type AstResolutionReason =
  | 'resolved'
  | 'unsupported-expression'
  | 'dynamic-expression'
  | 'binding-not-found'
  | 'binding-shadowed'
  | 'module-specifier-unmapped'
  | 'module-not-found'
  | 'module-not-indexed'
  | 'export-not-found'
  | 'ambiguous-module'
  | 'cycle'
  | 'resolution-limit';

/** Records one traversed declaration or module edge for optional diagnostics. */
export type AstResolutionTraceStep = {
  /** Human-readable edge kind such as `import`, `export`, `binding`, or `expression`. */
  kind: string;
  /** Short stable description of the edge or expression branch. */
  detail: string;
  /** Source module associated with the step when one is known. */
  sourceFile?: string;
};

/** Carries a proven string, a safe null result, and enough context to explain the decision. */
export type AstResolutionResult = {
  /** Statically proven string, including an explicitly proven empty string, or `null`. */
  value: string | null;
  /** Stable reason code for the result; `resolved` is used whenever `value` is non-null. */
  reason: AstResolutionReason;
  /** Traversal steps collected when the caller requests explainable resolution. */
  trace: AstResolutionTraceStep[];
};

/** Configures which declaration/property names enter an AST module index. */
export type AstModuleIndexOptions = {
  /** Optional naming policy; omitted means every direct identifier const/static property is eligible. */
  isDeclarationNameEligible?: (name: string) => boolean;
};
