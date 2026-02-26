import {AfterInit, ApplicationEventService, BaseElement, Component, Param, Property, State, String, WindowListener} from "@ayu-sh-kr/dota-core";
import {DocLoaderService} from "@dota/service/doc-loader.service.ts";
import {WithLoading} from "@dota/utils/DecoratorUtils.ts";
import {MarkdownService} from "@dota/service/markdown.service.ts";
import {type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-event";
import type {ColorName, ThemeName} from "@ayu-sh-kr/dota-md";

@Component({
  selector: 'doc-content',
  shadow: false
})
export class DocContentComponent extends BaseElement {

  @Param('content')
  filePath: string = 'Getting-Started.md';

  @Property({name: 'theme', type: String})
  theme: ThemeName = 'flat';

  @Property({name: 'color', type: String})
  color: ColorName = 'indigo';

  @Property({name: 'max-width', type: String})
  maxWidth: string = 'max-w-4xl';

  docLoaderService: DocLoaderService;

  @State()
  content: string = '';

  constructor() {
    super();
    this.docLoaderService = new DocLoaderService();
  }

  private scrollToAnchor() {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
        else     window.scrollTo({top: 0, behavior: 'smooth'});
      });
    } else {
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  }

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
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({ name: 'docs:toc-update', data: { toc: result.toc } });
    this.scrollToAnchor();
  }

  @OnEvent('docs:theme-change')
  onThemeChange(event: ApplicationEvent<'docs:theme-change'>) {
    const t = event?.data?.theme;
    if (t) this.theme = t as ThemeName;
  }

  @OnEvent('docs:color-change')
  onColorChange(event: ApplicationEvent<'docs:color-change'>) {
    const c = event?.data?.color;
    if (c) this.color = c as ColorName;
  }

  render(): string {
    return `
      <markdown-view
        theme="${this.theme}"
        color="${this.color}"
        max-width="${this.maxWidth ?? 'max-w-4xl'}">
        ${this.content}
      </markdown-view>
    `;
  }

}