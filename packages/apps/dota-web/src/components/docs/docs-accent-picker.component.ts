import {ApplicationEventService, BaseElement, BindEvent, Component, DocumentListener} from "@ayu-sh-kr/dota-wrap/core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {closeMenuOnEscape, closeMenuOnOutsideClick, MENU_PANEL, MENU_TRIGGER, menuChevron, selectMenuOption} from "@dota/components/docs/appearance-menu.ts";

/** Accent colors offered by the menu, with their swatch class; each is a color key of every built-in theme. */
const ACCENTS: Record<string, string> = {
  indigo: 'bg-indigo-500', violet: 'bg-violet-500', purple: 'bg-purple-500', blue: 'bg-blue-500',
  sky: 'bg-sky-500', teal: 'bg-teal-500', emerald: 'bg-emerald-500', lime: 'bg-lime-500',
  amber: 'bg-amber-500', orange: 'bg-orange-500', rose: 'bg-rose-500', slate: 'bg-slate-500',
};

const DEFAULT_ACCENT = 'indigo';
const STORAGE_KEY = 'docs-color';

/** Classes of the accent dot inside the trigger; the swatch class is appended. */
const DOT = 'h-3 w-3 rounded-full';

/**
 * Dropdown that picks the accent color of the documentation pages.
 *
 * The event bus is the only source of state: a pick is saved per browser and published as
 * `md:color-change`, and the picker updates its trigger dot and highlighted swatch when it
 * receives that event, so it stays in sync with any other publisher. On connection it
 * republishes a valid saved accent so `<md-view>` and `<md-toc>` restore it too.
 *
 * Selector: `docs-accent-picker`.
 */
@Component({
  selector: 'docs-accent-picker',
  shadow: false
})
export class DocsAccentPickerComponent extends BaseElement {

  constructor() {
    super();
  }

  /** Republishes the saved accent, ignoring missing or unsupported values. */
  @OnEvent('connected', true)
  restoreAccent(): void {
    const saved = LocalStorageService.get(STORAGE_KEY);
    if (saved && saved in ACCENTS) this.publish(saved);
  }

  /** Reflects an accent published by this picker or anyone else. */
  @OnEvent('md:color-change')
  onColorChange(event: ApplicationEvent<'md:color-change'>): void {
    const color = event.data?.color;
    if (!color || !(color in ACCENTS)) return;
    selectMenuOption(this, color);
    const current = this.querySelector('[data-current]');
    if (current) current.className = `${DOT} ${ACCENTS[color]}`;
  }

  /**
   * Saves and publishes the clicked accent.
   * @param event Click event from one of the swatches.
   */
  @BindEvent({event: 'click', id: '[data-value]'})
  pickAccent(event: Event): void {
    const color = (event.target as HTMLElement).closest<HTMLElement>('[data-value]')!.dataset['value']!;
    LocalStorageService.add(STORAGE_KEY, color);
    this.publish(color);
  }

  @DocumentListener({event: 'click'})
  closeOnOutsideClick(event: Event): void {
    closeMenuOnOutsideClick(this, event);
  }

  @DocumentListener({event: 'keydown'})
  closeOnEscape(event: KeyboardEvent): void {
    closeMenuOnEscape(this, event);
  }

  private publish(color: string): void {
    void ApplicationEventService.getInstance().getPublisher()
      .publishAsync({name: 'md:color-change', data: {color}});
  }

  render(): TemplateResult {
    return html`
      <details class="group relative">
        <summary class="${MENU_TRIGGER}" aria-label="Accent color">
          <span data-current class="${DOT} ${ACCENTS[DEFAULT_ACCENT]}"></span><span class="hidden sm:inline">Accent</span>${menuChevron()}
        </summary>
        <div class="${MENU_PANEL} grid w-max grid-cols-4 gap-3 p-3">
          ${Object.entries(ACCENTS).map(([color, swatch]) => html`
            <button type="button" data-value="${color}" aria-label="${color}" title="${color}" aria-pressed="${color === DEFAULT_ACCENT}"
                    class="${swatch} h-6 w-6 shrink-0 cursor-pointer rounded-full ring-offset-2 ring-offset-white transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-gray-400 dark:ring-offset-gray-900 dark:aria-pressed:ring-gray-300"></button>`)}
        </div>
      </details>
    `;
  }
}
