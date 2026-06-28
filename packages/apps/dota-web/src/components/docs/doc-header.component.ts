import {
  ApplicationEventService,
  BaseElement,
  BindEvent,
  Component,
  HTML,
  Property,
  String
} from "@ayu-sh-kr/dota-wrap/core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {type ColorName, type ThemeName} from "@ayu-sh-kr/dota-md";

/** bg-500 Tailwind class per ColorName — used for the indicator dot only. */
const COLOR_BG: Record<ColorName, string> = {
  slate: 'bg-slate-500',   gray: 'bg-gray-500',    zinc: 'bg-zinc-500',
  neutral: 'bg-neutral-500', stone: 'bg-stone-500', red: 'bg-red-500',
  orange: 'bg-orange-500', amber: 'bg-amber-500',  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',     green: 'bg-green-500',  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',     cyan: 'bg-cyan-500',    sky: 'bg-sky-500',
  blue: 'bg-blue-500',     indigo: 'bg-indigo-500', violet: 'bg-violet-500',
  purple: 'bg-purple-500', fuchsia: 'bg-fuchsia-500', pink: 'bg-pink-500',
  rose: 'bg-rose-500',
};

@Component({
  selector: 'doc-header',
  shadow: false
})
export class DocHeaderComponent extends BaseElement {

  @Property({name: 'active-file', type: String})
  activeFile: string = 'Getting-Started.md';

  @Property({name: 'theme', type: String})
  theme: ThemeName = 'flat';

  @Property({name: 'color', type: String})
  color: ColorName = 'indigo';

  constructor() {
    super();
  }

  @OnEvent('connected', true)
  onConnected() {
    const savedTheme = LocalStorageService.get('docs-theme') as ThemeName | null;
    const savedColor = LocalStorageService.get('docs-color') as ColorName | null;
    this.theme = savedTheme ?? 'flat';
    this.color = savedColor ?? 'indigo';
    // Publish docs: immediately so doc-section / doc-header siblings sync up.
    this._publishDocsTheme(this.theme);
    this._publishDocsColor(this.color);
    // Defer md: events by one animation frame so md-view and md-toc are
    // fully connected before receiving the initial theme/color.
    requestAnimationFrame(() => {
      this._publishMdTheme(this.theme);
      this._publishMdColor(this.color);
    });
  }

  @OnEvent('docs:theme-change')
  onThemeChange(event: ApplicationEvent<'docs:theme-change'>) {
    const t = event?.data?.theme as ThemeName | undefined;
    if (t && t !== this.theme) {
      this.theme = t;
      LocalStorageService.add('docs-theme', t);
    }
  }

  @OnEvent('docs:color-change')
  onColorChange(event: ApplicationEvent<'docs:color-change'>) {
    const c = event?.data?.color as ColorName | undefined;
    if (c && c !== this.color) {
      this.color = c;
      LocalStorageService.add('docs-color', c);
    }
  }

  @BindEvent({event: 'click', id: '#hdr-sidebar-btn'})
  handleSidebarToggle() {
    window.dispatchEvent(new CustomEvent('doc:sidebar-toggle'));
  }

  private _publishDocsColor(color: ColorName) {
    ApplicationEventService.getInstance().getPublisher()
      .publishAsync({ name: 'docs:color-change', data: { color } });
  }

  private _publishMdColor(color: ColorName) {
    ApplicationEventService.getInstance().getPublisher()
      .publishAsync({ name: 'md:color-change', data: { color } });
  }

  private _publishDocsTheme(theme: ThemeName) {
    ApplicationEventService.getInstance().getPublisher()
      .publishAsync({ name: 'docs:theme-change', data: { theme } });
  }

  private _publishMdTheme(theme: ThemeName) {
    ApplicationEventService.getInstance().getPublisher()
      .publishAsync({ name: 'md:theme-change', data: { theme } });
  }

  private get breadcrumb(): string {
    return (this.activeFile ?? 'Getting-Started.md').replace('.md', '').replace(/-/g, ' ');
  }

  render(): string {

    return HTML`
      <header class="sticky top-0 z-40 w-full
                     border-b border-gray-200 dark:border-gray-800
                     bg-white/90 dark:bg-gray-950/90
                     backdrop-blur-md font-dm">

        <div class="flex items-center justify-between h-14 px-4 lg:px-6">

          <!-- Left: mobile sidebar toggle + breadcrumb -->
          <div class="flex items-center gap-3 min-w-0">

            <button id="hdr-sidebar-btn"
                    class="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg
                           text-gray-600 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-800
                           transition-colors duration-150"
                    aria-label="Toggle sidebar">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <a href="/"
               class="hidden lg:flex items-center gap-1.5 shrink-0
                      font-extrabold text-xl text-gray-900 dark:text-gray-100
                      hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-colors duration-150">Dota</a>
            <span class="hidden lg:block text-gray-300 dark:text-gray-600 text-lg select-none">/</span>
            <span class="hidden lg:block text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">Docs</span>
            <span class="hidden lg:block text-gray-300 dark:text-gray-600 text-lg select-none">/</span>
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate capitalize">
              ${this.breadcrumb}
            </span>
          </div>

          <!-- Right: color-picker + theme-picker + dark-mode + github -->
          <div class="flex items-center gap-1 shrink-0">

            <!-- ── Color picker ── -->
            <dota-popover placement="bottom-end" offset="8" anchored-selector="color-picker">
              <dota-icon name="stash:circle-solid" color="${this.color}" size="md" variant="ghost" class="cursor-pointer"></dota-icon>
            </dota-popover>

            <!-- ── Theme picker ── -->
            <dota-popover placement="bottom-end" offset="8" anchored-selector="theme-picker">
              <dota-icon name="material-icon-theme:code-climate" color="${this.color}" size="md" variant="ghost" class="cursor-pointer"></dota-icon>
            </dota-popover>

            <dark-mode-button color="${this.color}"></dark-mode-button>
            <github-button></github-button>
          </div>
        </div>
      </header>
    `;
  }
}

