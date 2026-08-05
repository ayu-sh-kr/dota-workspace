import { BaseElement, Component } from "@ayu-sh-kr/dota-wrap/core";
import { type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import { DOTA_TOOLS, DotaTool } from "@dota/components/home/utils/tools.config.ts";

/**
 * Renders the expanded detail panel for the currently selected tool.
 *
 * Subscribes to `tools:select` and updates its own DOM in-place
 * (fade out → swap content → fade in) without a full re-render.
 */
@Component({
  selector: 'tool-detail',
  shadow: false,
})
export class ToolDetailComponent extends BaseElement {

  private activeTool: DotaTool = DOTA_TOOLS[0];

  constructor() {
    super();
  }

  private tagChip(tag: string): TemplateResult {
    return html`<span class="px-3 py-1 rounded-full text-xs font-medium
                         bg-white/50 text-purple-600 dark:bg-white/[0.055] dark:text-purple-300
                         border border-purple-300/25 dark:border-purple-300/15 backdrop-blur-xl"
                  >${tag}</span>`;
  }

  private renderTags(tags: string[]): TemplateResult[] {
    return tags.map(t => this.tagChip(t));
  }

  @OnEvent('tools:select')
  onToolSelect(event: ApplicationEvent<'tools:select'>) {
    const tool = DOTA_TOOLS.find(t => t.id === event.data?.toolId);
    if (!tool || tool.id === this.activeTool.id) return;
    this.activeTool = tool;
    this.updateContent();
  }

  private updateContent() {
    const panel = this.querySelector<HTMLElement>('[data-detail-panel]');
    if (!panel) return;

    panel.classList.add('tab-content-exit');

    setTimeout(() => {
      this.updateHTML();
      const updatedPanel = this.querySelector<HTMLElement>('[data-detail-panel]');
      updatedPanel?.classList.remove('tab-content-exit');
      updatedPanel?.classList.add('tab-content-enter');
      setTimeout(() => updatedPanel?.classList.remove('tab-content-enter'), 250);
    }, 150);
  }

  render(): TemplateResult {
    const tool = this.activeTool;

    return html`
        <div data-detail-panel
             class="group flex min-h-0 flex-col gap-5 overflow-hidden rounded-2xl p-4 sm:min-h-[320px] sm:p-6 lg:p-8
                    border border-white/70 dark:border-white/10
                    bg-white/[0.58] dark:bg-white/[0.045] backdrop-blur-2xl
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_60px_-46px_rgba(15,23,42,0.88)]
                    dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_64px_-48px_rgba(0,0,0,0.92)]
                    hover:-translate-y-1 hover:border-purple-300/30 dark:hover:border-purple-300/20
                    hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_24px_74px_-50px_rgba(15,23,42,0.95)]
                    transition-all duration-300">

            <!-- Icon + package name -->
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0
                            bg-white/55 dark:bg-white/[0.055] border border-purple-300/25 dark:border-purple-300/15 backdrop-blur-xl">
                    <dota-icon data-detail-icon
                               name="${tool.icon}" color="purple" size="lg" variant="ghost">
                    </dota-icon>
                </div>
                <div class="pt-1 min-w-0">
                    <p class="text-xs font-semibold tracking-[0.18em] uppercase mb-1
                               text-purple-500 dark:text-purple-400">
                        Package
                    </p>
                    <h3 data-detail-name
                        class="text-base sm:text-2xl font-bold font-mono leading-none
                               text-gray-900 dark:text-gray-100 break-all">
                        ${tool.name}
                    </h3>
                </div>
            </div>

            <!-- Pull-quote tagline -->
            <p data-detail-tagline
               class="text-sm sm:text-base font-medium italic pl-4 leading-relaxed
                      border-l-2 border-purple-500/50
                      text-gray-700 dark:text-gray-300 break-words">
                "${tool.tagline}"
            </p>

            <!-- Description -->
            <p data-detail-desc
               class="text-sm leading-relaxed flex-1
                      text-gray-500 dark:text-gray-400 break-words overflow-hidden">
                ${tool.description}
            </p>

            <!-- Feature tags -->
            <div data-detail-tags
                 class="flex flex-wrap gap-2 pt-2
                        border-t border-slate-200/70 dark:border-white/10">
                ${this.renderTags(tool.tags)}
            </div>

        </div>
    `;
  }
}
