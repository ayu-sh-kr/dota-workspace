import {AfterInit, BaseElement, Component, Property, String, Watcher} from "@ayu-sh-kr/dota-wrap/core";
import {html, trustedHTML, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {MDService} from "@dota/configs/markdown.config.ts";

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
    this.content = MDService.renderHtml(content);
    this.updateHTML();
  }

  render(): TemplateResult {
    return html`
      <article class="prose dark:prose-invert text-lg font-medium">
        ${trustedHTML(this.content ?? '')}
      </article>
    `
  }
}