import { ApplicationEventService, BaseElement, Component, HostListener, Property, String } from "@ayu-sh-kr/dota-wrap/core";
import { type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-wrap/event";
import {html, nothing, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
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

    const isInitial = DOTA_TOOLS[0].id === this.toolId;

    return html`
        <button data-active=${isInitial ? '' : nothing}
                class="group flex w-full items-center gap-2 sm:gap-3 rounded-2xl px-4 py-4 text-left
                       cursor-pointer transition-all duration-300 backdrop-blur-2xl
                       border border-white/70 dark:border-white/10
                       bg-white/[0.52] dark:bg-white/[0.04]
                       shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_14px_48px_-42px_rgba(15,23,42,0.86)]
                       dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_48px_-42px_rgba(0,0,0,0.9)]
                       hover:-translate-y-0.5 hover:border-purple-300/30
                       data-[active]:border-purple-300/35 data-[active]:bg-white/[0.68]
                       dark:data-[active]:bg-white/[0.06]">
            <div class="flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-lg
                        bg-white/55 dark:bg-white/[0.055] border border-purple-300/25 dark:border-purple-300/15
                        flex items-center justify-center
                        transition-colors duration-200
                        group-data-[active]:bg-purple-500/[0.12]">
                <dota-icon name="${tool.icon}" color="purple" size="sm" variant="ghost"></dota-icon>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold font-mono truncate transition-colors duration-200
                          text-gray-700 dark:text-gray-300
                          group-data-[active]:text-gray-900 dark:group-data-[active]:text-gray-100">
                    ${tool.name}
                </p>
                <p class="text-xs truncate mt-0.5 transition-colors duration-200
                          text-gray-400 dark:text-gray-500
                          group-data-[active]:text-gray-500 dark:group-data-[active]:text-gray-400">
                    ${tool.tagline}
                </p>
            </div>
            <dota-icon name="material-symbols:chevron-right-rounded" color="purple" size="sm"
                       class="opacity-0 group-hover:opacity-60 group-data-[active]:opacity-100
                              transition-opacity duration-200"></dota-icon>
        </button>
    `;
  }
}
