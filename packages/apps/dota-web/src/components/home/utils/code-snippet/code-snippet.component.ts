import {BaseElement, BindEvent, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, trustedHTML, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {MDService} from "@dota/configs/markdown.config.ts";
import {notificationService} from "@dota/main.ts";
import {codeHeader} from "@dota/components/home/utils/code-snippet/code-header.ts";

@Component({
  selector: 'code-snippet',
  shadow: false
})
export class CodeSnippetComponent extends BaseElement {

  /** File name shown in the panel header. */
  @Property({name: 'filename', type: String})
  filename: string = 'component.ts';

  /** Language for the markdown fence → highlight.js */
  @Property({name: 'language', type: String})
  language: string = 'typescript';

  /** Source shown in the panel and copied by the copy button. */
  @Property({name: 'code', type: String})
  code: string = '';

  constructor() {
    super();
  }

  @BindEvent({event: 'click', id: '#copy-btn'})
  copyCode() {
    navigator.clipboard.writeText(this.code).then(() => {
      notificationService.info({
        duration: 3000,
        message: 'Code copied to clipboard',
        title: 'Copied'
      });
    });
  }

  render(): TemplateResult {
    return html`
        <div class="code-panel w-full min-w-0">

            ${codeHeader(this.filename, {copy: 'copy-btn'})}

            <div id="snippet-body"
                 class="code-body custom-scrollbar select-text"
                 aria-label="Code snippet: ${this.filename}">
                ${trustedHTML(MDService.renderHtml(`\`\`\`${this.language}\n${this.code}\n\`\`\``))}
            </div>

        </div>
    `;
  }
}
