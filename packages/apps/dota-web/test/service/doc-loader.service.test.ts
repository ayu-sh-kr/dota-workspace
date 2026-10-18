import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DOCS} from '@dota/configs/docs.config.ts';
import {DocLoaderService} from '@dota/service/doc-loader.service.ts';
import {MDService} from '@ayu-sh-kr/dota-md';

vi.mock('@dota/main.ts', () => ({routerService: {route: vi.fn()}}));

const fetchDocument = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchDocument);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchDocument.mockReset();
});

describe('DocLoaderService rendering collection', () => {
  it('loads the detailed reference without fetching and resolves its repository links', async () => {
    const content = await new DocLoaderService().loadDoc('ssr-file-reference');

    expect(content).toContain('Implementation reference, not the starting lesson');
    expect(content).toContain('Function or method');
    expect(content).toContain('https://github.com/ayu-sh-kr/dota-workspace/blob/feat/light-dom-ssr/packages/');
    expect(content).not.toContain('](../../../../../');
    expect(fetchDocument).not.toHaveBeenCalled();
  });

  it.each(DOCS.filter(doc => doc.section === 'Server Rendering' && doc.slug !== 'ssr-file-reference'))(
    'loads $slug locally with one title and registered lesson links',
    async ({slug}) => {
      const content = await new DocLoaderService().loadDoc(slug);

      const prose = content.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
      expect(prose.match(/^# /gm)).toHaveLength(1);
      expect(content.length).toBeGreaterThan(1000);
      expect(content).not.toContain('](../../../../../../');
      expect(content).not.toMatch(/\]\(\.\/[^)]+\.svg\)/);
      for (const [, target] of content.matchAll(/\]\(\/docs\/([a-z0-9-]+)/g)) {
        expect(DOCS.some(doc => doc.slug === target), `Unregistered link: ${target}`).toBe(true);
      }
      expect(fetchDocument).not.toHaveBeenCalled();
    },
  );

  it('embeds an accessible SVG without development-only URLs or inline image data', async () => {
    const content = await new DocLoaderService().loadDoc('ssr-request');

    expect(content).toContain('<figure><svg');
    expect(content).toContain('role="img"');
    expect(content).toContain('<title id="title">One matched SSR request</title>');
    expect(content).not.toContain('/@fs/');
    expect(content).not.toContain('data:image/svg');
  });

  it('preserves diagram geometry and the lesson after SVG parsing in the SSG DOM', async () => {
    const content = await new DocLoaderService().loadDoc('ssr-request');
    const article = document.createElement('article');
    article.innerHTML = MDService.render(content).html;

    expect(article.querySelectorAll('svg rect').length).toBeGreaterThan(5);
    expect(article.querySelectorAll('h2')).toHaveLength(5);
    expect(article.querySelectorAll('pre')).toHaveLength(4);
    expect(article.querySelector('h2:last-of-type')?.textContent).toBe('Finish the document and response');
    expect(article.querySelector('svg style')).toBeNull();
  });

  it('keeps the overview, eight lessons, and reference in reading order', () => {
    const collection = DOCS.filter(doc => doc.section === 'Server Rendering');

    expect(collection.map(doc => doc.slug)).toEqual([
      'ssg-ssr-csr', 'ssr-html-first', 'ssr-component', 'ssr-request',
      'ssr-templates', 'ssr-static-build', 'ssr-hydration', 'ssr-hosting',
      'ssr-package-map', 'ssr-file-reference',
    ]);
  });
});

describe('DocLoaderService public Markdown', () => {
  it('propagates a failed fetch instead of returning empty Markdown', async () => {
    fetchDocument.mockRejectedValue(new Error('Network unavailable'));

    await expect(new DocLoaderService().loadDoc('router')).rejects.toThrow();
  });

  it.each([
    ['loadDoc', 'router', '/docs/router.md'],
    ['loadResource', 'example.md', '/materials/example.md'],
    ['loadBlog', 'guide/example.md', '/blogs/guide/example.md'],
  ] as const)('%s loads %s from the public content path', async (method, path, expectedUrl) => {
    fetchDocument.mockResolvedValue(new Response('# Public content'));

    const content = await new DocLoaderService()[method](path);

    expect(content).toBe('# Public content');
    expect(fetchDocument.mock.calls[0]?.[0]).toBe(expectedUrl);
    expect(fetchDocument).toHaveBeenCalledTimes(1);
  });
});
