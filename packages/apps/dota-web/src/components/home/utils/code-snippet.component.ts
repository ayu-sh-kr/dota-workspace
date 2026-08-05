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
    // Read code from text content, same pattern as MarkdownViewComponent,
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
        <div class="rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_90px_-54px_rgba(15,23,42,0.95)]
                    dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_28px_90px_-52px_rgba(0,0,0,0.96)]
                    w-full min-w-0" style="overflow:hidden">

            <!-- Title bar -->
            <div class="flex items-center justify-between px-4 py-3 bg-white/[0.045] border-b border-white/10">

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
