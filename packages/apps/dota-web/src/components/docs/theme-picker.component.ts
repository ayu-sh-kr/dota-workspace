import {ApplicationEventService, BaseElement, Component, HTML, HostListener, Property, String} from "@ayu-sh-kr/dota-core";
import {MarkdownThemeConfig, type MarkdownTheme} from "@dota/configs/markdown.config.ts";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";

// Swatch bg colours keyed by theme name (light-mode selection colour from MarkdownThemeConfig)
const THEME_SWATCH: Record<string, string> = {
  purple:  '#a855f7',
  blue:    '#3b82f6',
  green:   '#22c55e',
  emerald: '#10b981',
  teal:    '#14b8a6',
  cyan:    '#06b6d4',
  sky:     '#0ea5e9',
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  fuchsia: '#d946ef',
  pink:    '#ec4899',
  rose:    '#f43f5e',
  red:     '#ef4444',
  yellow:  '#eab308',
  amber:   '#f59e0b',
  orange:  '#f97316',
  lime:    '#84cc16',
  slate:   '#475569',
  gray:    '#6b7280',
  zinc:    '#52525b',
  neutral: '#525252',
  stone:   '#57534e',
  none:    '#111827',
};

@Component({
  selector: "theme-picker",
  shadow: false
})
export class ThemePickerComponent extends BaseElement {

  @Property({name: 'current-theme', type: String})
  currentTheme: string = 'purple';

  constructor() {
    super();
  }

  private publishTheme(theme: MarkdownTheme) {
    LocalStorageService.add('docs-theme', theme);
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({ name: 'docs:theme-change', data: { theme } });

    // Close the parent dota-popover by hiding its anchored element
    // The theme-picker is the anchoredEL, so we just hide ourselves
    this.style.display = 'none';
  }

  private buildSwatches(): string {
    return Object.keys(MarkdownThemeConfig)
      .map(key => {
        const color = THEME_SWATCH[key] ?? '#6b7280';
        const isActive = key === this.currentTheme;
        const ring = isActive
          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-current scale-110'
          : 'hover:scale-110';
        return `
          <button
            data-theme="${key}"
            title="${key}"
            class="theme-swatch w-6 h-6 rounded-full transition-transform duration-150 focus:outline-none ${ring}"
            style="background-color: ${color};"
            aria-label="Theme ${key}"
          ></button>`;
      })
      .join('');
  }

  @HostListener({event: 'click'})
  handleClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest('[data-theme]') as HTMLElement | null;
    if (target?.dataset?.['theme']) {
      this.publishTheme(target.dataset['theme'] as MarkdownTheme);
    }
  }

  render() {
    // language=html
    return HTML`
      <div class="z-50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5 uppercase tracking-wide">Theme</p>
        <div class="grid grid-cols-6 gap-2">
          ${this.buildSwatches()}
        </div>
      </div>
    `;
  }
}