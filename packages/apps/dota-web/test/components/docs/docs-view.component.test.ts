import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ApplicationEventService} from '@ayu-sh-kr/dota-wrap/core';
import {MDService, MdViewComponent} from '@ayu-sh-kr/dota-md';
import {LocalStorageService} from '@dota/service/local-storage.service.ts';

const loadDoc = vi.fn(async (slug: string) => `# ${slug}\n\nBody`);
vi.mock('@dota/service/doc-loader.service.ts', () => ({DocLoaderService: class { loadDoc = loadDoc; }}));

const {DocsViewComponent} = await import('@dota/components/docs/docs-view.component.ts');
if (!customElements.get('docs-view')) customElements.define('docs-view', DocsViewComponent);
if (!customElements.get('md-view')) customElements.define('md-view', MdViewComponent);

/** Parses markup off-document, then connects it and waits for Dota's asynchronous init. */
const mount = async (markup: string) => {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  await new Promise(resolve => setTimeout(resolve));
  return host.querySelector('docs-view') as InstanceType<typeof DocsViewComponent>;
};

beforeEach(() => {
  vi.spyOn(LocalStorageService, 'get').mockReturnValue(null);
  vi.spyOn(LocalStorageService, 'add').mockImplementation(() => undefined);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  loadDoc.mockClear();
});

describe('DocsViewComponent', () => {
  it('marks the current page in the navigation and links its neighbours', async () => {
    const view = await mount('<docs-view slug="guides"></docs-view>');

    expect(view.querySelector('aside [aria-current="page"]')?.getAttribute('href')).toBe('/docs/guides');
    const pager = [...view.querySelectorAll<HTMLAnchorElement>('[aria-label="Previous and next page"] a')];
    expect(pager.map(link => link.getAttribute('href'))).toEqual(['/docs/getting-started', '/docs/component-registration']);
  });

  it('shows the skeleton and loads the Markdown when the page was not prerendered', async () => {
    const render = vi.spyOn(MDService, 'render');
    const view = await mount('<docs-view slug="router"></docs-view>');

    expect(view.querySelector('article .animate-pulse')).not.toBeNull();
    expect(loadDoc).toHaveBeenCalledWith('router');
    expect(render).toHaveBeenCalledWith('# router\n\nBody', {publish: true});
  });

  it('does not fetch a page whose md-view already holds content', async () => {
    const view = await mount('<docs-view slug="router"></docs-view>');
    loadDoc.mockClear();
    view.querySelector('[data-md-content]')!.innerHTML = '<h1>Router</h1>';

    await view.loadDoc();

    expect(loadDoc).not.toHaveBeenCalled();
  });

  it('stores and publishes a picked accent color', async () => {
    const publish = vi.fn();
    vi.spyOn(ApplicationEventService.getInstance(), 'getPublisher').mockReturnValue({publishAsync: publish} as never);
    const view = await mount('<docs-view slug="router"></docs-view>');
    const select = view.querySelector<HTMLSelectElement>('select[name="color"]')!;

    select.value = 'rose';
    select.dispatchEvent(new Event('change', {bubbles: true}));

    expect(LocalStorageService.add).toHaveBeenCalledWith('docs-color', 'rose');
    expect(publish).toHaveBeenCalledWith({name: 'md:color-change', data: {color: 'rose'}});
  });

  it('renders a not-found message for an unknown slug', async () => {
    const view = await mount('<docs-view slug="missing"></docs-view>');

    expect(view.querySelector('h1')?.textContent).toBe('Page not found');
    expect(view.querySelector('[data-md-content]')?.children).toHaveLength(0);
    expect(loadDoc).not.toHaveBeenCalled();
  });
});
