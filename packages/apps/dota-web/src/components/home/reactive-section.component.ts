import {AfterInit, BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {MDService} from "@ayu-sh-kr/dota-md";
import {notificationService} from "@dota/main.ts";
import {CapabilityTab, TAB_REGISTRY} from "@dota/components/home/utils/capability.config.ts";

@Component({
    selector: "reactive-dota",
    shadow: false
})
export class ReactiveSectionComponent extends BaseElement {

    private readonly tabs: CapabilityTab[] = TAB_REGISTRY['reactive'];
    private activeTab: CapabilityTab = this.tabs[0];

    constructor() {
        super();
    }

    private renderCode(tab: CapabilityTab): string {
        return MDService.renderHtml(`\`\`\`typescript\n${tab.code}\n\`\`\``);
    }

    private updateContent(tab: CapabilityTab) {
        const desc = this.querySelector<HTMLElement>('#react-tab-desc');
        const card = this.querySelector<HTMLElement>('#react-code-card');
        if (!desc || !card) return;

        desc.classList.add('tab-content-exit');
        card.classList.add('tab-content-exit');

        setTimeout(() => {
            const fname = this.querySelector<HTMLElement>('#react-tab-filename');
            const body  = this.querySelector<HTMLElement>('#react-tab-code-body');

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
        const body = this.querySelector<HTMLElement>('#react-tab-code-body');
        if (body) body.innerHTML = this.renderCode(this.activeTab);

        this.addEventListener('tab:change', (e: Event) => {
            const {tabId} = (e as CustomEvent<{tabId: string}>).detail;
            const tab = this.tabs.find(t => t.id === tabId);
            if (!tab) return;
            this.activeTab = tab;
            this.updateContent(tab);
        });

        const copyBtn = this.querySelector<HTMLButtonElement>('#react-copy-btn');
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

    render(): TemplateResult {
        const first = this.tabs[0];

        return html`
        <section role="region" aria-labelledby="reactive-heading"
                 class="hero-fade-up relative isolate font-dm w-full
                        before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r
                        before:from-transparent before:via-slate-200/70 before:to-transparent
                        dark:before:via-white/10 before:-z-10">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16 lg:pt-10 lg:pb-20">

                    <!-- Two-column grid: left = code, right = header + tabs + description -->
                    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                        <!-- Left: code card -->
                        <div id="react-code-card"
                             class="w-full min-w-0 rounded-2xl border border-white/10
                                    bg-slate-950/95 backdrop-blur-2xl
                                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_90px_-54px_rgba(15,23,42,0.95)]
                                    dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_28px_90px_-52px_rgba(0,0,0,0.96)]
                                    overflow-hidden">

                            <!-- Title bar -->
                            <div class="flex items-center justify-between px-4 py-3
                                        bg-white/[0.045] border-b border-white/10">
                                <div class="flex items-center gap-2" aria-hidden="true">
                                    <span class="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-yellow-400/70"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-green-500/70"></span>
                                    <span id="react-tab-filename"
                                          class="ml-2 text-xs text-gray-500 font-mono">
                                        ${first.filename}
                                    </span>
                                </div>
                                <button id="react-copy-btn"
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
                            <div id="react-tab-code-body"
                                 class="tab-code-body overflow-x-auto custom-scrollbar
                                        text-[13px] leading-7 select-text">
                            </div>

                        </div>

                        <!-- Right: section header + tab bar + description -->
                        <div class="flex flex-col gap-5 lg:max-w-lg">

                            <!-- Section header -->
                            <div>
                                <span class="text-xs font-semibold tracking-[0.18em] uppercase
                                             text-purple-400 dark:text-purple-300">
                                    Reactive Components
                                </span>
                                <h2 id="reactive-heading"
                                    class="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
                                           text-gray-800 dark:text-gray-100/90 leading-tight">
                                    Reactive Support.</h2>
                            </div>

                            <!-- Tab bar -->
                            <tab-holder key="reactive" class="block"></tab-holder>

                            <!-- Active tab description -->
                            <p id="react-tab-desc"
                               class="text-base text-gray-400 dark:text-gray-500 leading-relaxed">
                                ${first.description}
                            </p>
                        </div>

                    </div>
            </div>
        </section>
        `;
    }
}
