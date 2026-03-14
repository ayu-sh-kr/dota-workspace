import { AfterInit, BaseElement, Component, HTML } from "@ayu-sh-kr/dota-core";
import { DOTA_TOOLS, DotaTool } from "@dota/components/home/utils/tools.config.ts";

@Component({
  selector: "our-tools",
  shadow: false,
})
export class OurToolsComponent extends BaseElement {

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

  private listItem(tool: DotaTool, active: boolean): string {
    return `
      <button data-tool-id="${tool.id}" ${active ? 'data-active=""' : ''}
              class="group flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left
                     cursor-pointer transition-all duration-200
                     border border-transparent
                     hover:bg-gray-100/80 dark:hover:bg-gray-800/40
                     hover:border-gray-200/80 dark:hover:border-gray-700/30
                     data-[active]:bg-gray-100/90 dark:data-[active]:bg-gray-800/80
                     data-[active]:border-gray-200/80 dark:data-[active]:border-gray-700/60">
        <div class="flex-shrink-0 w-9 h-9 rounded-lg
                    bg-gray-200/70 dark:bg-gray-800/60
                    flex items-center justify-center
                    transition-colors duration-200
                    group-data-[active]:bg-purple-500/20">
          <dota-icon name="${tool.icon}" color="purple" size="sm"></dota-icon>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold font-mono truncate transition-colors duration-200
                    text-gray-500 dark:text-gray-400
                    group-data-[active]:text-gray-900 dark:group-data-[active]:text-gray-100">
            ${tool.name}
          </p>
          <p class="text-xs truncate mt-0.5 transition-colors duration-200
                    text-gray-400 dark:text-gray-600
                    group-data-[active]:text-gray-500 dark:group-data-[active]:text-gray-500">
            ${tool.tagline}
          </p>
        </div>
        <dota-icon name="material-symbols:chevron-right-rounded" color="gray" size="sm"
                   class="opacity-0 group-hover:opacity-50 group-data-[active]:opacity-100
                          transition-opacity duration-200"></dota-icon>
      </button>
    `;
  }

  @AfterInit()
  afterViewInit() {
    const list = this.querySelector<HTMLElement>('#tools-list');
    if (!list) return;

    list.addEventListener('click', (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-tool-id]');
      if (!btn) return;

      const toolId = btn.dataset['toolId'];
      const tool = DOTA_TOOLS.find(t => t.id === toolId);
      if (!tool || tool.id === this.activeTool.id) return;

      this.querySelectorAll<HTMLElement>('[data-tool-id]').forEach(b => {
        b.removeAttribute('data-active');
      });
      btn.setAttribute('data-active', '');

      this.activeTool = tool;
      this.updateDetail(tool);
    });
  }

  private updateDetail(tool: DotaTool) {
    const panel = this.querySelector<HTMLElement>('#tool-detail-panel');
    if (!panel) return;

    panel.classList.add('tab-content-exit');

    setTimeout(() => {
      const icon = panel.querySelector<HTMLElement>('#detail-icon');
      const name = panel.querySelector<HTMLElement>('#detail-name');
      const tagline = panel.querySelector<HTMLElement>('#detail-tagline');
      const desc = panel.querySelector<HTMLElement>('#detail-description');
      const tags = panel.querySelector<HTMLElement>('#detail-tags');

      if (icon) icon.setAttribute('name', tool.icon);
      if (name) name.textContent = tool.name;
      if (tagline) tagline.textContent = `"${tool.tagline}"`;
      if (desc) desc.textContent = tool.description;
      if (tags) tags.innerHTML = this.renderTags(tool.tags);

      panel.classList.remove('tab-content-exit');
      panel.classList.add('tab-content-enter');
      setTimeout(() => panel.classList.remove('tab-content-enter'), 250);
    }, 150);
  }

  render(): string {
    const first = DOTA_TOOLS[0];

    return HTML`
        <section role="region" aria-labelledby="tools-heading"
                 class="hero-fade-up font-dm w-full">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 lg:pt-10 lg:pb-20">

                <div class="rounded-3xl border border-gray-200/60 dark:border-gray-700/30
                            bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm
                            px-6 sm:px-10 lg:px-16 py-12 lg:py-16">

                    <!-- Section header -->
                    <div class="mb-10">
                        <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                     text-purple-500 dark:text-purple-400">
                            Ecosystem
                        </span>
                        <h2 id="tools-heading"
                            class="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                                   text-gray-800 dark:text-gray-100/90 leading-tight">
                            Built as a suite.</h2>
                        <p class="mt-3 text-base text-gray-500 dark:text-gray-500 max-w-xl leading-relaxed">
                            Eight standalone packages, one cohesive ecosystem.
                            Use just what you need — or compose them all.
                        </p>
                    </div>

                    <!-- Two-column layout: list left, detail right -->
                    <div class="grid lg:grid-cols-[5fr_7fr] gap-4 lg:gap-8 items-start">

                        <!-- Left: tool list -->
                        <div id="tools-list" class="flex flex-col gap-1">
                            ${DOTA_TOOLS.map((tool, i) => this.listItem(tool, i === 0)).join('')}
                        </div>

                        <!-- Right: detail panel -->
                        <div id="tool-detail-panel"
                             class="rounded-2xl p-7 lg:p-8 flex flex-col gap-6 min-h-[320px]
                                    border border-gray-200/80 dark:border-gray-700/40
                                    bg-white/80 dark:bg-gray-950/60
                                    shadow-sm dark:shadow-none">

                            <!-- Icon + package name -->
                            <div class="flex items-start gap-4">
                                <div class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                                            bg-purple-500/10 border border-purple-400/30 dark:border-purple-500/20">
                                    <dota-icon id="detail-icon"
                                               name="${first.icon}"
                                               color="purple" size="lg">
                                    </dota-icon>
                                </div>
                                <div class="pt-1">
                                    <p class="text-xs font-semibold tracking-[0.18em] uppercase mb-1
                                               text-purple-500 dark:text-purple-400">
                                        Package
                                    </p>
                                    <h3 id="detail-name"
                                        class="text-2xl font-bold font-mono leading-none
                                               text-gray-900 dark:text-gray-100">
                                        ${first.name}
                                    </h3>
                                </div>
                            </div>

                            <!-- Tagline pull-quote -->
                            <p id="detail-tagline"
                               class="text-base font-medium italic pl-4 leading-relaxed
                                      border-l-2 border-purple-500/50
                                      text-gray-700 dark:text-gray-300">
                                "${first.tagline}"
                            </p>

                            <!-- Description -->
                            <p id="detail-description"
                               class="text-sm leading-relaxed flex-1
                                      text-gray-500 dark:text-gray-400">
                                ${first.description}
                            </p>

                            <!-- Feature tags -->
                            <div id="detail-tags"
                                 class="flex flex-wrap gap-2 pt-2
                                        border-t border-gray-200/80 dark:border-gray-800/60">
                                ${this.renderTags(first.tags)}
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    `;
  }
}