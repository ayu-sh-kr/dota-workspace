import {AfterInit, BaseElement, BindEvent, Component, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {MDService} from "@ayu-sh-kr/dota-md";
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

  /** Raw code read from inner text content — used for copy and rendering */
  private readonly rawCode: string = '';

  constructor() {
    super();
    // Read code from text content,
    // then dedent so template indentation doesn't appear in the rendered output.
    this.rawCode = CodeSnippetComponent.dedent(this.textContent ?? '');
  }

  /**
   * Strips the common leading whitespace from all non-empty lines so that
   * indented template literals render without extra left padding.
   */
  private static dedent(text: string): string {
    const lines = text.split('\n');
    const indent = lines
      .filter(l => l.trim().length > 0)
      .reduce((min, l) => {
        const leading = l.match(/^(\s*)/)?.[1].length ?? 0;
        return Math.min(min, leading);
      }, Infinity);
    return lines
      .map(l => l.slice(indent === Infinity ? 0 : indent))
      .join('\n')
      .trim();
  }

  @AfterInit()
  afterViewInit() {
    const container = this.querySelector('#snippet-body');
    if (!container || !this.rawCode) return;

    const md = `\`\`\`${this.language}\n${this.rawCode}\n\`\`\``;
    container.innerHTML = MDService.renderHtml(md);
  }

  @BindEvent({event: 'click', id: '#copy-btn'})
  copyCode() {
    navigator.clipboard.writeText(this.rawCode).then(() => {
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

            <!-- Code body: populated by MDService in afterViewInit -->
            <div id="snippet-body"
                 class="overflow-x-auto custom-scrollbar type-code select-text"
                 aria-label="Code snippet: ${this.filename}">
            </div>

        </div>
    `;
  }
}
