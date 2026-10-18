import {SEO_JSON_LD_ATTRIBUTE, seoHeadTags, type SEO, type SeoHeadTag} from '@ayu-sh-kr/dota-core';
import {escapeHtml, tokenizeHtml} from '@ayu-sh-kr/dota-rendering/server';
import type {RenderResult} from './types';

/** Comment in the document shell replaced by the page's head tags. */
export const HEAD_OUTLET = '<!--dota-head-->';

/** Comment in the document shell replaced by the rendered page. */
export const BODY_OUTLET = '<!--dota-body-->';

/** Characters that could end the JSON-LD `<script>` or break JavaScript parsers if left literal. */
const JSON_LD_ESCAPES: Record<string, string> = {'<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029'};

/**
 * Writes a rendered page into an application's HTML shell.
 * The shell keeps ownership of scripts, styles, and the root element; only the
 * outlet comments change, so the same file serves both client and server builds.
 * @param template Document shell containing {@link HEAD_OUTLET} and {@link BODY_OUTLET}.
 * @param result Output of a render adapter.
 * @returns The complete HTML document for the response.
 */
export function renderDocument(template: string, result: RenderResult): string {
  const shell = result.head ? withoutManagedHeadTags(template, seoHeadTags(result.head)) : template;
  return shell
    .replace(HEAD_OUTLET, () => result.head ? renderHead(result.head) : '')
    .replace(BODY_OUTLET, () => result.html);
}

/**
 * Removes the shell's own copy of every head element page SEO manages (see `seoHeadTags`),
 * so a shell default such as its description never sits beside the page's value. In the
 * browser, `updateDocumentSEO` owns the same elements, so the server output matches it.
 * @param template Document shell.
 * @param tags Managed head elements of the page; their identities select what is removed.
 */
function withoutManagedHeadTags(template: string, tags: readonly SeoHeadTag[]): string {
  return tags.reduce((shell, tag) => shell.replace(managedTagPattern(tag), ''), template);
}

/**
 * Matches the shell markup of one managed head element, by the identity `seoHeadTagSelector`
 * uses in the browser: the title, a meta tag's `name`/`property`, a link's `rel`, or the marked
 * JSON-LD script. Attribute order and quoting in the shell do not matter.
 * @param tag Managed head element.
 */
function managedTagPattern(tag: SeoHeadTag): RegExp {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  switch (tag.kind) {
    case 'title':
      return /<title[\s>][\s\S]*?<\/title>/gi;
    case 'meta':
      return new RegExp(`<meta\\b[^>]*\\b${tag.attribute}\\s*=\\s*["']${escape(tag.key)}["'][^>]*>`, 'gi');
    case 'link':
      return new RegExp(`<link\\b[^>]*\\brel\\s*=\\s*["']${escape(tag.rel)}["'][^>]*>`, 'gi');
    case 'json-ld':
      return new RegExp(`<script\\b[^>]*\\b${SEO_JSON_LD_ATTRIBUTE}\\b[^>]*>[\\s\\S]*?<\\/script>`, 'gi');
  }
}

/**
 * Adds the outlets {@link renderDocument} fills, so an ordinary `index.html` works as the shell.
 * The head outlet goes before `</head>`; the body outlet replaces the content of the root
 * element, the `<root-selector>` host the router renders pages into. Outlets already
 * present are kept, so a shell can place them itself.
 * @param template Document shell, usually the built `index.html`.
 * @param rootSelector Tag name of the application's root component.
 * @throws Error when the shell has no `</head>` or no root element.
 */
export function prepareDocumentShell(template: string, rootSelector: string): string {
  let shell = template;
  if (!shell.includes(HEAD_OUTLET)) {
    const headEnd = shell.search(/<\/head\s*>/i);
    if (headEnd === -1) throw new Error('The document shell has no </head> for page head tags');
    shell = `${shell.slice(0, headEnd)}${HEAD_OUTLET}${shell.slice(headEnd)}`;
  }
  if (shell.includes(BODY_OUTLET)) return shell;

  let contentStart = -1;
  let depth = 0;
  for (const token of tokenizeHtml(shell)) {
    if (token.kind === 'start-tag' && token.name === rootSelector) {
      if (depth++ === 0) contentStart = token.end;
    } else if (token.kind === 'end-tag' && token.name === rootSelector && depth > 0 && --depth === 0) {
      return `${shell.slice(0, contentStart)}${BODY_OUTLET}${shell.slice(token.start)}`;
    }
  }
  throw new Error(`The document shell has no <${rootSelector}> element to render pages into`);
}

/**
 * Serializes page SEO into the head elements `updateDocumentSEO` manages in the browser.
 * Both read the same `seoHeadTags` contract, so the server writes exactly the tags the
 * browser would, in the same order; elements without a value are omitted.
 * @param seo Page metadata from a `DotaPageElement` or route.
 */
export function renderHead(seo: SEO): string {
  return seoHeadTags(seo).map(serializeHeadTag).join('');
}

/**
 * Writes one managed head element as HTML, or nothing when it has no value.
 * Attribute values are escaped; JSON-LD has `<`, `>`, `&`, U+2028, and U+2029 escaped as
 * JSON unicode escapes so its content cannot close the script, and it carries the marker
 * attribute the browser uses to update it on navigation.
 * @param tag Managed head element and its value.
 */
function serializeHeadTag(tag: SeoHeadTag): string {
  switch (tag.kind) {
    case 'title':
      return `<title>${escapeHtml(tag.text)}</title>`;
    case 'meta':
      return tag.content ? `<meta ${tag.attribute}="${tag.key}" content="${escapeHtml(tag.content)}">` : '';
    case 'link':
      return tag.href ? `<link rel="${tag.rel}" href="${escapeHtml(tag.href)}">` : '';
    case 'json-ld': {
      if (!tag.data) return '';
      const json = JSON.stringify(tag.data).replace(/[<>&\u2028\u2029]/g, (character) => JSON_LD_ESCAPES[character]);
      return `<script type="application/ld+json" ${SEO_JSON_LD_ATTRIBUTE}="">${json}</script>`;
    }
  }
}
