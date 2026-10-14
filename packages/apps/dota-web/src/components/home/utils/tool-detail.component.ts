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
    return html`<span class="px-3 py-1 rounded-full text-xs font-medium bg-surface text-primary border border-primary-border
            backdrop-blur-xl"
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
             class="group flex min-h-0 flex-col gap-5 overflow-hidden rounded-card p-4 sm:min-h-[320px] sm:p-6
                     lg:p-8 border border-default bg-surface backdrop-blur-2xl shadow-lift hover:-translate-y-1
                     hover:border-primary-border hover:shadow-lift transition-all duration-300">

            <!-- Icon + package name -->
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-code sm:rounded-2xl flex items-center justify-center
                        flex-shrink-0 bg-surface border border-primary-border backdrop-blur-xl">
                    <dota-icon data-detail-icon
                               name="${tool.icon}" color="purple" size="lg" variant="ghost">
                    </dota-icon>
                </div>
                <div class="pt-1 min-w-0">
                    <p class="text-xs font-semibold tracking-[0.18em] uppercase mb-1 text-primary">
                        Package
                    </p>
                    <h3 data-detail-name
                        class="text-base sm:text-2xl font-bold font-mono leading-none text-foreground break-all">
                        ${tool.name}
                    </h3>
                </div>
            </div>

            <!-- Pull-quote tagline -->
            <p data-detail-tagline
               class="text-sm sm:text-base font-medium italic pl-4 leading-relaxed border-l-2 border-primary-border
                       text-foreground break-words">
                "${tool.tagline}"
            </p>

            <!-- Description -->
            <p data-detail-desc
               class="text-sm leading-relaxed flex-1 text-muted break-words overflow-hidden">
                ${tool.description}
            </p>

            <!-- Feature tags -->
            <div data-detail-tags
                 class="flex flex-wrap gap-2 pt-2 border-t border-default">
                ${this.renderTags(tool.tags)}
            </div>

        </div>
    `;
  }
}
