import type { LogType } from 'consola';

/**
 * Configures the Vite lifecycle that scans source roots and writes the event-map declaration.
 * The optional paths default to the resolved project root and the plugin's standard output;
 * `moduleSpecifier` identifies the event-bus module whose map is declaration-merged.
 */
export type EventMapGeneratorPluginConfig = {
  root?: string;
  outFile?: string;
  logType?: LogType;
  scanRoots?: string[];
  moduleSpecifier?: string;
  /** Enables the optional source-location JSON artifact; `true` uses its default path. */
  eventLocations?: boolean | EventMapLocationGeneratorConfig;
};

/** Configures the optional event source-location artifact written beside the declaration. */
export type EventMapLocationGeneratorConfig = {
  /** Output path relative to the plugin root; defaults to the standard location file. */
  outFile?: string;
};

/**
 * Carries one type symbol from scanner source ownership into declaration generation.
 * `sourceFile` lets the serializer rebase relative imports from the generated `.d.ts` location.
 */
export type EventMapTypeImport = {
  /** Local identifier used in the recovered payload type text. */
  name: string;
  /** Original module specifier from the scanned source file. */
  moduleSpecifier: string;
  /** Absolute source file that declared or imported the symbol. */
  sourceFile: string;
};

/**
 * Represents one syntax-derived event payload between scanning and serialization.
 * It records completeness separately so known publisher types can outrank uncertain
 * handler observations without losing the richest fallback shape or its imports.
 */
export type EventMapPayloadType = {
  text: string;
  /** Whether the scanner resolved every part of the payload without guessing. */
  isComplete: boolean;
  /** Type symbols referenced by `text` that must be emitted as type-only imports. */
  imports: EventMapTypeImport[];
};

/**
 * Records one event-key occurrence found by a decorator or publication call.
 * Candidates are grouped by the declaration utility, which merges their payload
 * evidence before producing the final `ApplicationEventMap` augmentation.
 */
export type EventMapScanCandidate = {
  /** Literal event key discovered in source. */
  name: string;
  /** Absolute source file containing this occurrence. */
  sourceFile: string;
  /** Signal that produced the key; publication candidates can carry payload evidence. */
  kind: 'decorator' | 'publish';
  /** Recovered payload, omitted only for legacy callers that provide names alone. */
  payload?: EventMapPayloadType;
  /** Source occurrences retained only when location collection is enabled. */
  locations?: EventMapSourceLocation[];
};

/** Identifies one event-key occurrence and its containing class declaration. */
export type EventMapSourceLocation = {
  /** Absolute source file path before location-artifact path normalization. */
  sourceFile: string;
  /** Zero-based source-string offset of the event-key literal. */
  offset: number;
  /** Containing class name, or `null` for a module-level publication. */
  className: string | null;
  /** Zero-based offset of the containing class identifier, or `null` without a class. */
  classOffset: number | null;
};

/** Options controlling the target module and path context for declaration serialization. */
export type EventMapDeclarationOptions = {
  /** Module whose `ApplicationEventMap` interface is augmented. */
  moduleSpecifier: string;
  /** Generated declaration path used to rebase source-relative type imports. */
  outFile?: string;
};

/**
 * Pure declaration output returned by the serializer before the Vite plugin writes it.
 * `names` gives lifecycle logging and tests a structured view without reparsing the source text.
 */
export type EventMapDeclarationArtifact = {
  /** Complete TypeScript module-augmentation source. */
  declaration: string;
  /** Sorted event keys emitted into the augmentation. */
  names: string[];
};

/** Groups published and listened-on source locations for each discovered event key. */
export type EventMapLocationEntry = {
  /** Event key shared by every location in this entry. */
  key: string;
  /** Publication call locations, sorted by source path and offset. */
  published: EventMapSourceLocation[];
  /** `@OnEvent` decorator locations, sorted by source path and offset. */
  listened: EventMapSourceLocation[];
};

/** JSON document consumed by tooling that navigates from an event key to source. */
export type EventMapLocationArtifact = {
  /** Deterministically sorted event entries. */
  events: EventMapLocationEntry[];
};

/** Root context used to convert scanner-owned absolute paths into artifact paths. */
export type EventMapLocationGenerationOptions = {
  /** Package root used as the base for relative source paths. */
  root: string;
};

/** Optional scanner behavior that avoids location work for declaration-only generation. */
export type EventMapScanOptions = {
  /** Collect event and class offsets for a location artifact. Defaults to `false`. */
  includeLocations?: boolean;
};
