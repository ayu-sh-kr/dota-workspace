import {AfterInit, BaseElement, BindEvent, Component, HTML, Property, String} from "@ayu-sh-kr/dota-core";
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
    // Read code from text content, same pattern as MarkdownViewComponent
    this.rawCode = this.textContent?.trim() ?? '';
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

  render(): string {
    return HTML`
        <div class="rounded-xl border border-gray-700/40 bg-gray-950 shadow-2xl w-full min-w-0" style="overflow:hidden">

            <!-- Title bar -->
            <div class="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800/60">

                <div class="flex items-center gap-2" aria-hidden="true">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-yellow-400/70"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-green-500/70"></span>
                    <span class="ml-2 text-xs text-gray-500 font-mono">${this.filename}</span>
                </div>

                <button id="copy-btn"
                        class="flex items-center gap-1 text-xs text-gray-500
                               hover:text-purple-400 transition-colors duration-200
                               cursor-pointer active:scale-95
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-purple-500 rounded"
                        aria-label="Copy code to clipboard"
                        title="Copy to clipboard">
                    <dota-icon name="material-symbols:content-copy-rounded"
                               color="purple" variant="ghost" size="sm">
                    </dota-icon>
                    <span>Copy</span>
                </button>
            </div>

            <!-- Code body: populated by MDService in afterViewInit -->
            <div id="snippet-body"
                 class="overflow-x-auto custom-scrollbar text-[13px] leading-7 select-text"
                 aria-label="Code snippet: ${this.filename}">
            </div>

        </div>
    `;
  }
}