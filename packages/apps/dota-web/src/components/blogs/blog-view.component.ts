import {BaseElement, Component, Param, Property, String} from "@ayu-sh-kr/dota-core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {MarkdownService} from "@dota/service/markdown.service.ts";
import {MDService, type ColorName} from "@ayu-sh-kr/dota-md";
import { OnEvent } from "@ayu-sh-kr/dota-event";

@Component({
  selector: "blog-view",
  shadow: false
})
export class BlogViewComponent extends BaseElement {

  docLoader!: DocLoaderService;

  /** Theme passed through to <markdown-view>. Default: 'purple'. */
  @Property({name: 'theme', type: String})
  theme: ColorName = 'purple';

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

  @OnEvent('connected', true)
  async afterViewInit() {
    if (this.blog && this.category) {
      const raw = await this.docLoader.loadBlog(`${this.category.toLowerCase()}/${this.blog}`);
      MDService.render(raw, { publish: true })
      this.content = MarkdownService.renderMarkdown(raw);
    }
  }

  render() {
    // language=html
    return `
      <md-view theme="apple" color="purple"></md-view>
    `;
  }
}