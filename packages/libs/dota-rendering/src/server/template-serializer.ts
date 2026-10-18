import {
  attributePartToken,
  childPartMarkers,
  HYDRATION_ATTRIBUTE_PART,
  isConditionalValue,
  isKeyedValue,
  isTemplateResult,
  isTrustedHtmlValue,
  keyedEntryMarkers,
  nothing,
  valueText,
  type KeyedValue,
  type MarkerPair,
  type RenderOutput,
  type TemplateResult
} from '@ayu-sh-kr/dota-rendering';
import {planTemplate} from './template-plan';

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
 * `nothing` (or any other non-string, such as a missing return) is empty, and
 * structured templates follow their compiled plan. With a
 * `scope`, the output also carries the durable markers Dota Rendering's `hydrate()`
 * adopts: element indexes, `data-dh-a` attribute tokens, and paired comments around
 * every child part and keyed entry, all owned by that scope.
 * @param output Value returned by a component's `render()`.
 * @param scope Hydration scope such as `h0`; omit for plain HTML.
 * @returns Markup equivalent to what the client renderer would mount.
 */
export function serializeOutput(output: RenderOutput, scope?: string): string {
  if (isTemplateResult(output)) return serializeTemplate(output, scope);
  // As the client's string strategy does, anything other than a string renders nothing.
  return typeof output === 'string' ? output : '';
}

/**
 * Fills one template's plan with its values, escaping each for its position.
 * Attribute values and text are always escaped; raw-text values only have `</`
 * neutralized because `<script>` and `<style>` never decode entities.
 * @param template Flattened template produced by `html`.
 * @param scope Hydration scope, or undefined for plain HTML.
 * @throws Error when the template's interpolations cannot be serialized; see `planTemplate`.
 * @throws TypeError when `trustedHTML()` is used in an attribute.
 */
function serializeTemplate(template: TemplateResult, scope: string | undefined): string {
  let markup = '';
  for (const op of planTemplate(template.strings)) {
    switch (op.kind) {
      case 'static':
        markup += op.html;
        break;
      case 'hydration-only':
        if (scope) markup += op.html;
        break;
      case 'child':
        markup += serializeChild(template.values[op.index], op.index, scope);
        break;
      case 'unbound-text':
        markup += serializeUnboundText(template.values[op.index], op.inRawText);
        break;
      case 'attribute-markers':
        if (scope) markup += ` ${HYDRATION_ATTRIBUTE_PART}="${op.indexes.map((index) => attributePartToken(scope, index)).join(' ')}"`;
        break;
      case 'attribute':
        markup += ` ${op.name}="${op.segments.map((segment) => typeof segment === 'string' ? segment : serializeAttribute(template.values[segment])).join('')}"`;
        break;
    }
  }

  return markup;
}

/**
 * Renders one child-position value with the client renderer's directive semantics.
 * Trusted markup is emitted raw, conditional and keyed directives recurse into their
 * templates, and everything else becomes `valueText` (so arrays join with commas, as
 * on the client). With a scope, the value is wrapped in `dh:<scope>:p<index>` comments.
 * @param value Interpolation located between elements.
 * @param index Interpolation index, used for the part markers.
 * @param scope Hydration scope, or undefined for plain HTML.
 */
function serializeChild(value: unknown, index: number, scope: string | undefined): string {
  const content = serializeChildContent(value, index, scope);
  return scope ? wrapInMarkers(childPartMarkers(scope, index), content) : content;
}

/**
 * Matches a child value against the renderer's directives and serializes it accordingly.
 * Each case is a type guard, so the value is narrowed inside it; anything that is not a
 * directive falls through to escaped `valueText`.
 * @param value Interpolation located between elements.
 * @param index Interpolation index, used for keyed-entry markers.
 * @param scope Hydration scope, or undefined for plain HTML.
 */
function serializeChildContent(value: unknown, index: number, scope: string | undefined): string {
  switch (true) {
    case isTrustedHtmlValue(value):
      return value.value;
    case isConditionalValue(value):
      return value.value === nothing ? '' : serializeTemplate(value.value, scope);
    case isKeyedValue(value):
      return serializeKeyed(value, index, scope);
    default:
      return escapeHtml(valueText(value));
  }
}

/**
 * Renders keyed entries in order, each in its own `dh:<scope>:k<part>:<position>` range.
 * @param value Keyed directive.
 * @param index Interpolation index of the owning child part.
 * @param scope Hydration scope, or undefined for plain HTML.
 * @throws Error when two entries share a key, as the client renderer does.
 */
function serializeKeyed(value: KeyedValue, index: number, scope: string | undefined): string {
  const keys = new Set<unknown>();
  return value.entries.map((entry, position) => {
    if (keys.has(entry.key)) throw new Error(`Duplicate render key: ${String(entry.key)}`);
    keys.add(entry.key);
    const content = serializeTemplate(entry.value, scope);
    return scope ? wrapInMarkers(keyedEntryMarkers(scope, index, position), content) : content;
  }).join('');
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
 * Renders a value the client cannot bind as a part.
 * @param value Interpolation in a comment, raw-text, RCDATA, or inert position.
 * @param inRawText Whether entities are left undecoded there, as in `<script>` and `<style>`.
 */
function serializeUnboundText(value: unknown, inRawText: boolean): string {
  const text = valueText(value);
  return inRawText ? text.replace(/<\//g, '<\\/') : escapeHtml(text);
}

/** Wraps serialized content in the paired comments that delimit one durable range for `hydrate()`. */
function wrapInMarkers({start, end}: MarkerPair, content: string): string {
  return `<!--${start}-->${content}<!--${end}-->`;
}
