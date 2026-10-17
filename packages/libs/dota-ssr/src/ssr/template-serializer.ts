import {
  isConditionalValue,
  isKeyedValue,
  isTemplateResult,
  isTrustedHtmlValue,
  nothing,
  valueText,
  type RenderOutput,
  type TemplateResult
} from '@ayu-sh-kr/dota-rendering';

/** Where the serializer is inside the static markup when it reaches an interpolation. */
type MarkupContext = 'text' | 'tag' | 'double-quoted' | 'single-quoted' | 'comment';

const TEXT_ESCAPES: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};

/**
 * Escapes a value for an HTML text node or quoted attribute value.
 * Quotes are escaped in both positions so one routine is safe for either context.
 * @param value Raw text supplied by component state.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => TEXT_ESCAPES[character]);
}

/**
 * Serializes a component's render output to HTML without a DOM.
 * Plain strings keep the legacy innerHTML contract and pass through unchanged,
 * `nothing` is empty, and structured templates are walked part by part.
 * @param output Value returned by a component's `render()`.
 * @returns Markup equivalent to what the client renderer would mount.
 */
export function serializeOutput(output: RenderOutput): string {
  if (output === nothing) return '';
  return isTemplateResult(output) ? serializeTemplate(output) : output;
}

/**
 * Joins static segments with interpolations escaped for their markup position.
 * A small scanner tracks whether each gap is in text, a quoted attribute, or a
 * comment, mirroring the client renderer's child and attribute parts.
 * @param template Flattened template produced by `html`.
 * @throws Error when an interpolation is an unquoted attribute or tag-level value.
 */
function serializeTemplate(template: TemplateResult): string {
  let markup = '';
  let context: MarkupContext = 'text';
  template.strings.forEach((segment, index) => {
    markup += segment;
    context = advanceContext(context, segment);
    if (index === template.values.length) return;

    const value = template.values[index];
    if (context === 'text') markup += serializeChild(value);
    else if (context === 'double-quoted' || context === 'single-quoted') markup += serializeAttribute(value);
    else if (context === 'comment') markup += escapeHtml(valueText(value));
    else throw new Error('Dynamic attribute values must be quoted for server rendering');
  });
  return markup;
}

/**
 * Renders one child-position value with the client renderer's directive semantics.
 * Trusted markup is emitted raw, conditional and keyed directives recurse into
 * their templates, arrays concatenate, and everything else becomes escaped text.
 * @param value Interpolation located between elements.
 */
function serializeChild(value: unknown): string {
  if (isTrustedHtmlValue(value)) return value.value;
  if (isTemplateResult(value)) return serializeTemplate(value);
  if (isConditionalValue(value)) return value.value === nothing ? '' : serializeTemplate(value.value);
  if (isKeyedValue(value)) return value.entries.map((entry) => serializeTemplate(entry.value)).join('');
  if (Array.isArray(value)) return value.map(serializeChild).join('');
  return escapeHtml(valueText(value));
}

/**
 * Renders one attribute-position value, rejecting markup directives like the client.
 * @param value Interpolation inside a quoted attribute value.
 * @throws TypeError when trusted markup is used in an attribute.
 */
function serializeAttribute(value: unknown): string {
  if (isTrustedHtmlValue(value)) throw new TypeError('trustedHTML() can only be used in a child position');
  return escapeHtml(valueText(value));
}

/**
 * Advances the markup context across one static segment.
 * Only the transitions needed to classify interpolations are modelled: tag open
 * and close, quoted attribute values, and comments.
 * @param context State at the start of the segment.
 * @param segment Static template text.
 * @returns State at the end of the segment.
 */
function advanceContext(context: MarkupContext, segment: string): MarkupContext {
  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index];
    if (context === 'text') {
      if (segment.startsWith('<!--', index)) {
        context = 'comment';
        index += 3;
      } else if (character === '<' && /[a-zA-Z/!]/.test(segment[index + 1] ?? '')) {
        context = 'tag';
      }
    } else if (context === 'tag') {
      if (character === '"') context = 'double-quoted';
      else if (character === "'") context = 'single-quoted';
      else if (character === '>') context = 'text';
    } else if (context === 'double-quoted') {
      if (character === '"') context = 'tag';
    } else if (context === 'single-quoted') {
      if (character === "'") context = 'tag';
    } else if (segment.startsWith('-->', index)) {
      context = 'text';
      index += 2;
    }
  }
  return context;
}
