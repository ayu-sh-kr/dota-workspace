// @vitest-environment node
import {BODY_OUTLET, HEAD_OUTLET, prepareDocumentShell, renderDocument, renderHead} from '@dota/ssr/index';

describe('renderHead', () => {
  it('writes the tags updateDocumentSEO manages, in its order, omitting empty values', () => {
    const head = renderHead({
      title: 'Dota & co',
      description: 'A "framework"',
      keywords: [' dota ', '', 'ssr'],
      robots: '',
      favicon: '/icon.svg',
      og: {title: 'Dota'},
      twitter: {card: 'summary'}
    });

    expect(head).toBe(
      '<title>Dota &amp; co</title>' +
      '<meta name="description" content="A &quot;framework&quot;">' +
      '<meta name="keywords" content="dota, ssr">' +
      '<link rel="icon" href="/icon.svg">' +
      '<meta property="og:title" content="Dota">' +
      '<meta name="twitter:card" content="summary">'
    );
  });

  it('writes JSON-LD as one managed script that cannot be closed early by its content', () => {
    const head = renderHead({
      title: 'Post',
      description: '',
      jsonLd: {'@context': 'https://schema.org', '@type': 'Article', headline: '</script><b>&\u2028'}
    });

    expect(head).toBe(
      '<title>Post</title><script type="application/ld+json" data-dota-seo="">' +
      '{"@context":"https://schema.org","@type":"Article","headline":"\\u003c/script\\u003e\\u003cb\\u003e\\u0026\\u2028"}</script>'
    );
    expect(JSON.parse(head.slice(head.indexOf('">') + 2, -'</script>'.length)).headline).toBe('</script><b>&\u2028');
  });
});

describe('prepareDocumentShell', () => {
  it('adds a head outlet and replaces the root element content with the body outlet', () => {
    const shell = prepareDocumentShell('<html><head><meta charset="utf-8"></head><body><app-root id="app-root"><p>loading</p></app-root><script src="/a.js"></script></body></html>', 'app-root');

    expect(shell).toBe(`<html><head><meta charset="utf-8">${HEAD_OUTLET}</head><body><app-root id="app-root">${BODY_OUTLET}</app-root><script src="/a.js"></script></body></html>`);
  });

  it('keeps outlets an author placed and rejects a shell without the root element', () => {
    const authored = `<head>${HEAD_OUTLET}</head><main>${BODY_OUTLET}</main>`;

    expect(prepareDocumentShell(authored, 'app-root')).toBe(authored);
    expect(() => prepareDocumentShell('<head></head><body></body>', 'app-root')).toThrow('has no <app-root> element');
  });
});

describe('renderDocument', () => {
  it('replaces the shell defaults page SEO manages and keeps everything else', () => {
    const shell = `<head><meta charset="utf-8"><title>Shell</title><meta name="description" content="default"><meta property="og:title" content="x"><meta name="theme-color" content="#fff"><link rel="icon" href="/a.svg"><link rel="stylesheet" href="/s.css">${HEAD_OUTLET}</head><body>${BODY_OUTLET}</body>`;

    const html = renderDocument(shell, {html: '<p>page</p>', head: {title: 'Page', description: 'page summary'}});

    expect(html).toBe('<head><meta charset="utf-8"><meta name="theme-color" content="#fff"><link rel="stylesheet" href="/s.css"><title>Page</title><meta name="description" content="page summary"></head><body><p>page</p></body>');
  });
});
