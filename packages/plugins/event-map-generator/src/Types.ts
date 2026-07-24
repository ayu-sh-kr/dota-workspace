import type { LogType } from 'consola';
import type { AstModuleResolutionOptions, AstResolutionReason, AstResolutionTraceStep } from '@ayu-sh-kr/dota-ast-utils';

/** Resolver settings exposed by the event generator while remaining Vite-independent. */
export type EventMapResolverOptions = AstModuleResolutionOptions;

/** Explains one event expression that the syntax-only resolver could not prove. */
export type EventMapResolutionDiagnostic = {
  /** Absolute file containing the decorator or publication expression. */
  sourceFile: string;
  /** SWC expression kind that failed to resolve. */
  expressionType: string;
  /** Generic resolver reason used to classify the safe skip. */
  reason: AstResolutionReason;
  /** Optional import/binding path useful when debug logging is enabled. */
  trace: AstResolutionTraceStep[];
};

/**
 * Configures the Vite lifecycle that scans source roots and writes the event-map declaration.
 * The optional paths default to the resolved project root and the plugin's standard output;
 * `moduleSpecifier` identifies the event-bus module whose map is declaration-merged.
 */
export type EventMapGeneratorPluginConfig = {
  /** Package root used to resolve scan roots and generated output paths; Vite's resolved root is used when omitted. */
  root?: string;
  /** Declaration file destination relative to `root`; defaults to `src/event-map.d.ts`. */
  outFile?: string;
  /** Consola verbosity used by generation logs; defaults to `info`. */
  logType?: LogType;
  /** Source roots scanned for event candidates, resolved relative to `root`; defaults to `[root]`. */
  scanRoots?: string[];
  /** Module whose `ApplicationEventMap` interface receives the generated declaration augmentation. */
  moduleSpecifier?: string;
  /** Enables source-location JSON output; `true` uses the default path and an object selects a custom destination. */
  eventLocations?: boolean | EventMapLocationGeneratorConfig;
  /** Optional normalized resolver settings used by direct scans and merged with Vite aliases. */
  resolver?: EventMapResolverOptions;
};

/** Configures the optional event source-location artifact written alongside the declaration. */
export type EventMapLocationGeneratorConfig = {
  /** JSON destination relative to the plugin root; defaults to `src/event-map.locations.json`. */
  outFile?: string;
};

/**
 * Carries one type symbol from scanner source ownership into declaration generation.
 * `sourceFile` lets the serializer rebase relative imports from the generated `.d.ts` location.
 */
export type EventMapTypeImport = {
  /** Local identifier referenced by the recovered payload text and emitted in a type-only import. */
  name: string;
  /** Module specifier from the scanned source, retained so declaration generation can preserve its ownership. */
  moduleSpecifier: string;
  /** Absolute owner file used to rebase relative `moduleSpecifier` values from the generated declaration. */
  sourceFile: string;
};

/**
 * Represents one syntax-derived event payload between scanning and serialization.
 * It records completeness separately so known publisher types can outrank the
 * incomplete decorator fallback without losing the richest fallback shape or its imports.
 */
export type EventMapPayloadType = {
  /** TypeScript text emitted for the event's `data` field, such as `null`, `unknown`, or an author-written type. */
  text: string;
  /** Whether `text` is fully established by syntax; complete payloads take precedence when candidates are merged. */
  isComplete: boolean;
  /** Imported symbols referenced by `text`; the serializer deduplicates and rebases them for the output file. */
  imports: EventMapTypeImport[];
};

/**
 * Records one event-key occurrence found by a decorator or publication call.
 * Candidates are grouped by the declaration utility, which merges their payload
 * evidence before producing the final `ApplicationEventMap` augmentation.
 */
export type EventMapScanCandidate = {
  /** Literal event key used to group publisher and listener evidence into one map entry. */
  name: string;
  /** Absolute source file containing the occurrence, or scan root for registry-owned events. */
  sourceFile: string;
  /** Discovery signal: `publish` covers publication calls, while `decorator` covers `@OnEvent` listeners. */
  kind: 'decorator' | 'publish';
  /** Syntax-recovered payload evidence; omitted candidates are rendered as an incomplete `unknown` fallback. */
  payload?: EventMapPayloadType;
  /** Repeated source occurrences retained when location collection is enabled; absent when scanning declarations only. */
  locations?: EventMapSourceLocation[];
};

/** Identifies one event-key occurrence and its containing class declaration. */
export type EventMapSourceLocation = {
  /** Absolute source file path before the location artifact converts it to a root-relative path. */
  sourceFile: string;
  /** Zero-based JavaScript string offset of the event-key literal for editor navigation. */
  offset: number;
  /** Innermost containing class name, or `null` when the event is published at module scope. */
  className: string | null;
  /** Zero-based offset of the containing class identifier, or `null` when no class owns the occurrence. */
  classOffset: number | null;
};

/** Options controlling the target module and path context for declaration serialization. */
export type EventMapDeclarationOptions = {
  /** Module whose `ApplicationEventMap` interface is augmented by the generated source. */
  moduleSpecifier: string;
  /** Generated declaration path used to rebase relative payload imports; omitted to retain source specifiers. */
  outFile?: string;
};

/**
 * Pure declaration output returned by the serializer before the Vite plugin writes it.
 * `names` gives lifecycle logging and tests a structured view without reparsing the source text.
 */
export type EventMapDeclarationArtifact = {
  /** Complete TypeScript module-augmentation source ready to write as the declaration file. */
  declaration: string;
  /** Sorted event keys emitted into the augmentation, also used for generation logging and assertions. */
  names: string[];
};

/** Groups published and listened-on source locations for each discovered event key. */
export type EventMapLocationEntry = {
  /** Event key that links every publication and listener location in this entry. */
  key: string;
  /** Locations of `publish`, `publishAsync`, or `emit` calls, sorted for stable generated JSON. */
  published: EventMapSourceLocation[];
  /** Locations of `@OnEvent` decorators, sorted for stable generated JSON. */
  listened: EventMapSourceLocation[];
};

/** JSON document consumed by tooling that navigates from an event key to source. */
export type EventMapLocationArtifact = {
  /** One entry per discovered key, sorted by key so repeated generation is deterministic. */
  events: EventMapLocationEntry[];
};

/** Root context used to convert scanner-owned absolute paths into artifact paths. */
export type EventMapLocationGenerationOptions = {
  /** Package root used to turn absolute scanner paths into portable root-relative JSON paths. */
  root: string;
};

/** Optional scanner behavior that avoids location work for declaration-only generation. */
export type EventMapScanOptions = {
  /** Collect event and class offsets for `EventMapLocationArtifact`; defaults to `false` for declaration-only scans. */
  includeLocations?: boolean;
  /** Alias, extension, and safety settings forwarded to `AstModuleResolver`. */
  resolver?: EventMapResolverOptions;
  /** Receives unresolved event expressions without changing the scanner's safe skip behavior. */
  onResolutionFailure?: (diagnostic: EventMapResolutionDiagnostic) => void;
};
