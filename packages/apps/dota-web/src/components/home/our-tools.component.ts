import { BaseElement, Component, HTML } from "@ayu-sh-kr/dota-core";
import { DOTA_TOOLS } from "@dota/components/home/utils/tools.config.ts";

@Component({
  selector: "our-tools",
  shadow: false,
})
export class OurToolsComponent extends BaseElement {

  constructor() {
    super();
  }

  render(): string {
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

                        <div class="flex flex-col gap-1">
                            ${DOTA_TOOLS.map(t => `<tool-list-item tool-id="${t.id}"></tool-list-item>`).join('')}
                        </div>

                        <tool-detail></tool-detail>

                    </div>

                </div>
            </div>
        </section>
    `;
  }
}