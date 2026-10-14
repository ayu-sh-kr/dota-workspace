import {AfterInit, BaseElement, Component, Property, String, WindowListener} from "@ayu-sh-kr/dota-wrap/core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {WithLoading} from "@dota/utils/DecoratorUtils.ts";
import {MDService} from "@ayu-sh-kr/dota-md";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {resolveDocFile} from "@dota/utils/doc-route.utils.ts";

@Component({
  selector: 'doc-content',
  shadow: false
})
export class DocContentComponent extends BaseElement {

  @Property({name: 'max-width', type: String})
  maxWidth: string = 'max-w-4xl';

  private docLoaderService: DocLoaderService;

  constructor() {
    super();
    this.docLoaderService = new DocLoaderService();
  }

  /** Height of the sticky header in px — matches `h-14` (3.5 rem = 56 px) + a small buffer. */
  private static readonly HEADER_HEIGHT = 64;

  private static scrollBelowHeader(el: HTMLElement): void {
    const top = el.getBoundingClientRect().top + window.scrollY
      - DocContentComponent.HEADER_HEIGHT - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  private scrollToAnchor() {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) DocContentComponent.scrollBelowHeader(el);
        else    window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  @WindowListener({ event: 'hashchange' })
  onHashChange() {
    const hash = window.location.hash;
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) DocContentComponent.scrollBelowHeader(el);
    }
  }

  /**
   * Load the Markdown file, render via MDService, and publish as md:render.
   * <md-view> and <md-toc> listen to md:render / md:theme-change / md:color-change
   * directly — doc-content never tracks or forwards theme/color. A prerendered
   * page already holds the rendered document, which <md-view> and <md-toc> adopt,
   * so it is not fetched again.
   */
  @AfterInit()
  async afterViewInit() {
    if (!this.querySelector('[data-md-content]')?.textContent?.trim()) await this.loadDoc();
    this.scrollToAnchor();
  }

  /** Fetches the active document and publishes its render result. */
  @WithLoading()
  private async loadDoc() {
    const raw = await this.docLoaderService.loadDoc(resolveDocFile(window.location.pathname, window.location.search));
    MDService.render(raw, { publish: true });
  }

  render(): TemplateResult {
    return html`<md-view></md-view>`;
  }

}
