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

                    <!-- Two-column layout: list left, detail right -->
                    <div class="grid lg:grid-cols-[5fr_7fr] gap-3 lg:gap-8 items-start w-full">

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