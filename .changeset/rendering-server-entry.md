---
"@ayu-sh-kr/dota-rendering": minor
---

Add a DOM-free `@ayu-sh-kr/dota-rendering/server` entry that serializes `html` templates to HTML strings carrying the same durable hydration markers `hydrate()` adopts.

- `serializeOutput(output, scope?)` renders a `TemplateResult`, a legacy string, or `nothing`; with a scope it emits element indexes, `data-dh-a` attribute tokens, and child-part and keyed-entry comments.
- `escapeHtml(value)` escapes text and quoted attribute values.
- `tokenizeHtml(source)`, `decodeHtmlEntities(value)`, the token types, `TEMPLATE_ELEMENT`, and `SHADOW_ROOT_MODE_ATTRIBUTE` expose the lexical HTML support that server tooling needs to read the same markup.

The server entry imports the root entry, so both share one copy of values such as `nothing` and one set of types. The root entry and its bundled declarations are unchanged.
