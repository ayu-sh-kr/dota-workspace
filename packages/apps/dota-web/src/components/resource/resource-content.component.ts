import {AfterInit, BaseElement, Component, Property, String, Watcher} from "@ayu-sh-kr/dota-wrap/core";
import {html, trustedHTML, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {MDService} from "@dota/configs/markdown.config.ts";
import {SITE_MARKDOWN_COLOR, SITE_MARKDOWN_THEME} from "@dota/configs/markdown-theme.config.ts";
import {applyMarkdownTheme, resolveTheme} from "@ayu-sh-kr/dota-md";

@Component({
  selector: "resource-content",
  shadow: false
})
export class ResourceContentComponent extends BaseElement {

  @Property({
    name: 'resource-path',
    type: String,
  })
  resourcePath!: string;

  docService: DocLoaderService;
  content!: string;

  constructor() {
    super();
    this.docService = new DocLoaderService();
  }

  @AfterInit()
  async afterViewInit() {
    await this.updateContent()
  }

  @Watcher('resourcePath')
  async updateContent() {
    const content = await this.docService.loadResource(this.resourcePath);
    this.content = applyMarkdownTheme(MDService.renderHtml(content), resolveTheme(SITE_MARKDOWN_THEME), SITE_MARKDOWN_COLOR);
    this.updateHTML();
  }

  render(): TemplateResult {
    return html`
      <article class="min-w-0 max-w-[var(--layout-reading-max)]">
        ${trustedHTML(this.content ?? '')}
      </article>
    `
  }
}