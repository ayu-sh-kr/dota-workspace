import { ApplicationEventService, BaseElement, Component, HTML, HostListener, Property, String } from "@ayu-sh-kr/dota-core";
import { type ApplicationEvent, OnEvent } from "@ayu-sh-kr/dota-event";
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

  render(): string {
    const tool = DOTA_TOOLS.find(t => t.id === this.toolId);
    if (!tool) return `<div class="h-[60px]"></div>`;

    const isInitial = DOTA_TOOLS[0].id === this.toolId;

    return HTML`
        <button ${isInitial ? 'data-active=""' : ''}
                class="group flex items-center gap-2 sm:gap-3 w-full px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-left
                       cursor-pointer transition-all duration-200
                       border border-transparent
                       hover:bg-gray-100/80 dark:hover:bg-gray-800/40
                       hover:border-gray-200/80 dark:hover:border-gray-700/30
                       data-[active]:bg-gray-100/90 dark:data-[active]:bg-gray-800/80
                       data-[active]:border-gray-200/80 dark:data-[active]:border-gray-700/60">
            <div class="flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-lg
                        bg-gray-200/70 dark:bg-gray-800/60
                        flex items-center justify-center
                        transition-colors duration-200
                        group-data-[active]:bg-purple-500/20">
                <dota-icon name="${tool.icon}" color="purple" size="sm"></dota-icon>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold font-mono truncate transition-colors duration-200
                          text-gray-500 dark:text-gray-400
                          group-data-[active]:text-gray-900 dark:group-data-[active]:text-gray-100">
                    ${tool.name}
                </p>
                <p class="text-xs truncate mt-0.5 transition-colors duration-200
                          text-gray-400 dark:text-gray-600
                          group-data-[active]:text-gray-500 dark:group-data-[active]:text-gray-500">
                    ${tool.tagline}
                </p>
            </div>
            <dota-icon name="material-symbols:chevron-right-rounded" color="gray" size="sm"
                       class="opacity-0 group-hover:opacity-50 group-data-[active]:opacity-100
                              transition-opacity duration-200"></dota-icon>
        </button>
    `;
  }
}