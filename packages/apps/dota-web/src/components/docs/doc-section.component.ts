import {ApplicationEventService, BaseElement, Component} from "@ayu-sh-kr/dota-core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-event";
import type {ColorName, ThemeName} from "@ayu-sh-kr/dota-md";

/**
 * DocSectionComponent
 *
 * Top-level layout shell for the documentation page.
 * Renders:
 *   <doc-header>  — sticky top bar with breadcrumb + theme picker + dark toggle
 *   <doc-sidebar> — left column (desktop) / drawer (mobile)
 *   <doc-content> — scrollable markdown content area (hosts <md-view>)
 *   <md-toc>      — sticky right-hand TOC panel from dota-md
 *
 * Listens to:
 *   'docs:theme-change'  — saves state and forwards as 'md:theme-change'
 *   'docs:color-change'  — saves state and forwards as 'md:color-change'
 */
@Component({
  selector: 'doc-section',
  shadow: false
})
export class DocSectionComponent extends BaseElement {

  private currentTheme: ThemeName = 'flat';
  private currentColor: ColorName = 'indigo';

  constructor() {
    super();
  }

  @OnEvent('docs:theme-change')
  onThemeChange(event: ApplicationEvent<'docs:theme-change'>) {
    const t = event?.data?.theme;
    if (t) {
      this.currentTheme = t as ThemeName;
      // Forward to md: namespace so md-view and md-toc react
      ApplicationEventService.getInstance().getPublisher()
        .publishAsync({ name: 'md:theme-change', data: { theme: t } });
    }
    // Do NOT call updateHTML() — re-rendering doc-section destroys the
    // <dota-popover> elements and causes duplicate anchoredEl creation.
  }

  @OnEvent('docs:color-change')
  onColorChange(event: ApplicationEvent<'docs:color-change'>) {
    const c = event?.data?.color;
    if (c) {
      this.currentColor = c as ColorName;
      // Forward to md: namespace so md-view and md-toc react
      ApplicationEventService.getInstance().getPublisher()
        .publishAsync({ name: 'md:color-change', data: { color: c } });
    }
    // Same — no updateHTML() here.
  }

  /** Active file name derived from the ?content= query param. */
  private get activeFile(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get('content') ?? 'Getting-Started.md';
  }

  render(): string {
    //language=HTML
    return `
      <section class="mx-auto md:max-w-7xl w-full">
        <doc-header
          active-file="${this.activeFile}"
          theme="${this.currentTheme}"
          color="${this.currentColor}">
        </doc-header>

        <div class="min-h-[calc(100vh-3.5rem)] font-dm bg-white dark:bg-gray-950">
          <div class="flex max-w-screen-2xl mx-auto min-h-[calc(100vh-3.5rem)]">
            <doc-sidebar></doc-sidebar>
            <main class="flex-1 min-w-0 overflow-auto">
              <doc-content max-width="max-w-4xl"></doc-content>
            </main>
            <md-toc header-height="64"></md-toc>
          </div>
        </div>
      </section>
    `;
  }
}
