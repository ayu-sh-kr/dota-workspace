import {AfterInit, BaseElement, Component, Param, Property, String} from "@ayu-sh-kr/dota-core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {MarkdownService} from "@dota/service/markdown.service.ts";
import type {MarkdownTheme} from "@dota/configs/markdown.config.ts";

@Component({
  selector: "blog-view",
  shadow: false
})
export class BlogViewComponent extends BaseElement {

  docLoader!: DocLoaderService;

  /** Theme passed through to <markdown-view>. Default: 'purple'. */
  @Property({name: 'theme', type: String})
  theme: MarkdownTheme = 'purple';

  /** max-width passed through to <markdown-view>. Default: 'max-w-3xl'. */
  @Property({name: 'max-width', type: String})
  maxWidth: string = 'max-w-3xl';

  @Param('blog')
  blog!: string;

  @Param('category')
  category!: string;

  content: string = '';

  constructor() {
    super();
    this.docLoader = new DocLoaderService();
  }

  @AfterInit()
  async afterViewInit() {
    if (this.blog && this.category) {
      const raw = await this.docLoader.loadBlog(`${this.category.toLowerCase()}/${this.blog}`);
      this.content = MarkdownService.renderMarkdown(raw);
      this.setContent();
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  }

  /** Push content into the child markdown-view and trigger its re-render. */
  private setContent() {
    const view = this.querySelector('markdown-view') as any;
    if (view) {
      view.content = this.content;
      view.updateHTML();
    }
  }

  render() {
    // language=html
    return `
      <markdown-view theme="${this.theme}" max-width="${this.maxWidth}"></markdown-view>
    `;
  }
}