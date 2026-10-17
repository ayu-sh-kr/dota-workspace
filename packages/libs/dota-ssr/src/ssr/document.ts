import type {SEO} from '@ayu-sh-kr/dota-core';
import {escapeHtml} from './template-serializer';
import type {RenderResult} from './types';

/** Comment in the document shell replaced by the page's head tags. */
export const HEAD_OUTLET = '<!--dota-head-->';

/** Comment in the document shell replaced by the rendered page. */
export const BODY_OUTLET = '<!--dota-body-->';

/**
 * Writes a rendered page into an application's HTML shell.
 * The shell keeps ownership of scripts, styles, and the root element; only the
 * outlet comments change, so the same file serves both client and server builds.
 * @param template Document shell containing {@link HEAD_OUTLET} and {@link BODY_OUTLET}.
 * @param result Output of a render adapter.
 * @returns The complete HTML document for the response.
 */
export function renderDocument(template: string, result: RenderResult): string {
  return template
    .replace(HEAD_OUTLET, () => result.head ? renderHead(result.head) : '')
    .replace(BODY_OUTLET, () => result.html);
}

/**
 * Serializes page SEO into the tags `updateDocumentSEO` maintains in the browser.
 * Empty values are omitted, matching the client's removal of absent metadata.
 * @param seo Page metadata from a `DotaPageElement`.
 */
export function renderHead(seo: SEO): string {
  const keywords = Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords as string | undefined;
  const metadata: Array<[string, string, string | undefined]> = [
    ['name', 'description', seo.description],
    ['name', 'keywords', keywords],
    ['name', 'robots', seo.robots],
    ['property', 'og:title', seo.og?.title],
    ['property', 'og:description', seo.og?.description],
    ['property', 'og:image', seo.og?.image],
    ['property', 'og:type', seo.og?.type],
    ['property', 'og:url', seo.og?.url],
    ['property', 'og:site_name', seo.og?.siteName],
    ['name', 'twitter:card', seo.twitter?.card],
    ['name', 'twitter:title', seo.twitter?.title],
    ['name', 'twitter:description', seo.twitter?.description],
    ['name', 'twitter:image', seo.twitter?.image],
    ['name', 'twitter:site', seo.twitter?.site],
    ['name', 'twitter:creator', seo.twitter?.creator]
  ];
  const links: Array<[string, string | undefined]> = [['icon', seo.favicon ?? seo.image], ['canonical', seo.canonical]];

  return [
    `<title>${escapeHtml(seo.title)}</title>`,
    ...metadata.filter(([, , content]) => content)
      .map(([attribute, key, content]) => `<meta ${attribute}="${key}" content="${escapeHtml(content!)}">`),
    ...links.filter(([, href]) => href).map(([rel, href]) => `<link rel="${rel}" href="${escapeHtml(href!)}">`)
  ].join('');
}
