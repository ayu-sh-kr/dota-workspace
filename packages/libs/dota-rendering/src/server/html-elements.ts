/**
 * Element names whose parsing rules the tokenizer, the template planner, and host
 * discovery must agree on. Each list follows the WHATWG HTML parsing specification;
 * keep them here so the three never drift apart.
 */

/** `<template>`: its content is inert, so it is neither indexed nor searched for hosts. */
export const TEMPLATE_ELEMENT = 'template';

/** Attribute that turns a `<template>` into a declarative shadow root, whose content is live. */
export const SHADOW_ROOT_MODE_ATTRIBUTE = 'shadowrootmode';

/** `<table>`: a `<tr>` written directly inside it gets an implied `<tbody>` from the parser. */
export const TABLE_ELEMENT = 'table';

/** `<tr>`: the start tag that triggers the implied `<tbody>`. */
export const TABLE_ROW_ELEMENT = 'tr';

/** `<tbody>`: the element the parser inserts between `<table>` and a direct `<tr>`. */
export const TABLE_BODY_ELEMENT = 'tbody';

/** Raw-text elements: content runs to the matching end tag and character references are not decoded. */
export const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes']);

/** RCDATA elements: content runs to the matching end tag, but character references are decoded. */
export const RCDATA_ELEMENTS: ReadonlySet<string> = new Set(['textarea', 'title']);

/** Void elements: they never have content or an end tag, so they are never left open. */
export const VOID_ELEMENTS: ReadonlySet<string> = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Roots of foreign (SVG and MathML) content, where `/>` closes an element and raw-text rules stop. */
export const FOREIGN_ROOT_ELEMENTS: ReadonlySet<string> = new Set(['svg', 'math']);
