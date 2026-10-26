import {AfterInit, BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, trustedHTML, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {codeHeader} from "@dota/components/home/utils/code-snippet/code-header.ts";
import {MDService} from "@dota/configs/markdown.config.ts";
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
            this.activeTab = tab;
            this.updateHTML();

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

        this.addEventListener('tab:change', (e: Event) => {
            const {tabId} = (e as CustomEvent<{tabId: string}>).detail;
            const tab = this.tabs.find(t => t.id === tabId);
            if (!tab) return;
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
        const tab = this.activeTab;

        return html`
        <section role="region" aria-labelledby="reactive-heading"
                 class="hero-fade-up relative isolate font-sans w-full home-section-divider">
            <div class="layout-page layout-section">

                    <!-- Two-column grid: left = code, right = header + tabs + description -->
                    <div class="layout-split">

                        <!-- Left: code card -->
                        <div id="react-code-card"
                             class="code-panel w-full min-w-0">

                            ${codeHeader(tab.filename, {copy: 'react-copy-btn', filename: 'react-tab-filename'})}

                            <div id="react-tab-code-body"
                                 class="code-body custom-scrollbar select-text">
                                ${trustedHTML(this.renderCode(tab))}
                            </div>

                        </div>

                        <!-- Right: section header + tab bar + description -->
                        <div class="home-section-copy">

                            <!-- Section header -->
                            <div>
                                <span class="type-eyebrow">
                                    Reactive Components
                                </span>
                                <h2 id="reactive-heading"
                                    class="mt-2 type-section text-foreground">
                                    Reactive Support.</h2>
                            </div>

                            <!-- Tab bar -->
                            <tab-holder key="reactive" class="block"></tab-holder>

                            <!-- Active tab description -->
                            <p id="react-tab-desc"
                               class="type-body text-muted">
                                ${tab.description}
                            </p>
                        </div>

                    </div>
            </div>
        </section>
        `;
    }
}
