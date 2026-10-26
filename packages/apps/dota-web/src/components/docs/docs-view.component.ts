import {BaseElement, Component, DocumentListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {html, nothing, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {MDService} from "@dota/configs/markdown.config.ts";
import {SITE_MARKDOWN_COLOR, SITE_MARKDOWN_THEME} from "@dota/configs/markdown-theme.config.ts";
import {DOCS, docUrl, type DocEntry} from "@dota/configs/docs.config.ts";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";

/** Sidebar navigation grouped by section, in reading order. */
const NAV_SECTIONS = [...new Set(DOCS.map(doc => doc.section))]
  .map(section => ({section, docs: DOCS.filter(doc => doc.section === section)}));

/**
 * Renders one documentation page, including its header, navigation, Markdown article,
 * table of contents, appearance controls, and previous/next links.
 *
 * `slug` selects the page from `DOCS`. On connection, the component loads Markdown only when the
 * page was not already prerendered into `<md-view>`. Keeping `<md-view>` and `<md-toc>` in the
 * unconditional template lets hydration reuse those elements; the skeleton is shown only until
 * the article has content. Theme and accent are owned by `<docs-theme-picker>` and
 * `<docs-accent-picker>`, which drive both views through `md:theme-change` and `md:color-change`.
 *
 * Selector: `docs-view`.
 */
@Component({
  selector: 'docs-view',
  shadow: false
})
export class DocsViewComponent extends BaseElement {

  /**
   * URL slug of the documentation page to display. The value is matched against `DOCS`;
   * an empty or unknown slug leaves the article area in its not-found state.
   * This is the `slug` HTML attribute and is supplied by the docs route.
   */
  @Property({name: 'slug', type: String})
  slug: string = '';

  private readonly loader = new DocLoaderService();

  constructor() {
    super();
  }

  /**
   * Fills the Markdown view.
   * A prerendered article is detected by its existing content and is deliberately not fetched
   * again, avoiding duplicate work during hydration. Client-side navigation has no content,
   * so it loads the selected document and asks `MDService` to render it into `<md-view>`.
   */
  @OnEvent('connected', true)
  async loadDoc(): Promise<void> {
    const doc = this.doc;
    if (!doc || this.querySelector('[data-md-content] > *')) return;
    MDService.render(await this.loader.loadDoc(doc.slug), {publish: true});
  }

  /**
   * Closes the floating document list when the reader clicks elsewhere.
   * @param event Document click used to identify clicks outside the menu.
   */
  @DocumentListener({event: 'click'})
  closeMobileNavOnOutsideClick(event: Event): void {
    const menu = this.querySelector<HTMLDetailsElement>('[data-mobile-doc-nav]');
    if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
  }

  /**
   * Closes the document list on Escape and returns focus to its trigger.
   * @param event Document key press while the menu may be open.
   */
  @DocumentListener({event: 'keydown'})
  closeMobileNavOnEscape(event: KeyboardEvent): void {
    const menu = this.querySelector<HTMLDetailsElement>('[data-mobile-doc-nav]');
    if (event.key !== 'Escape' || !menu?.open) return;
    menu.open = false;
    menu.querySelector('summary')?.focus();
  }

  private get doc(): DocEntry | undefined {
    return DOCS.find(doc => doc.slug === this.slug);
  }

  /** Builds the grouped sidebar links and marks the current slug as the active page. */
  private renderNav(): TemplateResult {
    return html`
      <nav aria-label="Documentation" class="type-compact space-y-6">
        ${NAV_SECTIONS.map(({section, docs}) => html`
          <div>
            <p class="type-eyebrow mb-2 px-3 text-muted">${section}</p>
            <ul class="space-y-0.5 border-l border-default">
              ${docs.map(doc => html`
                <li>
                  <a href="${docUrl(doc.slug)}" aria-current="${doc.slug === this.slug ? 'page' : 'false'}"
                     class="${doc.slug === this.slug
                       ? '-ml-px block border-l-2 border-primary py-1.5 pl-3 font-medium text-primary'
                       : '-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-muted hover:border-strong hover:text-foreground'}">
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

  /**
   * Builds the loading placeholder for client-side document loads.
   * CSS hides it as soon as `<md-view>` contains an article, so the same template works for
   * prerendered pages (hidden immediately) and client navigation (visible while loading).
   */
  private renderSkeleton(): TemplateResult {
    return html`
      <div role="status" aria-label="Loading documentation"
           class="animate-pulse space-y-4 group-has-[[data-md-content]>*]/article:hidden [&>div]:rounded-control [&>div]:bg-raised">
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

  /** Renders the fallback shown when `slug` does not identify an entry in `DOCS`. */
  private renderNotFound(): TemplateResult {
    return html`
      <h1 class="type-section text-foreground">Page not found</h1>
      <p class="mt-3 text-muted">This documentation page does not exist.
        <a class="button-link" href="${docUrl(DOCS[0].slug)}">Start with ${DOCS[0].title}</a></p>
    `;
  }

  /**
   * Builds links to the adjacent entries in `DOCS`'s reading order.
   * Missing neighbors become empty grid cells so the first and last pages keep the same
   * two-column layout without exposing a link to a nonexistent document.
   * @param doc The currently selected documentation entry.
   */
  private renderPager(doc: DocEntry): TemplateResult {
    const index = DOCS.indexOf(doc);
    const card = 'surface-card surface-card-link flex flex-col gap-1 p-4';
    const link = (target: DocEntry | undefined, label: string, align: string) => target
      ? html`<a href="${docUrl(target.slug)}" class="${card} ${align}">
               <span class="type-meta text-muted">${label}</span>
               <span class="font-medium text-foreground">${target.title}</span>
             </a>`
      : html`<span></span>`;
    return html`
      <nav aria-label="Previous and next page" class="mt-12 grid gap-4 border-t border-default pt-8 sm:grid-cols-2">
        ${link(DOCS[index - 1], 'Previous', '')}
        ${link(DOCS[index + 1], 'Next', 'sm:text-right')}
      </nav>
    `;
  }

  /**
   * Composes the stable page shell and selects the article or not-found state.
   * The server and the client's first render produce the same template (no loading state),
   * so hydration adopts `<md-view>` and `<md-toc>` with their prerendered content. Both stay
   * in the top-level template; only surrounding navigation and fallback fragments vary.
   */
  render(): TemplateResult {
    const doc = this.doc;
    return html`
      <div class="min-h-screen bg-background text-foreground">
        <header class="sticky top-0 z-40 border-b border-default bg-[var(--glass-color)] backdrop-blur">
          <div class="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 lg:px-6">
            <div class="type-compact flex min-w-0 items-center gap-2">
              <a href="/" class="type-brand inline-flex items-center gap-1 text-lg text-foreground hover:text-primary">
                <span class="app-header-symbol" aria-hidden="true"></span>Dota
              </a>
              <span class="hidden text-muted sm:inline">/</span>
              <a href="${docUrl(DOCS[0].slug)}" class="hidden font-medium text-muted hover:text-foreground sm:inline">Docs</a>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <docs-theme-picker></docs-theme-picker>
              <docs-accent-picker></docs-accent-picker>
              <dark-mode-button></dark-mode-button>
              <github-button></github-button>
            </div>
          </div>
        </header>

        <div class="mx-auto grid max-w-screen-2xl lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_14rem]">
          <aside class="no-scrollbar sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-default px-4 py-8 lg:block" tabindex="0" aria-label="Documentation navigation">
            ${this.renderNav()}
          </aside>

          <main class="min-w-0 px-4 py-8 sm:px-8 lg:px-12">
            <div class="mx-auto mb-6 max-w-3xl lg:hidden">
              <details data-mobile-doc-nav class="group relative w-fit max-w-full">
                <summary class="button-secondary button-compact list-none select-none group-open:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
                         aria-label="Browse documentation pages">
                  <svg class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                    <path d="M4 5h12M4 10h12M4 15h8"/>
                  </svg>
                  Browse docs
                  <svg class="size-4 text-muted transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"/>
                  </svg>
                </summary>
                <div class="absolute left-0 top-full z-30 mt-2 max-h-[70dvh] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-card border border-default bg-surface p-4 shadow-lift sm:w-96">
                  ${this.renderNav()}
                </div>
              </details>
            </div>

            <article class="group/article mx-auto max-w-3xl">
              ${doc ? html`
                <p class="type-eyebrow mb-3">${doc.section}</p>
                ${this.renderSkeleton()}` : this.renderNotFound()}
              <md-view theme="${SITE_MARKDOWN_THEME}" color="${SITE_MARKDOWN_COLOR}" content-class="w-full"></md-view>
              ${doc ? this.renderPager(doc) : nothing}
            </article>
          </main>

          <md-toc header-height="72" theme="${SITE_MARKDOWN_THEME}" color="${SITE_MARKDOWN_COLOR}"
                  container-class="no-scrollbar sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto py-4 xl:flex xl:flex-col"></md-toc>
        </div>
      </div>
    `;
  }
}
