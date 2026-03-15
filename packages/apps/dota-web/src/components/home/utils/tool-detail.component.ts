import { BaseElement, Component, HTML } from "@ayu-sh-kr/dota-core";
import { type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-event";
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

  private tagChip(tag: string): string {
    return `<span class="px-3 py-1 rounded-full text-xs font-medium
                         bg-purple-500/10 text-purple-600 dark:text-purple-300
                         border border-purple-400/30 dark:border-purple-500/20"
                  >${tag}</span>`;
  }

  private renderTags(tags: string[]): string {
    return tags.map(t => this.tagChip(t)).join('');
  }

  @OnEvent('tools:select')
  onToolSelect(event: ApplicationEvent<'tools:select'>) {
    const tool = DOTA_TOOLS.find(t => t.id === event.data?.toolId);
    if (!tool || tool.id === this.activeTool.id) return;
    this.activeTool = tool;
    this.updateContent(tool);
  }

  private updateContent(tool: DotaTool) {
    const panel = this.querySelector<HTMLElement>('[data-detail-panel]');
    if (!panel) return;

    panel.classList.add('tab-content-exit');

    setTimeout(() => {
      const icon    = panel.querySelector<HTMLElement>('[data-detail-icon]');
      const name    = panel.querySelector<HTMLElement>('[data-detail-name]');
      const tagline = panel.querySelector<HTMLElement>('[data-detail-tagline]');
      const desc    = panel.querySelector<HTMLElement>('[data-detail-desc]');
      const tags    = panel.querySelector<HTMLElement>('[data-detail-tags]');

      if (icon)    icon.setAttribute('name', tool.icon);
      if (name)    name.textContent    = tool.name;
      if (tagline) tagline.textContent = `"${tool.tagline}"`;
      if (desc)    desc.textContent    = tool.description;
      if (tags)    tags.innerHTML      = this.renderTags(tool.tags);

      panel.classList.remove('tab-content-exit');
      panel.classList.add('tab-content-enter');
      setTimeout(() => panel.classList.remove('tab-content-enter'), 250);
    }, 150);
  }

  render(): string {
    const first = DOTA_TOOLS[0];

    return HTML`
        <div data-detail-panel
             class="rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5 min-h-0 sm:min-h-[320px]
                    border border-gray-200/80 dark:border-gray-700/40
                    bg-white/80 dark:bg-gray-950/60
                    shadow-sm dark:shadow-none overflow-hidden">

            <!-- Icon + package name -->
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0
                            bg-purple-500/10 border border-purple-400/30 dark:border-purple-500/20">
                    <dota-icon data-detail-icon
                               name="${first.icon}" color="purple" size="lg">
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
                        ${first.name}
                    </h3>
                </div>
            </div>

            <!-- Pull-quote tagline -->
            <p data-detail-tagline
               class="text-sm sm:text-base font-medium italic pl-4 leading-relaxed
                      border-l-2 border-purple-500/50
                      text-gray-700 dark:text-gray-300 break-words">
                "${first.tagline}"
            </p>

            <!-- Description -->
            <p data-detail-desc
               class="text-sm leading-relaxed flex-1
                      text-gray-500 dark:text-gray-400 break-words overflow-hidden">
                ${first.description}
            </p>

            <!-- Feature tags -->
            <div data-detail-tags
                 class="flex flex-wrap gap-2 pt-2
                        border-t border-gray-200/80 dark:border-gray-800/60">
                ${this.renderTags(first.tags)}
            </div>

        </div>
    `;
  }
}