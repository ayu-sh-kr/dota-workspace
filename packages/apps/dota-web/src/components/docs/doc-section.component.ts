import {BaseElement, Component} from "@ayu-sh-kr/dota-core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-event";
import type {ColorName, ThemeName} from "@ayu-sh-kr/dota-md";

/**
 * DocSectionComponent
 *
 * Top-level layout shell for the documentation page.
 * Renders:
 *   <doc-header>  — sticky top bar with breadcrumb + theme picker + dark toggle
 *   <doc-sidebar> — left column (desktop) / drawer (mobile)
 *   <doc-content> — scrollable markdown content area
 *
 * Listens to:
 *   'doc:theme-change'  — updates the active theme and propagates to both the
 *                         header (so the picker label stays in sync) and the
 *                         doc-content (so the markdown re-renders in the new theme).
 *   'popstate'          — re-renders to refresh the breadcrumb active file name.
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
    if (t) { this.currentTheme = t as ThemeName; }
    // Do NOT call updateHTML() — re-rendering doc-section destroys the
    // <dota-popover> elements and causes duplicate anchoredEL creation.
    // doc-content and doc-toc listen to the event directly and update themselves.
  }

  @OnEvent('docs:color-change')
  onColorChange(event: ApplicationEvent<'docs:color-change'>) {
    const c = event?.data?.color;
    if (c) { this.currentColor = c as ColorName; }
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
              <doc-content
                theme="${this.currentTheme}"
                color="${this.currentColor}"
                max-width="max-w-4xl">
              </doc-content>
            </main>
            <doc-toc
              theme="${this.currentTheme}"
              color="${this.currentColor}">
            </doc-toc>
          </div>
        </div>
      </section>
    `;
  }
}
