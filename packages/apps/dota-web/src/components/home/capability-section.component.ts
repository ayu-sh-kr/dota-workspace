import {AfterInit, BaseElement, Component, HTML} from "@ayu-sh-kr/dota-core";
import {MDService} from "@ayu-sh-kr/dota-md";
import {notificationService} from "@dota/main.ts";
import {CapabilityTab, TAB_REGISTRY} from "@dota/components/home/utils/capability.config.ts";

@Component({
  selector: "capability-section",
  shadow: false
})
export class CapabilitySectionComponent extends BaseElement {

  private readonly tabs: CapabilityTab[] = TAB_REGISTRY['capability'];
  private activeTab: CapabilityTab = this.tabs[0];

  constructor() {
    super();
  }

  private renderCode(tab: CapabilityTab): string {
    return MDService.renderHtml(`\`\`\`typescript\n${tab.code}\n\`\`\``);
  }

  private updateContent(tab: CapabilityTab) {
    const desc = this.querySelector<HTMLElement>('#cap-tab-desc');
    const card = this.querySelector<HTMLElement>('#cap-code-card');
    if (!desc || !card) return;

    // Fade out only the description and code card — header and tabs stay static
    desc.classList.add('tab-content-exit');
    card.classList.add('tab-content-exit');

    setTimeout(() => {
      const fname = this.querySelector<HTMLElement>('#cap-tab-filename');
      const body  = this.querySelector<HTMLElement>('#cap-tab-code-body');

      desc.textContent   = tab.description;
      if (fname) fname.textContent = tab.filename;
      if (body)  body.innerHTML    = this.renderCode(tab);

      desc.classList.remove('tab-content-exit');
      card.classList.remove('tab-content-exit');
      desc.classList.add('tab-content-enter');
      card.classList.add('tab-content-enter');
      setTimeout(() => {
        desc.classList.remove('tab-content-enter');
        card.classList.remove('tab-content-enter');
      }, 250);
    }, 150);
  }

  @AfterInit()
  afterViewInit() {
    // Render initial code block
    const body = this.querySelector<HTMLElement>('#cap-tab-code-body');
    if (body) body.innerHTML = this.renderCode(this.activeTab);

    // Listen for tab selections from the child <tab-holder>
    this.addEventListener('tab:change', (e: Event) => {
      const {tabId} = (e as CustomEvent<{tabId: string}>).detail;
      const tab = this.tabs.find(t => t.id === tabId);
      if (!tab) return;
      this.activeTab = tab;
      this.updateContent(tab);
    });

    // Copy button
    const copyBtn = this.querySelector<HTMLButtonElement>('#cap-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.activeTab.code).then(() => {
          notificationService.info({
            duration: 3000,
            message: 'Code copied to clipboard',
            title: 'Copied'
          });
        });
      });
    }
  }

  render(): string {
    const first = this.tabs[0];

    return HTML`
        <section role="region" aria-labelledby="capability-heading"
                 class="hero-fade-up font-dm w-full">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 lg:pt-10 lg:pb-20">

                    <!-- Two-column grid: left = header + tabs + description, right = code -->
                    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                        <!-- Left: section header + tab bar + description -->
                        <div class="flex flex-col gap-5 lg:max-w-lg">

                            <!-- Section header -->
                            <div>
                                <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                             text-purple-400 dark:text-purple-300">
                                    Custom Decorators
                                </span>
                                <h2 id="capability-heading"
                                    class="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                                           text-gray-800 dark:text-gray-100/90 leading-tight">
                                    Event Listeners.</h2>
                            </div>

                            <!-- Tab bar -->
                            <tab-holder key="capability" class="block"></tab-holder>

                            <!-- Active tab description -->
                            <p id="cap-tab-desc"
                               class="text-base text-gray-400 dark:text-gray-500 leading-relaxed">
                                ${first.description}
                            </p>
                        </div>

                        <!-- Right: code card -->
                        <div id="cap-code-card"
                             class="w-full min-w-0 rounded-xl border border-gray-700/40
                                    bg-gray-950 shadow-2xl overflow-hidden">

                            <!-- Title bar -->
                            <div class="flex items-center justify-between px-4 py-3
                                        bg-gray-900/80 border-b border-gray-800/60">
                                <div class="flex items-center gap-2" aria-hidden="true">
                                    <span class="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-yellow-400/70"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-green-500/70"></span>
                                    <span id="cap-tab-filename"
                                          class="ml-2 text-xs text-gray-500 font-mono">
                                        ${first.filename}
                                    </span>
                                </div>
                                <button id="cap-copy-btn"
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
                            <div id="cap-tab-code-body"
                                 class="tab-code-body overflow-x-auto custom-scrollbar
                                        text-[13px] leading-7 select-text">
                            </div>

                        </div>

                    </div>
            </div>
        </section>
    `;
  }
}