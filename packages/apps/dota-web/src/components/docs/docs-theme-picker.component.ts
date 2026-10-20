import {ApplicationEventService, BaseElement, BindEvent, Component, DocumentListener} from "@ayu-sh-kr/dota-wrap/core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {THEMES} from "@ayu-sh-kr/dota-md";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {SITE_MARKDOWN_THEME} from "@dota/configs/markdown-theme.config.ts";
import {closeMenuOnEscape, closeMenuOnOutsideClick, MENU_PANEL, MENU_TRIGGER, menuChevron, selectMenuOption} from "@dota/components/docs/appearance-menu.ts";

/** Display name and one-line description for each theme in the menu. */
const THEME_LABELS: Record<string, {label: string; description: string}> = {
  [SITE_MARKDOWN_THEME]: {label: 'Dota', description: 'Site typography in DM Sans'},
  flat: {label: 'Flat', description: 'Clean, minimal typography'},
  material: {label: 'Material', description: 'Google Material 3 inspired'},
  apple: {label: 'Apple', description: 'SF Pro and Cupertino styling'},
  github: {label: 'GitHub', description: 'GitHub Docs style'},
};

const DEFAULT_THEME = SITE_MARKDOWN_THEME;
const STORAGE_KEY = 'docs-theme';

const themeLabel = (theme: string): string => THEME_LABELS[theme]?.label ?? theme;

/**
 * Dropdown that picks the Markdown theme of the documentation pages.
 *
 * The event bus is the only source of state: a pick is saved per browser and published as
 * `md:theme-change`, and the picker updates its trigger and highlighted option when it receives
 * that event, so it stays in sync with any other publisher. On connection it republishes a valid
 * saved theme so `<md-view>` and `<md-toc>` restore it too.
 *
 * Selector: `docs-theme-picker`.
 */
@Component({
  selector: 'docs-theme-picker',
  shadow: false
})
export class DocsThemePickerComponent extends BaseElement {

  constructor() {
    super();
  }

  /** Republishes the saved theme, ignoring missing or unsupported values. */
  @OnEvent('connected', true)
  restoreTheme(): void {
    const saved = LocalStorageService.get(STORAGE_KEY);
    if (saved && saved in THEMES) this.publish(saved);
  }

  /** Reflects a theme published by this picker or anyone else. */
  @OnEvent('md:theme-change')
  onThemeChange(event: ApplicationEvent<'md:theme-change'>): void {
    const theme = event.data?.theme;
    if (!theme || !(theme in THEMES)) return;
    selectMenuOption(this, theme);
    const current = this.querySelector('[data-current]');
    if (current) current.textContent = themeLabel(theme);
  }

  /**
   * Saves and publishes the clicked theme.
   * @param event Click event from one of the theme options.
   */
  @BindEvent({event: 'click', id: '[data-value]'})
  pickTheme(event: Event): void {
    const theme = (event.target as HTMLElement).closest<HTMLElement>('[data-value]')!.dataset['value']!;
    LocalStorageService.add(STORAGE_KEY, theme);
    this.publish(theme);
  }

  @DocumentListener({event: 'click'})
  closeOnOutsideClick(event: Event): void {
    closeMenuOnOutsideClick(this, event);
  }

  @DocumentListener({event: 'keydown'})
  closeOnEscape(event: KeyboardEvent): void {
    closeMenuOnEscape(this, event);
  }

  private publish(theme: string): void {
    void ApplicationEventService.getInstance().getPublisher()
      .publishAsync({name: 'md:theme-change', data: {theme}});
  }

  render(): TemplateResult {
    return html`
      <details class="group relative">
        <summary class="${MENU_TRIGGER}" aria-label="Theme">
          <span data-current>${themeLabel(DEFAULT_THEME)}</span>${menuChevron()}
        </summary>
        <div class="${MENU_PANEL} w-60 space-y-0.5">
          ${Object.keys(THEMES).map(theme => html`
            <button type="button" data-value="${theme}" aria-pressed="${theme === DEFAULT_THEME}"
                    class="group/option flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-left hover:bg-raised aria-pressed:bg-primary-subtle">
              <span class="min-w-0 flex-1">
                <span class="type-compact block font-medium text-foreground group-aria-pressed/option:text-primary">${themeLabel(theme)}</span>
                <span class="type-meta block truncate text-muted">${THEME_LABELS[theme]?.description ?? ''}</span>
              </span>
              <svg class="hidden h-4 w-4 shrink-0 text-primary group-aria-pressed/option:block" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"/></svg>
            </button>`)}
        </div>
      </details>
    `;
  }
}
