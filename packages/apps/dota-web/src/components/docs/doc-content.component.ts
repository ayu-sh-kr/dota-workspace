import {AfterInit, BaseElement, Component, Param, Property, String} from "@ayu-sh-kr/dota-core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {WithLoading} from "@dota/utils/DecoratorUtils.ts";
import {MarkdownService} from "@dota/service/markdown.service.ts";
import type {MarkdownTheme} from "@dota/configs/markdown.config.ts";

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
  content: string = '';

  constructor() {
    super();
    this.docLoaderService = new DocLoaderService();
  }

  @AfterInit()
  @WithLoading()
  async afterViewInit() {
    const raw = await this.docLoaderService.loadDoc(this.filePath.replace("/", ""));
    this.content = MarkdownService.renderMarkdown(raw);
    this.setContent();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  /** Push content into the child markdown-view and trigger its re-render. */
  private setContent() {
    const view = this.querySelector('markdown-view') as any;
    if (view) {
      view.content = this.content;
      view.updateHTML();
    }
  }

  render(): string {
    // language=html
    return `
      <markdown-view theme="${this.theme}" max-width="${this.maxWidth}"></markdown-view>
    `;
  }

}