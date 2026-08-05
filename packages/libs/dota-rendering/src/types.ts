/** Sentinel that renders no output instead of the string representation of a symbol. */
export const nothing = Symbol('dota-rendering.nothing');

/**
 * Output accepted by the component render boundary.
 * Strings preserve legacy whole-root rendering, `TemplateResult` enables part updates,
 * and `nothing` clears the owned boundary.
 */
export type RenderOutput = string | TemplateResult | typeof nothing;

/**
 * Carries one structured HTML template from `html()` to the DOM renderer.
 * Static strings define reusable structure; values become text parts or serialized quoted
 * attributes, while Dota Core owns typed property and attribute-change behavior.
 */
export interface TemplateResult {
  /** Identifies this value as a Dota structured template. */
  readonly kind: 'dota-template';
  /** Static template segments whose order defines the dynamic part indexes. */
  readonly strings: TemplateStringsArray;
  /** Values paired with string gaps and interpreted by their parsed HTML position. */
  readonly values: readonly unknown[];
}

/** Explicitly trusted markup that the template processor may merge into static HTML. */
export interface UnsafeHtmlValue {
  /** Distinguishes trusted markup from ordinary strings, which always render as text. */
  readonly kind: 'dota-unsafe-html';
  /** Markup supplied by a trusted application-owned source. */
  readonly value: string;
}

/** Caller-approved markup rendered inside one dynamic child range. */
export interface TrustedHtmlValue {
  /** Selects local trusted-markup handling instead of escaped text rendering. */
  readonly kind: 'dota-trusted-html';
  /** Markup parsed within the interpolation's boundaries when its value changes. */
  readonly value: string;
}

/** A stable identity accepted by keyed child ranges. */
export type RenderKey = string | number | symbol;

/** One keyed template whose DOM identity is retained while its key remains present. */
export interface KeyedTemplate {
  /** Identity used to retain and reorder this template's mounted range. */
  readonly key: RenderKey;
  /** Structured output rendered inside the key's private range. */
  readonly value: TemplateResult;
}

/** A dynamic list whose entries are reconciled by key instead of array position. */
export interface KeyedValue {
  /** Identifies the value as a keyed child-range directive. */
  readonly kind: 'dota-keyed';
  /** Ordered keyed templates for the current render. */
  readonly entries: readonly KeyedTemplate[];
}

/** A conditional branch rendered inside a local range without replacing its parent. */
export interface ConditionalValue {
  /** Identifies the value as a conditional child-range directive. */
  readonly kind: 'dota-conditional';
  /** Selected structured branch, or `nothing` when the range should be empty. */
  readonly value: TemplateResult | typeof nothing;
}

/** Describes one dynamic value that changed between two compatible templates. */
export type PartChange = {
  /** Dynamic value position used to locate the renderer's in-memory part. */
  readonly index: number;
  /** Value from the previously committed render. */
  readonly previousValue: unknown;
  /** Value supplied by the next render. */
  readonly nextValue: unknown;
};

/** Reports whether a render mounts, does nothing, patches parts, or replaces structure. */
export type RenderDiff = {
  /** Commit strategy selected by comparing the previous and next outputs. */
  readonly kind: 'mount' | 'noop' | 'patch' | 'replace';
  /** Changed dynamic values; empty for mounts, no-ops, and structural replacements. */
  readonly changedParts: readonly PartChange[];
};

/** Commit kinds shared by diff results and DOM commit results. */
export type CommitKind = RenderDiff['kind'];

/** Summarizes the DOM work performed by a renderer instance update. */
export interface CommitResult {
  /** Strategy that produced this commit. */
  readonly kind: CommitKind;
  /** Number of dynamic parts written during a patch. */
  readonly changedParts: number;
  /** Number of root-level node boundaries replaced by the commit. */
  readonly replacedNodes: number;
}

/** Stateful handle connecting one render root to its committed output and patch policy. */
export interface RenderInstance {
  /** Most recent output used as the baseline for the next comparison. */
  readonly output: RenderOutput;
  /** Compares and commits a new output against the instance baseline. */
  update(output: RenderOutput): CommitResult;
  /** Releases nested range instances without clearing committed DOM. */
  dispose(): void;
}
