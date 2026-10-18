// Head parity: the server's head markup must equal what `updateDocumentSEO` writes in the
// browser for the same SEO, since both are built from Dota Core's `seoHeadTags` contract.
import {renderHead} from '@dota/ssr/index';
import {updateDocumentSEO, type SEO} from '@ayu-sh-kr/dota-core';

/** Every SEO field, so a tag missing on either side shows up as a difference. */
const COMPLETE_SEO: SEO = {
  title: 'Dota & co',
  description: 'A framework',
  keywords: ['dota', 'ssr'],
  robots: 'index,follow',
  favicon: '/icon.svg',
  canonical: 'https://dota.test/',
  og: {title: 'Dota', description: 'Share', image: '/og.png', type: 'website', url: 'https://dota.test/', siteName: 'Dota'},
  twitter: {card: 'summary', title: 'Dota', description: 'Card', image: '/tw.png', site: '@dota', creator: '@ayu'},
  jsonLd: {'@context': 'https://schema.org', '@type': 'WebSite', name: 'Dota'}
};

/** A head as comparable data: each element's tag, sorted attributes, and text. */
function describeHead(head: Element): string[] {
  return [...head.children].map((element) => {
    const attributes = [...element.attributes].map(({name, value}) => `${name}=${value}`).sort().join(' ');
    return `${element.localName} ${attributes} ${element.textContent}`;
  });
}

describe('renderHead parity with updateDocumentSEO', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it.each([
    ['every field', COMPLETE_SEO],
    ['only the required fields', {title: 'Minimal', description: ''}]
  ])('writes the same head elements for %s', (_, seo) => {
    updateDocumentSEO(seo);
    const browserHead = describeHead(document.head);
    const server = document.createElement('template');
    server.innerHTML = renderHead(seo);
    const serverHead = describeHead(server.content as unknown as Element);

    expect(serverHead).toEqual(browserHead);
  });
});
