import {AfterInit, BaseElement, Component, Param, Property, State, String} from "@ayu-sh-kr/dota-core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {WithLoading} from "@dota/utils/DecoratorUtils.ts";
import {MarkdownService} from "@dota/service/markdown.service.ts";

@Component({
  selector: 'doc-content',
  shadow: false
})
export class DocContentComponent extends BaseElement {

  @Param('content')
  filePath: string = 'Getting-Started.md';

  docLoaderService: DocLoaderService;
  content!: string;

  constructor() {
    super();
    this.docLoaderService = new DocLoaderService();
  }

  @AfterInit()
  @WithLoading()
  async afterViewInit() {
    const content = await this.docLoaderService.loadDoc(this.filePath.replace("/", ""));
    this.content = MarkdownService.renderMarkdown(content)
    this.updateHTML();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }



  render(): string {
    // language=html
    return `
      <article class="prose prose-purple dark:prose-invert max-w-7xl mx-auto">
        ${this.content || ''}
      </article>
    `;
  }

}