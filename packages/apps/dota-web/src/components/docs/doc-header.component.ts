import {
  ApplicationEventService,
  BaseElement,
  BindEvent,
  Component,
  HTML,
  Property,
  String
} from "@ayu-sh-kr/dota-core";
import type {MarkdownTheme} from "@dota/configs/markdown.config.ts";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-event";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";

@Component({
  selector: 'doc-header',
  shadow: false
})
export class DocHeaderComponent extends BaseElement {

  @Property({name: 'active-file', type: String})
  activeFile: string = 'Getting-Started.md';

  @Property({name: 'theme', type: String})
  theme: MarkdownTheme = 'purple';

  constructor() {
    super();
  }

  @OnEvent('connected', true)
  onConnected() {
    console.log('DocHeaderComponent constructed, reading theme from local storage');
    this.theme = LocalStorageService.get('docs-theme') ?? 'purple';
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({
        name: 'docs:theme-change',
        data: {theme: this.theme}
      });

  }

  /**
   * Markdown theme changed via the picker or any other publisher.
   * Read the new theme from event.data, store it, then re-render so the
   * icon colour and the selected option in the picker both update.
   *
   * WHY this works for doc-content but not here before the fix:
   * doc-content was reading event.data and writing this.theme; the old
   * handler here only called updateHTML() without updating this.theme first,
   * so the hardcoded color="purple" never changed.
   */
  @OnEvent('docs:theme-change')
  onThemeChange(event: ApplicationEvent<'docs:theme-change'>) {
    const incoming = event?.data?.theme;
    if (incoming) {
      this.theme = incoming;
      LocalStorageService.add('docs-theme', incoming);
    }
  }

  // ── mobile sidebar toggle ─────────────────────────────────────────────────

  @BindEvent({event: 'click', id: '#hdr-sidebar-btn'})
  handleSidebarToggle() {
    window.dispatchEvent(new CustomEvent('doc:sidebar-toggle'));
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private get breadcrumb(): string {
    const file = this.activeFile ?? 'Getting-Started.md';
    return file.replace('.md', '').replace(/-/g, ' ');
  }


  render(): string {
    return HTML`
            <header class="sticky top-0 z-40 w-full
                           border-b border-gray-200 dark:border-gray-800
                           bg-white/90 dark:bg-gray-950/90
                           backdrop-blur-md
                           font-dm">

                <div class="flex items-center justify-between h-14 px-4 lg:px-6">

                    <!-- Left: mobile sidebar button + logo + breadcrumb -->
                    <div class="flex items-center gap-3 min-w-0">

                        <!-- Mobile sidebar toggle — hidden on lg+ -->
                        <button id="hdr-sidebar-btn"
                                class="lg:hidden flex items-center justify-center
                                       w-9 h-9 rounded-lg
                                       text-gray-600 dark:text-gray-300
                                       hover:bg-gray-100 dark:hover:bg-gray-800
                                       transition-colors duration-150"
                                aria-label="Toggle sidebar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="3" y1="6"  x2="21" y2="6"/>
                                <line x1="3" y1="12" x2="21" y2="12"/>
                                <line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>

                        <!-- Logo / back home -->
                        <a href="/"
                           class="hidden lg:flex items-center gap-1.5 shrink-0
                                  font-extrabold text-xl
                                  text-gray-900 dark:text-gray-100
                                  hover:text-purple-600 dark:hover:text-purple-400
                                  transition-colors duration-150">
                            Dota
                        </a>

                        <span class="hidden lg:block text-gray-300 dark:text-gray-600 text-lg select-none">/</span>

                        <span class="hidden lg:block text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">
                            Docs
                        </span>

                        <span class="hidden lg:block text-gray-300 dark:text-gray-600 text-lg select-none">/</span>

                        <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate capitalize">
                            ${this.breadcrumb}
                        </span>
                    </div>

                    <!-- Right: theme picker popover + dark toggle + github -->
                    <div class="flex items-center gap-1.5 shrink-0">

                        <!-- Theme picker popover -->
                        <dota-popover placement="bottom-end" offset="8" anchored-selector="theme-picker">
                            <dota-icon name="material-symbols-light:circles-rounded" color="${this.theme}" variant="ghost" size="md"></dota-icon>
                        </dota-popover>
                        <dark-mode-button color="${this.theme}"></dark-mode-button>
                        <github-button></github-button>
                    </div>
                </div>
            </header>
        `;
  }
}

