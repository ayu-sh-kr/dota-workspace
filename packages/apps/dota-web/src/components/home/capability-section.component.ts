import {AfterInit, BaseElement, Component} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
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

  render(): TemplateResult {
    const first = this.tabs[0];

    return html`
        <section role="region" aria-labelledby="capability-heading"
                 class="hero-fade-up relative isolate font-sans w-full home-section-divider">
            <div class="layout-page layout-section">

                    <!-- Two-column grid: left = header + tabs + description, right = code -->
                    <div class="layout-split">

                        <!-- Left: section header + tab bar + description -->
                        <div class="home-section-copy">

                            <!-- Section header -->
                            <div>
                                <span class="type-eyebrow">
                                    Custom Decorators
                                </span>
                                <h2 id="capability-heading"
                                    class="mt-2 type-section text-foreground">
                                    Event Listeners.</h2>
                            </div>

                            <!-- Tab bar -->
                            <tab-holder key="capability" class="block"></tab-holder>

                            <!-- Active tab description -->
                            <p id="cap-tab-desc"
                               class="type-body text-muted">
                                ${first.description}
                            </p>
                        </div>

                        <!-- Right: code card -->
                        <div id="cap-code-card"
                             class="code-panel w-full min-w-0">

                            <!-- Title bar -->
                            <div class="code-toolbar flex items-center justify-between px-4 py-3">
                                <div class="flex items-center gap-2" aria-hidden="true">
                                    <span class="w-2.5 h-2.5 rounded-full bg-code-danger"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-code-warning"></span>
                                    <span class="w-2.5 h-2.5 rounded-full bg-code-success"></span>
                                    <span id="cap-tab-filename"
                                          class="ml-2 text-xs text-code-muted font-mono">
                                        ${first.filename}
                                    </span>
                                </div>
                                <button id="cap-copy-btn"
                                        class="button-link button-compact button-code"
                                        aria-label="Copy code to clipboard"
                                        title="Copy to clipboard">
                                    <dota-icon name="material-symbols:content-copy-rounded"
                                               classname="text-code-accent" variant="ghost" size="sm">
                                    </dota-icon>
                                    <span>Copy</span>
                                </button>
                            </div>

                            <!-- Code body: populated by MDService in afterViewInit -->
                            <div id="cap-tab-code-body"
                                 class="tab-code-body overflow-x-auto custom-scrollbar type-code select-text">
                            </div>

                        </div>

                    </div>
            </div>
        </section>
    `;
  }
}
