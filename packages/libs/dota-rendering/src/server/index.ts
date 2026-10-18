/**
 * DOM-free server output for Dota Rendering templates.
 *
 * Serializes the same `TemplateResult` values the browser renderer mounts, emitting the
 * durable hydration markers `hydrate()` adopts. The lexical HTML primitives are exported for
 * server tooling that must read the same markup, such as document shells and host discovery.
 */
export {escapeHtml, serializeOutput} from './template-serializer';
export {decodeHtmlEntities, tokenizeHtml} from './html-tokenizer';
export type {CommentToken, EndTagToken, HtmlAttribute, HtmlToken, StartTagToken, TextToken} from './html-tokenizer';
export {SHADOW_ROOT_MODE_ATTRIBUTE, TEMPLATE_ELEMENT} from './html-elements';
