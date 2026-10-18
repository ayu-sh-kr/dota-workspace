import {COMPONENT_ATTRIBUTE, COMPONENT_END_MARKER, COMPONENT_START_MARKER, DYNAMIC_ATTRIBUTE, NODE_INDEX_ATTRIBUTE} from '@ayu-sh-kr/dota-rendering';
import {
  FOREIGN_ROOT_ELEMENTS,
  RAW_TEXT_ELEMENTS,
  RCDATA_ELEMENTS,
  TABLE_BODY_ELEMENT,
  TABLE_ELEMENT,
  TABLE_ROW_ELEMENT,
  TEMPLATE_ELEMENT,
  VOID_ELEMENTS
} from './html-elements';
import {tokenizeHtml, type CommentToken, type EndTagToken, type StartTagToken, type TextToken} from './html-tokenizer';


/** Static markup emitted for every render. */
type StaticOp = {
  readonly kind: 'static';
  html: string;
};

/** Emitted only when hydration markers are requested. */
type HydrationOnlyOp = {
  readonly kind: 'hydration-only';
  html: string;
};

/** Interpolation between elements: text, a directive, or trusted markup. */
type ChildOp = {
  readonly kind: 'child';
  readonly index: number;
};

/**
 * Interpolation where durable markers cannot survive a parse: comments, raw-text and
 * RCDATA elements, and inert `<template>` content. The value is written as plain text,
 * so a component with one fails hydration and is remounted by the client.
 */
type UnboundTextOp = {
  readonly kind: 'unbound-text';
  readonly index: number;
  /** In `<script>`/`<style>`-like raw text, where entities are not decoded. */
  readonly inRawText: boolean;
};

/** Quoted attribute whose value contains one or more interpolations. */
type AttributeOp = {
  readonly kind: 'attribute';
  readonly name: string;
  /** Static value text, safe inside double quotes, alternating with interpolation indexes. */
  readonly segments: ReadonlyArray<string | number>;
};

/** Durable `data-dh-a` tokens for the attribute parts on one element. */
type AttributeMarkersOp = {
  readonly kind: 'attribute-markers';
  readonly indexes: readonly number[];
};

/** One step of serializing a template; see {@link planTemplate}. */
export type PlanOp = StaticOp | HydrationOnlyOp | ChildOp | UnboundTextOp | AttributeOp | AttributeMarkersOp;

/** An element still open while the planner walks a template. */
type OpenElement = {
  readonly name: string;
  /** Hydration attributes of the start tag, extended when a child part appears inside. */
  readonly markers?: HydrationOnlyOp;
  hasDynamicFlag: boolean;
  /** An implied `<tbody>`, which the planner writes and closes itself. */
  readonly insertedByParser: boolean;
};

const PLACEHOLDER = /(\d+)/g;
const PLANS = new WeakMap<TemplateStringsArray, readonly PlanOp[]>();

/**
 * Compiles one template's static strings into serialization steps, once per call site.
 * The strings are joined with private placeholders and tokenized. Each placeholder
 * becomes a child, attribute, or text step depending on where the HTML parser puts
 * it, and each element receives the document-order index the client renderer assigns
 * when it parses the same template, so server markers line up with client parts.
 * @param strings Static segments of a flattened `html` template.
 * @returns Steps shared by every render of the template; never mutate them.
 * @throws Error when an interpolation is an unquoted attribute value, an attribute name, or a tag name.
 */
export function planTemplate(strings: TemplateStringsArray): readonly PlanOp[] {
  const cached = PLANS.get(strings);
  if (cached) return cached;

  const source = strings.reduce((joined, segment, index) => index === 0 ? segment : `${joined}${index - 1}${segment}`, '');
  const planner = new TemplatePlanner(source);
  for (const token of tokenizeHtml(source)) {
    if (token.kind === 'start-tag') planner.startTag(token);
    else if (token.kind === 'end-tag') planner.endTag(token);
    else if (token.kind === 'text') planner.text(token);
    else planner.comment(token);
  }
  const plan = planner.finish();
  PLANS.set(strings, plan);
  return plan;
}

/**
 * Walks one template's tokens and builds its plan, tracking just enough of the open
 * element stack to reproduce the client's element indexes and part ownership.
 */
class TemplatePlanner {
  private readonly ops: PlanOp[] = [{kind: 'hydration-only', html: COMPONENT_START_MARKER}];
  private readonly open: OpenElement[] = [];
  private elementCount = 0;
  /** Depth inside `<template>` content, which the client's element query does not enter. */
  private inertDepth = 0;
  /** Depth inside SVG or MathML, where `/>` closes elements and raw-text rules stop. */
  private foreignDepth = 0;

  constructor(private readonly source: string) {}

  /**
   * Plans a start tag: static attributes are copied, interpolated ones become attribute
   * steps, and counted elements get their index and component markers.
   * An author's `<tr>` directly inside `<table>` gets the `<tbody>` the parser would insert,
   * because the client counts that element too.
   * @param token Start tag from the joined template source.
   * @throws Error when an interpolation forms the tag name, an attribute name, or an unquoted value.
   */
  startTag(token: StartTagToken): void {
    if (hasPlaceholder(token.name)) throw new Error('Dynamic tag names are not supported for server rendering');
    // A <tr> directly in <table>: write the <tbody> the browser would insert, so indexes match.
    if (token.name === TABLE_ROW_ELEMENT && this.open.at(-1)?.name === TABLE_ELEMENT && this.foreignDepth === 0) this.openImpliedTbody();

    // Elements inside <template> content are not indexed by the client, so they get no markers.
    const counted = this.inertDepth === 0;
    // "<name", with the author's original casing.
    this.pushStatic(`<${this.source.slice(token.start + 1, token.start + 1 + token.name.length)}`);
    const partIndexes: number[] = [];
    for (const attribute of token.attributes) {
      if (hasPlaceholder(attribute.name)) throw new Error('Dynamic attribute names are not supported for server rendering');
      // Static attribute: copied exactly as written.
      if (!hasPlaceholder(attribute.rawValue)) {
        this.pushStatic(` ${this.source.slice(attribute.start, attribute.end)}`);
        continue;
      }
      if (!attribute.quote) throw new Error(`Dynamic attribute "${attribute.name}" must use a quoted value`);
      // Dynamic attribute: value split into static text and value indexes, e.g. ["card ", 0].
      // It is written double-quoted, so a single-quoted value's `"` must be escaped.
      const segments = splitPlaceholders(attribute.rawValue).map((segment) =>
        typeof segment === 'string' && attribute.quote === "'" ? segment.replaceAll('"', '&quot;') : segment);
      this.ops.push({kind: 'attribute', name: attribute.name, segments});
      // Remember which values this element owns, for its `data-dh-a` tokens.
      if (counted) partIndexes.push(...segments.filter((segment): segment is number => typeof segment === 'number'));
    }

    // Hydration-only attributes: data-dota-index, data-dota-component, data-dota-dynamic.
    const markers = counted ? this.elementMarkers(token.name, partIndexes.length > 0) : undefined;
    if (markers) this.ops.push(markers);
    if (partIndexes.length > 0) this.ops.push({kind: 'attribute-markers', indexes: partIndexes});
    this.pushStatic(token.selfClosing ? '/>' : '>');

    // Void elements, and `/>` in SVG or MathML, have no content: nothing to keep open.
    const closesItself = VOID_ELEMENTS.has(token.name) || (token.selfClosing && (this.foreignDepth > 0 || FOREIGN_ROOT_ELEMENTS.has(token.name)));
    if (closesItself) return;
    // Keep it open so text inside can flag it dynamic and its end tag can close it.
    this.open.push({name: token.name, markers, hasDynamicFlag: partIndexes.length > 0, insertedByParser: false});
    if (token.name === TEMPLATE_ELEMENT) this.inertDepth += 1;
    if (FOREIGN_ROOT_ELEMENTS.has(token.name)) this.foreignDepth += 1;
  }


  /**
   * Plans an end tag and closes every element the parser would close with it.
   * A stray end tag with no open match is copied and otherwise ignored, as the parser does.
   * @param token End tag from the joined template source.
   */
  endTag(token: EndTagToken): void {
    const match = this.open.findLastIndex((element) => element.name === token.name);
    if (match !== -1) {
      for (const element of this.open.splice(match).reverse()) {
        if (element.insertedByParser) this.pushStatic(`</${element.name}>`);
        if (element.name === TEMPLATE_ELEMENT) this.inertDepth -= 1;
        if (FOREIGN_ROOT_ELEMENTS.has(element.name)) this.foreignDepth -= 1;
      }
    }
    this.pushStatic(this.source.slice(token.start, token.end));
  }

  /**
   * Plans character data. In ordinary content each interpolation is a child part, and
   * its parent element is flagged dynamic, as the client flags a marker's parent.
   * Inside raw-text and RCDATA elements a comment marker would reparse as text, and
   * inside `<template>` the client never looks, so values there become plain text.
   * @param token Text from the joined template source.
   */
  text(token: TextToken): void {
    const parent = this.open.at(-1)?.name ?? '';
    const inRawText = this.foreignDepth === 0 && RAW_TEXT_ELEMENTS.has(parent);
    const unbound = inRawText || this.inertDepth > 0 || (this.foreignDepth === 0 && RCDATA_ELEMENTS.has(parent));
    for (const segment of splitPlaceholders(this.source.slice(token.start, token.end))) {
      if (typeof segment === 'string') {
        this.pushStatic(segment);
      } else if (unbound) {
        this.ops.push({kind: 'unbound-text', index: segment, inRawText});
      } else {
        this.ops.push({kind: 'child', index: segment});
        this.markDynamic(this.open.at(-1));
      }
    }
  }

  /**
   * Plans a comment; interpolations inside it are written as escaped text.
   * @param token Comment from the joined template source.
   */
  comment(token: CommentToken): void {
    for (const segment of splitPlaceholders(this.source.slice(token.start, token.end))) {
      if (typeof segment === 'string') this.pushStatic(segment);
      else this.ops.push({kind: 'unbound-text', index: segment, inRawText: false});
    }
  }

  finish(): readonly PlanOp[] {
    this.ops.push({kind: 'hydration-only', html: COMPONENT_END_MARKER});
    return this.ops;
  }

  /**
   * Builds the hydration attributes for one counted element and assigns its index.
   * @param name Lowercase element name.
   * @param dynamic Whether the element owns an attribute part.
   */
  private elementMarkers(name: string, dynamic: boolean): HydrationOnlyOp {
    const index = this.elementCount++;
    const component = name.includes('-') ? ` ${COMPONENT_ATTRIBUTE}="${name}"` : '';
    return {kind: 'hydration-only', html: ` ${NODE_INDEX_ATTRIBUTE}="${index}"${component}${dynamic ? ` ${DYNAMIC_ATTRIBUTE}=""` : ''}`};
  }

  /** Opens the `<tbody>` the parser inserts for a row placed directly in a table. */
  private openImpliedTbody(): void {
    const markers = this.inertDepth === 0 ? this.elementMarkers(TABLE_BODY_ELEMENT, false) : undefined;
    this.pushStatic(`<${TABLE_BODY_ELEMENT}`);
    if (markers) this.ops.push(markers);
    this.pushStatic('>');
    this.open.push({name: TABLE_BODY_ELEMENT, markers, hasDynamicFlag: false, insertedByParser: true});
  }

  /** Flags the element that owns a child part, once. */
  private markDynamic(element: OpenElement | undefined): void {
    if (!element?.markers || element.hasDynamicFlag) return;
    element.markers.html += ` ${DYNAMIC_ATTRIBUTE}=""`;
    element.hasDynamicFlag = true;
  }

  /** Appends static markup, merging it into the previous static step. */
  private pushStatic(html: string): void {
    if (!html) return;
    const last = this.ops.at(-1);
    if (last?.kind === 'static') last.html += html;
    else this.ops.push({kind: 'static', html});
  }
}

function hasPlaceholder(value: string): boolean {
  return value.includes('');
}

/**
 * Splits text at interpolation placeholders.
 * @param value Template source fragment.
 * @returns Non-empty static strings alternating with interpolation indexes.
 */
function splitPlaceholders(value: string): Array<string | number> {
  const segments: Array<string | number> = [];
  let cursor = 0;
  for (const match of value.matchAll(PLACEHOLDER)) {
    if (match.index > cursor) segments.push(value.slice(cursor, match.index));
    segments.push(Number(match[1]));
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) segments.push(value.slice(cursor));
  return segments;
}
