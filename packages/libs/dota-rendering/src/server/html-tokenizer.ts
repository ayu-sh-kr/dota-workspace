import {FOREIGN_ROOT_ELEMENTS, RAW_TEXT_ELEMENTS, RCDATA_ELEMENTS} from './html-elements';

/** One attribute written on a start tag. */
export type HtmlAttribute = {
  /** Lowercase attribute name. */
  readonly name: string;
  /** Value with character references decoded; empty for a valueless attribute. */
  readonly value: string;
  /** Value exactly as written between its quotes, or unquoted. */
  readonly rawValue: string;
  /** Quote character around the value, or `''` when unquoted or valueless. */
  readonly quote: '"' | "'" | '';
  /** Offsets from the name's first character to just past the value. */
  readonly start: number;
  readonly end: number;
};

/** Offsets of a token in the source: `start` inclusive, `end` exclusive. */
type TokenSpan = {
  readonly start: number;
  readonly end: number;
};

/** Start tag such as `<a href="/">`. Names are lowercase in every token. */
export type StartTagToken = TokenSpan & {
  readonly kind: 'start-tag';
  readonly name: string;
  /** Source order, duplicates included. */
  readonly attributes: readonly HtmlAttribute[];
  /** Whether the tag ends in `/>`; only meaningful for void and foreign elements. */
  readonly selfClosing: boolean;
};

/** End tag such as `</a>`. */
export type EndTagToken = TokenSpan & {
  readonly kind: 'end-tag';
  readonly name: string;
};

/** Run of character data, including the whole body of a raw-text element. */
export type TextToken = TokenSpan & {
  readonly kind: 'text';
};

/** Comment, doctype, or other `<!…>` / `<?…>` markup the parser treats as a comment. */
export type CommentToken = TokenSpan & {
  readonly kind: 'comment';
  /** Offset of the comment body, after `<!--`, `<!`, or `<?`. */
  readonly dataStart: number;
  /** Offset just past the comment body, before `-->` or `>`. */
  readonly dataEnd: number;
};

/** One lexical unit of HTML source, with offsets into that source. */
export type HtmlToken = StartTagToken | EndTagToken | TextToken | CommentToken;

/** Character references decoded by name; others stay verbatim (see {@link decodeHtmlEntities}). */
const NAMED_REFERENCES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';
/** One end-tag pattern per raw-text/RCDATA element, compiled on first use. */
const RAW_TEXT_END_TAGS = new Map<string, RegExp>();
const CHAR_CODE = {
  tab: 0x09,
  lineFeed: 0x0a,
  formFeed: 0x0c,
  carriageReturn: 0x0d,
  space: 0x20,
  exclamation: 0x21,
  slash: 0x2f,
  equals: 0x3d,
  greaterThan: 0x3e,
  question: 0x3f
} as const;

/**
 * Splits HTML source into start tags, end tags, text, and comments.
 * It follows the parts of the HTML tokenizer that decide what is markup: comments,
 * doctypes, quoted and unquoted attributes, and raw-text and RCDATA elements such as
 * `<script>` and `<textarea>`, whose content never yields tags. Tree construction is
 * left to callers. Malformed input degrades to text instead of throwing.
 *
 * The scan is a single forward pass, O(n) in the source length: `indexOf` jumps
 * between `<` characters natively, every character is examined a bounded number of
 * times, and no intermediate strings are built except tag and attribute names. It is
 * a generator so callers such as host discovery can consume a host's subtree lazily
 * and stop early; collecting into an array is a caller's choice.
 * @param source Complete HTML fragment.
 * @returns Tokens in source order; consecutive tokens cover the whole source.
 */
export function* tokenizeHtml(source: string): Generator<HtmlToken> {
  // `cursor` is where the next `<` search starts; `textStart` is where pending text began.
  // They differ only after a `<` that turned out to be plain text, such as `a < b`.
  let cursor = 0;
  let textStart = 0;
  // Nesting depth inside <svg>/<math>: there `/>` closes elements and <title> is not RCDATA.
  let foreignDepth = 0;

  while (cursor < source.length) {
    // 1. Jump to the next candidate markup start.
    const open = source.indexOf('<', cursor);
    if (open === -1) break;
    const token = readMarkup(source, open);
    if (!token) {
      // A `<` not followed by a tag name, `/`, `!`, or `?` is text; keep searching after it.
      cursor = open + 1;
      continue;
    }

    // 2. Flush the text that preceded this markup, then emit the markup itself.
    if (open > textStart) yield {kind: 'text', start: textStart, end: open};
    yield token;
    cursor = textStart = token.end;

    // 3. Track foreign content, which changes how later tags are read.
    if (token.kind === 'end-tag' && FOREIGN_ROOT_ELEMENTS.has(token.name)) foreignDepth = Math.max(0, foreignDepth - 1);
    if (token.kind !== 'start-tag') continue;
    if (FOREIGN_ROOT_ELEMENTS.has(token.name) && !token.selfClosing) foreignDepth += 1;

    // 4. Raw-text and RCDATA content is one text token up to the matching end tag, so
    //    `<script>if (a < b) "</div>"</script>` yields no tags from inside the script.
    const holdsOnlyText = RAW_TEXT_ELEMENTS.has(token.name) || RCDATA_ELEMENTS.has(token.name);
    if (foreignDepth > 0 || !holdsOnlyText) continue;
    const close = findRawTextEnd(source, token.name, cursor);
    if (close > cursor) yield {kind: 'text', start: cursor, end: close};
    cursor = textStart = close;
  }
  // 5. Whatever follows the last markup is trailing text.
  if (textStart < source.length) yield {kind: 'text', start: textStart, end: source.length};
}

/**
 * Decodes the character references authors and {@link escapeHtml}-style encoders use.
 * Numeric references and common named ones are decoded; unknown names stay verbatim
 * rather than being guessed, which keeps rare entities intact on a round trip.
 * @param value Raw attribute value or text.
 */
export function decodeHtmlEntities(value: string): string {
  // Most values contain no `&`, so skip the regular expression entirely for them.
  if (!value.includes('&')) return value;
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (reference, body: string) => {
    if (body[0] !== '#') return NAMED_REFERENCES[body.toLowerCase()] ?? reference;
    const codePoint = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : reference;
  });
}

/**
 * Reads the markup construct starting at a `<`, if the HTML tokenizer would treat it as one.
 * The character after `<` selects the construct, as in the specification's tag open state:
 * `!--` a comment, `!` or `?` a bogus comment (doctypes included), `/` + letter an end tag,
 * and a letter a start tag. Anything else means the `<` is text.
 * @param source Complete HTML fragment.
 * @param open Offset of the `<`.
 * @returns The token, or undefined when the `<` is plain text.
 */
function readMarkup(source: string, open: number): HtmlToken | undefined {
  const next = source.charCodeAt(open + 1);
  if (source.startsWith(COMMENT_OPEN, open)) {
    const close = source.indexOf(COMMENT_CLOSE, open + COMMENT_OPEN.length);
    const dataEnd = close === -1 ? source.length : close;
    const end = close === -1 ? source.length : close + COMMENT_CLOSE.length;
    return {kind: 'comment', dataStart: open + COMMENT_OPEN.length, dataEnd, start: open, end};
  }
  if (next === CHAR_CODE.exclamation || next === CHAR_CODE.question) {
    const close = source.indexOf('>', open + 2);
    const dataEnd = close === -1 ? source.length : close;
    return {kind: 'comment', dataStart: open + 2, dataEnd, start: open, end: close === -1 ? source.length : close + 1};
  }
  if (next === CHAR_CODE.slash && isAsciiLetter(source.charCodeAt(open + 2))) {
    // End tags carry no meaningful attributes, so everything up to `>` is skipped.
    const nameEnd = scanName(source, open + 2);
    const close = source.indexOf('>', nameEnd);
    return {kind: 'end-tag', name: source.slice(open + 2, nameEnd).toLowerCase(), start: open, end: close === -1 ? source.length : close + 1};
  }
  if (isAsciiLetter(next)) return readStartTag(source, open);
  return undefined;
}

/**
 * Reads a start tag and its attributes, following the tokenizer's attribute states.
 * Duplicate attributes are kept in order; consumers decide which one wins.
 * @param source Complete HTML fragment.
 * @param open Offset of the tag's `<`.
 */
function readStartTag(source: string, open: number): StartTagToken {
  const nameEnd = scanName(source, open + 1);
  const name = source.slice(open + 1, nameEnd).toLowerCase();
  const attributes: HtmlAttribute[] = [];
  let cursor = nameEnd;
  let selfClosing = false;

  // Before-attribute-name state: skip whitespace and stray `/`, stop at `>`.
  while (cursor < source.length) {
    const code = source.charCodeAt(cursor);
    if (isWhitespace(code)) {
      cursor += 1;
    } else if (code === CHAR_CODE.greaterThan) {
      return {kind: 'start-tag', name, attributes, selfClosing, start: open, end: cursor + 1};
    } else if (code === CHAR_CODE.slash) {
      // `/` only self-closes when it is immediately followed by `>`.
      selfClosing = source.charCodeAt(cursor + 1) === CHAR_CODE.greaterThan;
      cursor += 1;
    } else {
      selfClosing = false;
      const attribute = readAttribute(source, cursor);
      attributes.push(attribute);
      cursor = attribute.end;
    }
  }
  // An unterminated tag runs to the end of the source.
  return {kind: 'start-tag', name, attributes, selfClosing, start: open, end: source.length};
}

/**
 * Reads one attribute name and its optional value.
 * The first name character may be `=`, as in the specification; later names stop
 * at whitespace, `/`, `>`, or `=`. Unquoted values stop at whitespace or `>`.
 * @param source Complete HTML fragment.
 * @param start Offset of the attribute name.
 */
function readAttribute(source: string, start: number): HtmlAttribute {
  // Attribute name state.
  let cursor = start + 1;
  while (cursor < source.length && !isAttributeNameEnd(source.charCodeAt(cursor))) cursor += 1;
  const name = source.slice(start, cursor).toLowerCase();

  // After-attribute-name state: a valueless attribute unless `=` follows.
  let valueStart = skipWhitespace(source, cursor);
  if (source.charCodeAt(valueStart) !== CHAR_CODE.equals) return {name, value: '', rawValue: '', quote: '', start, end: cursor};

  // Before-attribute-value state: a quote selects the quoted value states.
  valueStart = skipWhitespace(source, valueStart + 1);
  const quote = source[valueStart];
  if (quote === '"' || quote === "'") {
    const close = source.indexOf(quote, valueStart + 1);
    const valueEnd = close === -1 ? source.length : close;
    const rawValue = source.slice(valueStart + 1, valueEnd);
    return {name, value: decodeHtmlEntities(rawValue), rawValue, quote, start, end: Math.min(source.length, valueEnd + 1)};
  }

  // Unquoted attribute value state.
  let valueEnd = valueStart;
  while (valueEnd < source.length && !isUnquotedValueEnd(source.charCodeAt(valueEnd))) valueEnd += 1;
  const rawValue = source.slice(valueStart, valueEnd);
  return {name, value: decodeHtmlEntities(rawValue), rawValue, quote: '', start, end: valueEnd};
}

function scanName(source: string, from: number): number {
  let cursor = from;
  while (cursor < source.length && !isTagNameEnd(source.charCodeAt(cursor))) cursor += 1;
  return cursor;
}

function skipWhitespace(source: string, from: number): number {
  let cursor = from;
  while (cursor < source.length && isWhitespace(source.charCodeAt(cursor))) cursor += 1;
  return cursor;
}

/**
 * Finds where a raw-text or RCDATA element's content ends: at `</name` followed by a tag boundary.
 * The pattern is case-insensitive and compiled once per element name.
 * @param source Complete HTML fragment.
 * @param name Lowercase element name.
 * @param from Offset just past the element's start tag.
 * @returns Offset of the closing `</`, or the source length when the element is unclosed.
 */
function findRawTextEnd(source: string, name: string, from: number): number {
  let endTag = RAW_TEXT_END_TAGS.get(name);
  if (!endTag) RAW_TEXT_END_TAGS.set(name, endTag = new RegExp(`</${name}(?=[\\t\\n\\f\\r />]|$)`, 'gi'));
  endTag.lastIndex = from;
  return endTag.exec(source)?.index ?? source.length;
}

/**
 * Whether a character code is HTML whitespace: tab, line feed, form feed, carriage return, or space.
 * These separate attributes and end names in every tokenizer state; other Unicode spaces do not.
 */
function isWhitespace(code: number): boolean {
  return code === CHAR_CODE.space || code === CHAR_CODE.tab || code === CHAR_CODE.lineFeed || code === CHAR_CODE.formFeed || code === CHAR_CODE.carriageReturn;
}

/**
 * Whether a character code is an ASCII letter. Only these can follow `<` or `</` to start a
 * tag; anything else makes the `<` plain text, as in the specification's tag open state.
 */
function isAsciiLetter(code: number): boolean {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

/** Whether a character ends a tag name: whitespace, `/`, or `>`. */
function isTagNameEnd(code: number): boolean {
  return isWhitespace(code) || code === CHAR_CODE.slash || code === CHAR_CODE.greaterThan;
}

/**
 * Whether a character ends an attribute name: anything that ends a tag name, or `=`,
 * which starts the value.
 */
function isAttributeNameEnd(code: number): boolean {
  return isTagNameEnd(code) || code === CHAR_CODE.equals;
}

/**
 * Whether a character ends an unquoted attribute value: whitespace or `>`. A `/` does not,
 * so `href=/a/b` keeps its slashes, as in the specification.
 */
function isUnquotedValueEnd(code: number): boolean {
  return isWhitespace(code) || code === CHAR_CODE.greaterThan;
}
