import {
  ConditionalValue,
  KeyedValue,
  RenderKey,
  TemplateResult,
  TrustedHtmlValue,
  UnsafeHtmlValue,
  nothing
} from './types';

const VALUE_MARKER_PREFIX = 'dota-value-';

/** Describes an ordinary interpolation retained as a runtime value. */
type DynamicValueShape = {
  /** Identifies a value that contributes one flattened value entry. */
  kind: 'value';
};

/** Describes a nested template and its interpolation structure. */
type NestedTemplateShape = {
  /** Identifies a nested {@link TemplateResult}. */
  kind: 'template';
  /** Static segments from the nested tagged-template call site. */
  strings: TemplateStringsArray;
  /** Structural descriptions of the nested interpolations. */
  shapes: FlattenShape[];
};

/** Describes an array containing nested templates or trusted markup. */
type NestedArrayShape = {
  /** Identifies an array that requires recursive flattening. */
  kind: 'array';
  /** Structural descriptions of the array items in source order. */
  shapes: FlattenShape[];
};

/** Describes trusted markup merged into the template's static HTML. */
type UnsafeHtmlShape = {
  /** Identifies markup created with {@link unsafeHTML}. */
  kind: 'unsafe-html';
  /** Exact markup used when the flattening plan was created. */
  value: string;
};

/** Records how one outer interpolation expands during flattening. */
type FlattenShape = DynamicValueShape | NestedTemplateShape | NestedArrayShape | UnsafeHtmlShape;

/** Caches the flattened structure for one tagged-template call site. */
type TemplateFlattenPlan = {
  /** Combined static segments emitted after nested templates are flattened. */
  strings: TemplateStringsArray;
  /** Structural descriptions corresponding to the outer interpolations. */
  shapes: FlattenShape[];
};

/** Mutable output accumulated while recursively flattening a template. */
type FlattenedTemplate = {
  /** Combined static segments produced so far. */
  strings: string[];
  /** Dynamic values retained for renderer comparison and patching. */
  values: unknown[];
};

const FLATTEN_PLANS_BY_CALL_SITE = new WeakMap<TemplateStringsArray, TemplateFlattenPlan>();

/** Matches temporary interpolation tokens before they become DOM part records. */
export const valueMarkerPattern = /dota-value-(\d+)/g;

/**
 * Creates the immutable template description consumed by the renderer.
 *
 * Nested templates, trusted markup, and arrays containing either are flattened
 * into one string/value sequence. The renderer therefore receives a single
 * interpolation index space while ordinary arrays remain dynamic values for
 * keyed range handling. Compatible call-site shapes reuse their flattened
 * static strings to avoid repeating structural work on subsequent renders.
 *
 * @param strings Static segments supplied by the tagged-template call.
 * @param values Values inserted between the static segments.
 * @returns The normalized result that can be mounted, diffed, or patched.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult {
  if (!values.some(requiresStructuralFlattening)) return {kind: 'dota-template', strings, values};

  const cachedPlan = FLATTEN_PLANS_BY_CALL_SITE.get(strings);
  if (cachedPlan) {
    const flattenedValues: unknown[] = [];
    const matches = cachedPlan.shapes.length === values.length &&
      values.every((value, index) => collectFlattenedValues(value, cachedPlan.shapes[index], flattenedValues));
    if (matches) return {kind: 'dota-template', strings: cachedPlan.strings, values: flattenedValues};
  }

  const flattened: FlattenedTemplate = {strings: [strings[0]], values: []};
  const shapes: FlattenShape[] = [];
  for (let index = 0; index < values.length; index += 1) {
    shapes.push(appendFlattenedValue(values[index], flattened));
    flattened.strings[flattened.strings.length - 1] += strings[index + 1];
  }

  const flattenedStrings = flattened.strings as unknown as TemplateStringsArray;
  Object.defineProperty(flattenedStrings, 'raw', {value: [...flattened.strings]});
  FLATTEN_PLANS_BY_CALL_SITE.set(strings, {strings: flattenedStrings, shapes});
  return {kind: 'dota-template', strings: flattenedStrings, values: flattened.values};
}

/**
 * Appends one interpolation to a flattened template and records its structure.
 *
 * Nested templates and trusted markup contribute static HTML directly to the
 * parent. Ordinary values create dynamic slots. Arrays expand only when one of
 * their items requires structural flattening, preserving renderer-level array
 * semantics for lists made solely from ordinary values.
 *
 * @param value Interpolation currently being normalized.
 * @param flattened Mutable strings and dynamic values accumulated for the result.
 * @returns The shape used to validate reuse of the call site's flattening plan.
 */
function appendFlattenedValue(value: unknown, flattened: FlattenedTemplate): FlattenShape {
  if (isTemplateResult(value)) {
    flattened.strings[flattened.strings.length - 1] += value.strings[0];
    const shapes: FlattenShape[] = [];
    for (let index = 0; index < value.values.length; index += 1) {
      shapes.push(appendFlattenedValue(value.values[index], flattened));
      flattened.strings[flattened.strings.length - 1] += value.strings[index + 1];
    }
    return {kind: 'template', strings: value.strings, shapes};
  }

  if (isUnsafeHtmlValue(value)) {
    flattened.strings[flattened.strings.length - 1] += value.value;
    return {kind: 'unsafe-html', value: value.value};
  }

  if (Array.isArray(value) && value.some(requiresStructuralFlattening)) {
    return {kind: 'array', shapes: value.map((item) => appendFlattenedValue(item, flattened))};
  }

  flattened.values.push(value);
  flattened.strings.push('');
  return {kind: 'value'};
}

/**
 * Replays a cached shape against current values and collects dynamic leaves.
 *
 * A false result indicates that nested template identity, array structure, or
 * trusted markup changed. The caller then rebuilds the call site's plan instead
 * of applying incompatible cached static strings.
 *
 * @param value Current interpolation being checked.
 * @param shape Cached structural description expected for the interpolation.
 * @param flattenedValues Destination for ordinary dynamic values encountered.
 * @returns Whether the current value remains compatible with the cached shape.
 */
function collectFlattenedValues(value: unknown, shape: FlattenShape, flattenedValues: unknown[]): boolean {
  if (shape.kind === 'value') {
    if (requiresStructuralFlattening(value)) return false;
    flattenedValues.push(value);
    return true;
  }
  if (shape.kind === 'unsafe-html') return isUnsafeHtmlValue(value) && value.value === shape.value;
  if (shape.kind === 'array') {
    return Array.isArray(value) && value.length === shape.shapes.length &&
      value.every((item, index) => collectFlattenedValues(item, shape.shapes[index], flattenedValues));
  }
  return isTemplateResult(value) && value.strings === shape.strings && value.values.length === shape.shapes.length &&
    value.values.every((item, index) => collectFlattenedValues(item, shape.shapes[index], flattenedValues));
}

/**
 * Marks application-owned markup as trusted for structural template composition.
 *
 * The value is merged into static template HTML and later reaches a browser
 * `innerHTML` sink. This function does not sanitize, escape, or create a Trusted
 * Types value. Callers must provide application-authored or sanitized markup and
 * must never pass untrusted user input directly.
 *
 * @param value HTML or SVG source that the caller has established is safe to parse.
 * @returns A directive recognized only while the `html` tag flattens nested content.
 */
export function unsafeHTML(value: string): UnsafeHtmlValue {
  return {kind: 'dota-unsafe-html', value};
}

/**
 * Creates a dynamic HTML range without making the parent template structural.
 * The caller must provide sanitized or otherwise trusted markup; this directive
 * deliberately does not sanitize and writes through the browser HTML parser.
 * @param value Trusted markup owned by the interpolation's local child range.
 * @returns A directive patched independently from surrounding component nodes.
 */
export function trustedHTML(value: string): TrustedHtmlValue {
  return {kind: 'dota-trusted-html', value};
}

/**
 * Creates a list directive that retains each rendered range by application identity.
 *
 * Keys must be unique within one list; retained keys can move without recreating DOM.
 * Duplicate keys are rejected by the renderer before it mutates the current range.
 *
 * @param items Application items in their desired DOM order.
 * @param getKey Returns the stable identity for one item.
 * @param renderItem Produces the structured template owned by that identity.
 * @returns A child value reconciled by key by the renderer.
 */
export function keyed<Item>(
  items: readonly Item[],
  getKey: (item: Item, index: number) => RenderKey,
  renderItem: (item: Item, index: number) => TemplateResult
): KeyedValue {
  return {
    kind: 'dota-keyed',
    entries: items.map((item, index) => ({key: getKey(item, index), value: renderItem(item, index)}))
  };
}

/**
 * Selects one structured branch while keeping replacement local to its child range.
 *
 * @param condition Determines which branch is selected.
 * @param truthy Structured output used when the condition is true.
 * @param falsy Structured output used when false, or `nothing` by default.
 * @returns A conditional child-range directive.
 */
export function when(
  condition: unknown,
  truthy: TemplateResult,
  falsy: TemplateResult | typeof nothing = nothing
): ConditionalValue {
  return {kind: 'dota-conditional', value: condition ? truthy : falsy};
}

/**
 * Reports whether an interpolation changes its parent template's static structure.
 *
 * @param value Interpolation being inspected.
 * @returns Whether nested templates, structural unsafe markup, or nested arrays must be flattened.
 */
function requiresStructuralFlattening(value: unknown): boolean {
  return isTemplateResult(value) || isUnsafeHtmlValue(value) ||
    (Array.isArray(value) && value.some(requiresStructuralFlattening));
}

/**
 * Narrows an interpolation to the trusted-markup directive.
 *
 * @param value Candidate interpolation value.
 * @returns Whether the value was created with {@link unsafeHTML}.
 */
function isUnsafeHtmlValue(value: unknown): value is UnsafeHtmlValue {
  return typeof value === 'object' && value !== null &&
    (value as UnsafeHtmlValue).kind === 'dota-unsafe-html';
}

/**
 * Determines whether the next interpolation is syntactically inside an element attribute.
 * The renderer now discovers this from parsed DOM attributes, but this predicate remains
 * available to consumers that need to inspect template source before browser parsing.
 * @param source Static template content immediately before the interpolation.
 * @returns Whether the interpolation is positioned after an attribute equals sign.
 */
export function isAttributePosition(source: string): boolean {
  const lastOpen = source.lastIndexOf('<');
  const lastClose = source.lastIndexOf('>');
  return lastOpen > lastClose && /=[\s]*["']?$/.test(source);
}

/**
 * Produces the temporary token used while the browser parses a template.
 * The token is removed before the render is committed and never becomes part
 * of the public DOM contract; durable node markers are assigned by the renderer.
 * @param index Dynamic value position in the template result.
 * @returns The temporary token associated with that value.
 */
export function valueMarkerFor(index: number): string {
  return `${VALUE_MARKER_PREFIX}${index}`;
}

/**
 * Converts a child value to text while preserving the explicit empty sentinel.
 * Nullish values and `nothing` render no text; other falsy values remain visible
 * because `0`, `false`, and the empty string are valid render values.
 * @param value Dynamic child value from a template result.
 * @returns The text representation written to the part's text node.
 */
export function valueText(value: unknown): string {
  return value === nothing || value === null || value === undefined ? '' : String(value);
}

/**
 * Identifies structured render results before the renderer selects a strategy.
 *
 * The kind check keeps legacy strings and the explicit `nothing` sentinel on
 * their own rendering paths without requiring a class instance. This is a
 * lightweight discriminator check and does not deeply validate strings or values.
 *
 * @param value Candidate render output.
 * @returns Whether the value carries the template-result discriminator.
 */
export function isTemplateResult(value: unknown): value is TemplateResult {
  return typeof value === 'object' && value !== null && (value as TemplateResult).kind === 'dota-template';
}

/**
 * Identifies markup intended for a dynamic trusted child range.
 * @param value Candidate dynamic interpolation value.
 * @returns Whether the value was created by {@link trustedHTML}.
 */
export function isTrustedHtmlValue(value: unknown): value is TrustedHtmlValue {
  return typeof value === 'object' && value !== null &&
    (value as TrustedHtmlValue).kind === 'dota-trusted-html';
}

/**
 * Identifies a keyed child-range directive during DOM part application.
 *
 * @param value Candidate dynamic value.
 * @returns Whether the value carries the keyed-directive discriminator.
 */
export function isKeyedValue(value: unknown): value is KeyedValue {
  return typeof value === 'object' && value !== null && (value as KeyedValue).kind === 'dota-keyed';
}

/**
 * Identifies a conditional child-range directive during DOM part application.
 *
 * @param value Candidate dynamic value.
 * @returns Whether the value carries the conditional-directive discriminator.
 */
export function isConditionalValue(value: unknown): value is ConditionalValue {
  return typeof value === 'object' && value !== null && (value as ConditionalValue).kind === 'dota-conditional';
}
