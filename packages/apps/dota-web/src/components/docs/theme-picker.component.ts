import {ApplicationEventService, BaseElement, Component, HTML, HostListener, Property, String} from "@ayu-sh-kr/dota-core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-event";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {THEMES, type ThemeName} from "@ayu-sh-kr/dota-md";

const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

/** Small description per theme so the picker card is self-explanatory. */
const THEME_DESC: Record<ThemeName, string> = {
  flat:     'Clean, minimal typography',
  material: 'Google Material 3 inspired',
  apple:    'SF Pro · Cupertino design language',
};

@Component({
  selector: 'theme-picker',
  shadow: false
})
export class ThemePickerComponent extends BaseElement {

  @Property({name: 'current-theme', type: String})
  currentTheme: ThemeName = 'flat';

  constructor() {
    super();
  }

  @OnEvent('connected', true)
  onConnected() {
    const saved = LocalStorageService.get('docs-theme') as ThemeName | null;
    if (saved && saved !== this.currentTheme) {
      this.currentTheme = saved;
    }
  }

  @OnEvent('docs:theme-change')
  onThemeChange(event: ApplicationEvent<'docs:theme-change'>) {
    const t = event?.data?.theme as ThemeName | undefined;
    if (t && t !== this.currentTheme) {
      this.currentTheme = t;
      this.updateHTML();
    }
  }

  private publishTheme(theme: ThemeName) {
    LocalStorageService.add('docs-theme', theme);
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({ name: 'docs:theme-change', data: { theme } });
    // Close the parent dota-popover by hiding this anchored element
    this.style.display = 'none';
  }

  private buildOptions(): string {
    return THEME_NAMES.map(name => {
      const isActive = name === this.currentTheme;
      const ring = isActive
        ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
        : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-indigo-300 dark:hover:ring-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/50';
      const nameClass = isActive
        ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
        : 'text-gray-800 dark:text-gray-200 font-medium';
      const checkmark = isActive
        ? `<svg class="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
             <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
           </svg>`
        : '';
      const desc = THEME_DESC[name] ?? '';
      return `
        <button
          data-theme="${name}"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                 transition-all duration-150 cursor-pointer ${ring}">
          <div class="flex-1 min-w-0">
            <div class="text-sm ${nameClass} capitalize">${name}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">${desc}</div>
          </div>
          ${checkmark}
        </button>`;
    }).join('');
  }

  @HostListener({event: 'click'})
  handleClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest('[data-theme]') as HTMLElement | null;
    if (target?.dataset?.['theme']) {
      this.publishTheme(target.dataset['theme'] as ThemeName);
    }
  }

  render() {
    return HTML`
      <div class="z-[100] p-3 rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900 shadow-xl min-w-[13rem]">
        <p class="text-[0.6rem] font-bold uppercase tracking-widest
                   text-gray-400 dark:text-gray-500 mb-2.5 px-1">Theme</p>
        <div class="flex flex-col gap-1.5">
          ${this.buildOptions()}
        </div>
      </div>
    `;
  }
}