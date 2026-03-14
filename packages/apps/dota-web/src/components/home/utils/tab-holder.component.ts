import {AfterInit, BaseElement, Component, HTML, Property, String} from "@ayu-sh-kr/dota-core";
import {TAB_REGISTRY} from "./capability.config.ts";

/**
 * Generic tab bar component.
 *
 * Usage: <tab-holder key="capability"></tab-holder>
 *
 * - `key` maps to a TAB_REGISTRY entry and determines which tabs to render.
 * - Renders only the tab pill buttons — no content, no code card.
 * - Dispatches a bubbling `tab:change` CustomEvent with `{ tabId, key }` in
 *   its detail whenever a tab is selected. The parent section listens for
 *   this event and updates its own content area.
 */
@Component({
  selector: 'tab-holder',
  shadow: false
})
export class TabHolderComponent extends BaseElement {

  @Property({name: 'key', type: String})
  key: string = '';

  private activeTabId: string = '';

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    const tabs = TAB_REGISTRY[this.key] ?? [];
    if (tabs.length === 0) return;

    this.activeTabId = tabs[0].id;

    this.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset['tab'];
        if (!tabId || tabId === this.activeTabId) return;

        this.activeTabId = tabId;

        // Update button active styles
        this.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(b => {
          const active = b.dataset['tab'] === tabId;
          b.className = active ? 'tab-btn tab-btn-active' : 'tab-btn tab-btn-inactive';
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        // Notify parent section
        this.dispatchEvent(new CustomEvent('tab:change', {
          detail: {tabId, key: this.key},
          bubbles: true,
          composed: true,
        }));
      });
    });
  }

  render(): string {
    const tabs = TAB_REGISTRY[this.key] ?? [];

    const buttons = tabs.map((tab, i) => `
      <button class="tab-btn ${i === 0 ? 'tab-btn-active' : 'tab-btn-inactive'}"
              data-tab="${tab.id}"
              aria-selected="${i === 0}"
              role="tab">
        ${tab.title}
      </button>
    `).join('');

    return HTML`
        <div class="flex flex-wrap gap-2" role="tablist" aria-label="Tabs">
            ${buttons}
        </div>
    `;
  }
}