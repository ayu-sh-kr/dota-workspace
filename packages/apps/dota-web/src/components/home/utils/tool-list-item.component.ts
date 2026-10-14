import {AfterInit, ApplicationEventService, BaseElement, Component, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import { type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import { DOTA_TOOLS } from "@dota/components/home/utils/tools.config.ts";

/**
 * Renders a single row in the tools list.
 *
 * - Publishes `tools:select` on click so sibling components can react
 *   without any shared parent state.
 * - Subscribes to `tools:select` to self-manage the active highlight,
 *   avoiding full re-renders across all items.
 */
@Component({
  selector: 'tool-list-item',
  shadow: false,
})
export class ToolListItemComponent extends BaseElement {

  @Property({ name: 'tool-id', type: String })
  toolId: string = '';

  constructor() {
    super();
  }

  /**
   * Marks the first configured tool after its button exists.
   * Active state is a presence-only data attribute maintained by the same event
   * path used for later selections, keeping boolean state out of interpolation.
   */
  @AfterInit()
  markInitialToolActive() {
    if (DOTA_TOOLS[0].id !== this.toolId) return;
    this.querySelector('button')?.setAttribute('data-active', '');
  }

  @HostListener({ event: 'click' })
  onClick() {
    if (!this.toolId) return;
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({ name: 'tools:select', data: { toolId: this.toolId } });
  }

  @OnEvent('tools:select')
  onToolSelect(event: ApplicationEvent<'tools:select'>) {
    const btn = this.querySelector<HTMLElement>('button');
    if (!btn) return;
    if (event.data?.toolId === this.toolId) {
      btn.setAttribute('data-active', '');
    } else {
      btn.removeAttribute('data-active');
    }
  }

  render(): TemplateResult {
    const tool = DOTA_TOOLS.find(t => t.id === this.toolId);
    if (!tool) return html`<div class="h-[60px]"></div>`;

    return html`
        <button class="group flex w-full items-center gap-2 sm:gap-3 rounded-card px-4 py-4 text-left cursor-pointer
                transition-all duration-300 backdrop-blur-2xl border border-default bg-surface shadow-lift
                hover:-translate-y-0.5 hover:border-primary-border data-[active]:border-primary-border
                data-[active]:bg-surface">
            <div class="flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-control bg-surface border border-primary-border
                    flex items-center justify-center transition-colors duration-200
                    group-data-[active]:bg-primary-subtle">
                <dota-icon name="${tool.icon}" color="purple" size="sm" variant="ghost"></dota-icon>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold font-mono truncate transition-colors duration-200 text-foreground
                        group-data-[active]:text-foreground">
                    ${tool.name}
                </p>
                <p class="text-xs truncate mt-0.5 transition-colors duration-200 text-muted group-data-[active]:text-muted">
                    ${tool.tagline}
                </p>
            </div>
            <dota-icon name="material-symbols:chevron-right-rounded" color="purple" size="sm"
                       class="opacity-0 group-hover:opacity-60 group-data-[active]:opacity-100 transition-opacity
                               duration-200"></dota-icon>
        </button>
    `;
  }
}
