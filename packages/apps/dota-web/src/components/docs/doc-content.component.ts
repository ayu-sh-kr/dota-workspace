import {AfterInit, ApplicationEventService, BaseElement, Component, Param, Property, State, String, WindowListener} from "@ayu-sh-kr/dota-core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {WithLoading} from "@dota/utils/DecoratorUtils.ts";
import {MarkdownService} from "@dota/service/markdown.service.ts";
import type {MarkdownTheme} from "@dota/configs/markdown.config.ts";
import {type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-event";

@Component({
  selector: 'doc-content',
  shadow: false
})
export class DocContentComponent extends BaseElement {

  @Param('content')
  filePath: string = 'Getting-Started.md';

  /** Theme passed straight through to <markdown-view>. Default: 'purple'. */
  @Property({name: 'theme', type: String})
  theme: MarkdownTheme = 'purple';

  /** max-width passed straight through to <markdown-view>. Default: 'max-w-4xl'. */
  @Property({name: 'max-width', type: String})
  maxWidth: string = 'max-w-4xl';

  docLoaderService: DocLoaderService;

  @State()
  content: string = '';

  constructor() {
    super();
    this.docLoaderService = new DocLoaderService();
  }

  /** Scroll to hash anchor in the URL, or to top if none. */
  private scrollToAnchor() {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.slice(1); // strip leading '#'
      // Use rAF to let the DOM settle after renderMarkdown
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({behavior: 'smooth', block: 'start'});
        } else {
          window.scrollTo({top: 0, behavior: 'smooth'});
        }
      });
    } else {
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  }

  /** Re-scroll when the URL hash changes (e.g. TOC click updates the hash). */
  @WindowListener({event: 'hashchange'})
  onHashChange() {
    const hash = window.location.hash;
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }

  @AfterInit()
  @WithLoading()
  async afterViewInit() {
    const path = (this.filePath ?? 'Getting-Started.md').replace('/', '');
    const raw = await this.docLoaderService.loadDoc(path);
    const result = MarkdownService.renderMarkdownWithToc(raw);
    this.content = result.html;
    // Notify the TOC component about the new headings
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({ name: 'docs:toc-update', data: { toc: result.toc } });
    this.scrollToAnchor();
  }

  @OnEvent('docs:theme-change')
  onThemeChaneg(event: ApplicationEvent<'docs:theme-change'>) {
    const data = event.data;
    if (data && data.theme) {
      this.theme = data.theme;
    }
  }

  render(): string {
    const theme    = this.theme    ?? 'purple';
    const maxWidth = this.maxWidth ?? 'max-w-4xl';
    // language=html
    return `
      <markdown-view theme="${theme}" max-width="${maxWidth}">
        ${this.content}
      </markdown-view>
    `;
  }

}