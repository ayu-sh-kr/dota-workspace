import { BaseElement, Component, HTML } from "@ayu-sh-kr/dota-core";
import { DOTA_TOOLS, type DotaTool } from "@dota/components/home/utils/tools.config.ts";

@Component({
  selector: "our-tools",
  shadow: false,
})
export class OurToolsComponent extends BaseElement {

  constructor() {
    super();
  }

  private tagChip(tag: string): string {
    // language=html
    return `
        <span class="px-3 py-1 rounded-full text-xs font-medium
         bg-purple-500/10 text-purple-600 dark:text-purple-300
         border border-purple-400/30 dark:border-purple-500/20">
          ${tag}
        </span>
    `;
  }

  private toolSlide(tool: DotaTool): string {
    return `
      <dota-slide>
        <div class="rounded-2xl p-4 sm:p-6 flex flex-col gap-5 h-full
                    border border-gray-200/80 dark:border-gray-700/40
                    bg-white/80 dark:bg-gray-950/60
                    shadow-sm dark:shadow-none overflow-hidden">

          <div class="flex items-start gap-3">
            <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0
                        bg-purple-500/10 border border-purple-400/30 dark:border-purple-500/20">
              <dota-icon name="${tool.icon}" color="purple" size="lg"></dota-icon>
            </div>
            <div class="pt-1 min-w-0">
              <p class="text-xs font-semibold tracking-[0.18em] uppercase mb-1
                         text-purple-500 dark:text-purple-400">Package</p>
              <h3 class="text-base sm:text-xl font-bold font-mono leading-none
                         text-gray-900 dark:text-gray-100 break-all">${tool.name}</h3>
            </div>
          </div>

          <p class="text-sm sm:text-base font-medium italic pl-4 leading-relaxed
                    border-l-2 border-purple-500/50
                    text-gray-700 dark:text-gray-300">"${tool.tagline}"</p>

          <p class="text-sm leading-relaxed flex-1
                    text-gray-500 dark:text-gray-400">${tool.description}</p>

          <div class="flex flex-wrap gap-2 pt-2
                      border-t border-gray-200/80 dark:border-gray-800/60">
            ${tool.tags.map(t => this.tagChip(t)).join('')}
          </div>
        </div>
      </dota-slide>
    `;
  }

  render(): string {
    return HTML`
        <section role="region" aria-labelledby="tools-heading"
                 class="hero-fade-up font-dm w-full">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 lg:pt-10 lg:pb-20">

                <!-- Section header -->
                <div class="mb-8">
                    <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                 text-purple-500 dark:text-purple-400">
                        Ecosystem
                    </span>
                    <h2 id="tools-heading"
                        class="mt-2 text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                               text-gray-800 dark:text-gray-100/90 leading-tight">
                        Built as a suite.</h2>
                    <p class="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-500 max-w-xl leading-relaxed">
                        Eight standalone packages, one cohesive ecosystem.
                        Use just what you need — or compose them all.
                    </p>
                </div>

                <!-- Mobile / md: carousel of tool cards -->
                <div class="lg:hidden">
                    <dota-carousel indicator="icon" color="purple" navigation="auto"
                                   loop="true" autoplay="true" animation="zoom">
                        ${DOTA_TOOLS.map(t => this.toolSlide(t)).join('')}
                    </dota-carousel>
                </div>

                <!-- lg+: two-column layout -->
                <div class="hidden lg:grid lg:grid-cols-[5fr_7fr] gap-3 lg:gap-8 items-start w-full">
                    <div class="flex flex-col gap-1 w-full">
                        ${DOTA_TOOLS.map(t => `<div class="w-full"><tool-list-item tool-id="${t.id}"></tool-list-item></div>`).join('')}
                    </div>
                    <tool-detail></tool-detail>
                </div>

            </div>
        </section>
    `;
  }
}