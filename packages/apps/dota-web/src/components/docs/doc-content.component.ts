import {AfterInit, BaseElement, Component, Param, Property, String, WindowListener} from "@ayu-sh-kr/dota-core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {WithLoading} from "@dota/utils/DecoratorUtils.ts";
import {MDService} from "@ayu-sh-kr/dota-md";

@Component({
  selector: 'doc-content',
  shadow: false
})
export class DocContentComponent extends BaseElement {

  @Param('content')
  filePath: string = 'Getting-Started.md';

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
   * Load the markdown file, render via MDService and publish as md:render.
   * <md-view> listens to md:render / md:theme-change / md:color-change directly
   * and manages its own content + styling — doc-content never needs to track
   * or forward theme/color.
   */
  @AfterInit()
  @WithLoading()
  async afterViewInit() {
    const path = (this.filePath ?? 'Getting-Started.md').replace('/', '');
    const raw  = await this.docLoaderService.loadDoc(path);
    MDService.render(raw, { publish: true });
    this.scrollToAnchor();
  }

  render(): string {
    return `<md-view></md-view>`;
  }

}