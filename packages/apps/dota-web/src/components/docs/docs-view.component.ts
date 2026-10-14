import {ApplicationEventService, BaseElement, BindEvent, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {html, nothing, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {MDService, THEMES} from "@ayu-sh-kr/dota-md";
import {DOCS, docUrl, type DocEntry} from "@dota/configs/docs.config.ts";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";

/** Accent colors offered by the appearance menu; each is a color key of every built-in theme. */
const ACCENTS = ['indigo', 'violet', 'purple', 'blue', 'sky', 'teal', 'emerald', 'lime', 'amber', 'orange', 'rose', 'slate'];

/** Sidebar navigation grouped by section, in reading order. */
const NAV_SECTIONS = [...new Set(DOCS.map(doc => doc.section))]
  .map(section => ({section, docs: DOCS.filter(doc => doc.section === section)}));

/**
 * Documentation reader: top bar, section navigation, the Markdown article, its table of
 * contents, and previous/next links, all for the page named by `slug`.
 *
 * SSG first: during prerender the Markdown is fetched and rendered into `<md-view>`, so a
 * prerendered page arrives complete and is never fetched again. The article skeleton is
 * hidden by CSS whenever `<md-view>` holds content, so it only shows while client navigation
 * loads a page; the template never changes, which keeps hydration and `<md-view>` stable.
 * Appearance (theme and accent) is stored per browser and applied through the
 * `md:theme-change` / `md:color-change` events that `<md-view>` and `<md-toc>` follow.
 *
 * Selector: `docs-view`.
 */
@Component({
  selector: 'docs-view',
  shadow: false
})
export class DocsViewComponent extends BaseElement {

  /** Slug of the page to show; an unknown slug renders a not-found message. Attribute `slug`. */
  @Property({name: 'slug', type: String})
  slug: string = '';

  private readonly loader = new DocLoaderService();

  constructor() {
    super();
  }

  /** Applies the saved appearance, then loads the Markdown unless the page was prerendered. */
  @OnEvent('connected', true)
  async loadDoc(): Promise<void> {
    this.restoreAppearance();
    const doc = this.doc;
    if (!doc || this.querySelector('[data-md-content] > *')) return;
    MDService.render(await this.loader.loadDoc(doc.slug), {publish: true});
  }

  /** Stores and broadcasts a theme or accent picked in the appearance menu. */
  @BindEvent({event: 'change', id: '[data-appearance]'})
  changeAppearance(event: Event): void {
    const {name, value} = event.target as HTMLSelectElement;
    LocalStorageService.add(`docs-${name}`, value);
    this.publishAppearance(name, value);
  }

  private get doc(): DocEntry | undefined {
    return DOCS.find(doc => doc.slug === this.slug);
  }

  /** Reapplies the stored theme and accent; the prerendered page uses the defaults. */
  private restoreAppearance(): void {
    this.querySelectorAll<HTMLSelectElement>('[data-appearance]').forEach(select => {
      const saved = LocalStorageService.get(`docs-${select.name}`);
      if (!saved || ![...select.options].some(option => option.value === saved)) return;
      select.value = saved;
      this.publishAppearance(select.name, saved);
    });
  }

  private publishAppearance(name: string, value: string): void {
    const publisher = ApplicationEventService.getInstance().getPublisher();
    if (name === 'theme') void publisher.publishAsync({name: 'md:theme-change', data: {theme: value}});
    else void publisher.publishAsync({name: 'md:color-change', data: {color: value}});
  }

  private renderNav(): TemplateResult {
    return html`
      <nav aria-label="Documentation" class="space-y-6 text-sm">
        ${NAV_SECTIONS.map(({section, docs}) => html`
          <div>
            <p class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">${section}</p>
            <ul class="space-y-0.5 border-l border-gray-200 dark:border-gray-800">
              ${docs.map(doc => html`
                <li>
                  <a href="${docUrl(doc.slug)}" aria-current="${doc.slug === this.slug ? 'page' : 'false'}"
                     class="${doc.slug === this.slug
                       ? '-ml-px block border-l-2 border-indigo-500 py-1.5 pl-3 font-medium text-indigo-600 dark:text-indigo-400'
                       : '-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}">
                    ${doc.title}
                  </a>
                </li>
              `)}
            </ul>
          </div>
        `)}
      </nav>
    `;
  }

  private renderAppearance(): TemplateResult {
    const select = 'h-8 rounded-md border border-gray-200 bg-white px-2 text-xs capitalize text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';
    return html`
      <label class="sr-only" for="docs-theme">Theme</label>
      <select id="docs-theme" name="theme" data-appearance class="${select}">
        ${Object.keys(THEMES).map(theme => html`<option value="${theme}">${theme}</option>`)}
      </select>
      <label class="sr-only" for="docs-color">Accent</label>
      <select id="docs-color" name="color" data-appearance class="${select}">
        ${ACCENTS.map(color => html`<option value="${color}">${color}</option>`)}
      </select>
    `;
  }

  /**
   * Placeholder for the article, hidden (`group-has-…:hidden`) as soon as `<md-view>`
   * holds content: always for prerendered pages, after loading for client navigation.
   */
  private renderSkeleton(): TemplateResult {
    return html`
      <div role="status" aria-label="Loading documentation"
           class="animate-pulse space-y-4 group-has-[[data-md-content]>*]/article:hidden [&>div]:rounded [&>div]:bg-gray-200 dark:[&>div]:bg-gray-800">
        <div class="h-9 w-2/3"></div>
        <div class="h-4 w-full"></div>
        <div class="h-4 w-11/12"></div>
        <div class="h-4 w-4/5"></div>
        <div class="h-40 w-full"></div>
        <div class="h-4 w-full"></div>
        <div class="h-4 w-3/4"></div>
      </div>
    `;
  }

  private renderNotFound(): TemplateResult {
    return html`
      <h1 class="text-3xl font-bold">Page not found</h1>
      <p class="mt-3 text-gray-600 dark:text-gray-400">This documentation page does not exist.
        <a class="text-indigo-600 underline dark:text-indigo-400" href="${docUrl(DOCS[0].slug)}">Start with ${DOCS[0].title}</a>.</p>
    `;
  }

  private renderPager(doc: DocEntry): TemplateResult {
    const index = DOCS.indexOf(doc);
    const card = 'flex flex-col gap-1 rounded-xl border border-gray-200 p-4 transition-colors hover:border-indigo-400 dark:border-gray-800 dark:hover:border-indigo-500';
    const link = (target: DocEntry | undefined, label: string, align: string) => target
      ? html`<a href="${docUrl(target.slug)}" class="${card} ${align}">
               <span class="text-xs text-gray-500 dark:text-gray-400">${label}</span>
               <span class="font-medium text-gray-900 dark:text-gray-100">${target.title}</span>
             </a>`
      : html`<span></span>`;
    return html`
      <nav aria-label="Previous and next page" class="mt-12 grid gap-4 border-t border-gray-200 pt-8 sm:grid-cols-2 dark:border-gray-800">
        ${link(DOCS[index - 1], 'Previous', '')}
        ${link(DOCS[index + 1], 'Next', 'sm:text-right')}
      </nav>
    `;
  }

  /**
   * `<md-view>` and `<md-toc>` stay in the top-level template so hydration adopts their
   * prerendered content; conditional sub-templates are recreated on hydration.
   */
  render(): TemplateResult {
    const doc = this.doc;
    return html`
      <div class="min-h-screen bg-white font-dm text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <header class="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
          <div class="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 lg:px-6">
            <div class="flex min-w-0 items-center gap-2 text-sm">
              <a href="/" class="text-lg font-extrabold">Dota</a>
              <span class="text-gray-300 dark:text-gray-600">/</span>
              <a href="${docUrl(DOCS[0].slug)}" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">Docs</a>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              ${this.renderAppearance()}
              <dark-mode-button color="indigo"></dark-mode-button>
              <github-button></github-button>
            </div>
          </div>
        </header>

        <div class="mx-auto grid max-w-screen-2xl lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_14rem]">
          <aside class="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-200 px-4 py-8 lg:block dark:border-gray-800">
            ${this.renderNav()}
          </aside>

          <main class="min-w-0 px-4 py-8 sm:px-8 lg:px-12">
            <details class="mb-6 rounded-lg border border-gray-200 lg:hidden dark:border-gray-800">
              <summary class="cursor-pointer px-4 py-2.5 text-sm font-medium">${doc?.section ?? 'Docs'} · ${doc?.title ?? 'Menu'}</summary>
              <div class="border-t border-gray-200 px-2 py-4 dark:border-gray-800">${this.renderNav()}</div>
            </details>

            <article class="group/article mx-auto max-w-3xl">
              ${doc ? html`
                <p class="mb-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">${doc.section}</p>
                ${this.renderSkeleton()}` : this.renderNotFound()}
              <md-view theme="flat" color="indigo" content-class="w-full antialiased text-[15px] sm:text-base leading-7"></md-view>
              ${doc ? this.renderPager(doc) : nothing}
            </article>
          </main>

          <md-toc header-height="72" color="indigo"
                  container-class="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto py-4 xl:flex xl:flex-col"></md-toc>
        </div>
      </div>
    `;
  }
}
