import {BaseElement, Component, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {TAB_REGISTRY} from "../capability.config.ts";

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

  /**
   * Selects the clicked tab, re-renders the pill styles, and notifies the parent section.
   * @param event Click anywhere in the tab bar; only `.tab-btn` targets change the selection.
   */
  @HostListener({event: 'click'})
  selectTab(event: MouseEvent) {
    const tabId = (event.target as Element | null)?.closest<HTMLButtonElement>('.tab-btn')?.dataset['tab'];
    if (!tabId || tabId === this.activeTabId) return;

    this.activeTabId = tabId;
    this.updateHTML();
    this.dispatchEvent(new CustomEvent('tab:change', {
      detail: {tabId, key: this.key},
      bubbles: true,
      composed: true,
    }));
  }

  render(): TemplateResult {
    const tabs = TAB_REGISTRY[this.key] ?? [];
    const activeTabId = this.activeTabId || tabs[0]?.id;

    return html`
        <div class="flex flex-wrap gap-2" role="tablist" aria-label="Tabs">
            ${tabs.map(tab => html`
              <button class="tab-btn ${tab.id === activeTabId ? 'tab-btn-active' : 'tab-btn-inactive'}"
                      data-tab="${tab.id}"
                      aria-selected="${tab.id === activeTabId}"
                      role="tab">
                ${tab.title}
              </button>
            `)}
        </div>
    `;
  }
}
