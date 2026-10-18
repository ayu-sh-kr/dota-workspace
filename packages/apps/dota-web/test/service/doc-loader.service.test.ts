import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DOCS, findDoc} from '@dota/configs/docs.config.ts';
import {DocLoaderService} from '@dota/service/doc-loader.service.ts';

vi.mock('@dota/main.ts', () => ({routerService: {route: vi.fn()}}));

const fetchDocument = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchDocument);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchDocument.mockReset();
});

it('exposes one server-rendering page and resolves earlier SSR URLs to it', () => {
  expect(DOCS.filter(doc => doc.section === 'Server Rendering').map(doc => doc.slug)).toEqual(['server-rendering']);
  expect(findDoc('/docs/ssr-request')?.slug).toBe('server-rendering');
  expect(findDoc('/docs/ssr-file-reference')?.slug).toBe('server-rendering');
});

describe('DocLoaderService public Markdown', () => {
  it('propagates a failed fetch instead of returning empty Markdown', async () => {
    fetchDocument.mockRejectedValue(new Error('Network unavailable'));

    await expect(new DocLoaderService().loadDoc('router')).rejects.toThrow();
  });

  it.each([
    ['loadDoc', 'server-rendering', '/docs/server-rendering.md'],
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
