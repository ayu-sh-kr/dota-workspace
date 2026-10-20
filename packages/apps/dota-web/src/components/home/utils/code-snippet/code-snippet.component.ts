import {BaseElement, BindEvent, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, trustedHTML, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {MDService} from "@dota/configs/markdown.config.ts";
import {notificationService} from "@dota/main.ts";

@Component({
  selector: 'code-snippet',
  shadow: false
})
export class CodeSnippetComponent extends BaseElement {

  /** Displayed in the title bar */
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

            <!-- Title bar -->
            <div class="code-toolbar flex items-center justify-between px-4 py-3">

                <div class="flex items-center gap-2" aria-hidden="true">
                    <span class="w-2.5 h-2.5 rounded-full bg-code-danger"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-code-warning"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-code-success"></span>
                    <span class="ml-2 text-xs text-code-muted font-mono">${this.filename}</span>
                </div>

                <button id="copy-btn"
                        class="button-link button-compact button-code"
                        aria-label="Copy code to clipboard"
                        title="Copy to clipboard">
                    <dota-icon name="material-symbols:content-copy-rounded"
                               classname="text-code-accent" variant="ghost" size="sm">
                    </dota-icon>
                    <span>Copy</span>
                </button>
            </div>

            <div id="snippet-body"
                 class="overflow-x-auto custom-scrollbar type-code select-text"
                 aria-label="Code snippet: ${this.filename}">
                ${trustedHTML(MDService.renderHtml(`\`\`\`${this.language}\n${this.code}\n\`\`\``))}
            </div>

        </div>
    `;
  }
}
