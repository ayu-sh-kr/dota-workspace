import {BaseElement, Component, HostListener, HTML, Property, String, WindowListener} from "@ayu-sh-kr/dota-core";
import type {TocEntry} from "@dota/service/markdown.service.ts";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-event";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import {THEMES, type ColorName, type ThemeName} from "@ayu-sh-kr/dota-md";


/**
 * Derive TOC link/bar classes from the dota-md color token for `a` on the
 * active theme+color combo. Falls back to neutral gray if tokens are absent.
 */
function tocClasses(theme: ThemeName, color: ColorName) {
  const entry = THEMES[theme]?.color?.[color];
  const aToken = entry?.a;
  const active  = aToken?.text  ?? 'text-indigo-600 dark:text-indigo-400';
  const hover   = aToken?.hover ?? 'hover:text-indigo-600 dark:hover:text-indigo-400';
  const borderColor = (entry?.hr?.border ?? 'border-indigo-500 dark:border-indigo-400')
    .replace('border-', 'bg-');           // convert border-* → bg-* for the bar
  return {
    link:       `text-gray-500 dark:text-gray-400 ${hover}`,
    activeLink: `${active} font-medium`,
    activeBar:  borderColor,
  };
}

/**
 * DocTocComponent
 *
 * Sticky right-hand Table of Contents panel for the docs page.
 * - The <aside> itself is sticky (mirrors doc-sidebar pattern):
 *     sticky top-14 h-[calc(100vh-3.5rem)]
 * - Listens to `docs:toc-update` to refresh headings on doc load.
 * - Listens to `docs:theme-change` to re-style with the active theme.
 * - Uses @WindowListener scroll to highlight the active heading.
 * - Intercepts anchor clicks with @HostListener to prevent page refresh
 *   and smoothly scrolls the heading into view instead.
 * - Only visible on xl+ screens.
 *
 * @selector doc-toc
 */
@Component({
  selector: 'doc-toc',
  shadow: false
})
export class DocTocComponent extends BaseElement {

  @Property({name: 'theme', type: String})
  theme: ThemeName = 'flat';

  @Property({name: 'color', type: String})
  color: ColorName = 'indigo';

  private toc: TocEntry[] = [];
  private activeId: string = '';

  constructor() {
    super();
  }

  /**
   * Lifecycle hook triggered when the component is connected to the DOM.
   * Reads the saved theme from localStorage (defaults to 'purple' if not found).
   * This ensures the TOC uses the correct theme colors on initial render.
   */
  @OnEvent('connected', true)
  onConnected() {
    this.theme = (LocalStorageService.get('docs-theme') ?? 'flat') as ThemeName;
    this.color = (LocalStorageService.get('docs-color') ?? 'indigo') as ColorName;
  }

  /**
   * Handles application-wide theme change events.
   * Extracts the new theme from event.data, updates the local theme property,
   * and triggers a re-render to apply the new color scheme to TOC links and
   * the active heading indicator bar. This keeps the TOC styling synchronized
   * with the theme picker selection in the header.
   */
  @OnEvent('docs:theme-change')
  onThemeChange(event: ApplicationEvent<'docs:theme-change'>) {
    const t = event?.data?.theme;
    if (t) { this.theme = t as ThemeName; this.updateHTML(); }
  }

  /**
   * Handles application-wide color change events.
   * Extracts the new color from event.data, updates the local color property,
   * and triggers a re-render to apply the new color scheme to TOC links and
   * the active heading indicator bar. This keeps the TOC styling synchronized
   * with the color picker selection in the header.
   */
  @OnEvent('docs:color-change')
  onColorChange(event: ApplicationEvent<'docs:color-change'>) {
    const c = event?.data?.color;
    if (c) { this.color = c as ColorName; this.updateHTML(); }
  }

  /**
   * Handles TOC update events fired when a new documentation page is loaded.
   * Extracts the fresh heading tree from event.data, replaces the current TOC,
   * and sets the first heading as the initial active item (since the page starts
   * at the top). Then triggers a re-render to display the updated TOC structure.
   * This ensures the TOC always matches the currently displayed document.
   */
  @OnEvent('docs:toc-update')
  onTocUpdate(event: ApplicationEvent<'docs:toc-update'>) {
    const data = event?.data;
    if (data?.toc) {
      this.toc = data.toc;
      this.activeId = this.flatIds(this.toc)[0] ?? '';
      this.updateHTML();
    }
  }

  /**
   * Listens to window scroll events and dynamically highlights the active heading.
   * Walks through all heading IDs top-to-bottom; the last heading whose top edge
   * is at or above the 64px header offset becomes the active one. This accounts
   * for the sticky header height so the highlight switches exactly when a heading
   * passes under the header. Updates the active ID and re-renders only if changed.
   */
  @WindowListener({event: 'scroll'})
  onScroll() {
    const ids = this.flatIds(this.toc);
    if (!ids.length) return;

    // Walk headings top-to-bottom; last one whose top is ≤ header height wins
    const HEADER_OFFSET = 64; // px — matches sticky header h-16 (top-14 = 3.5rem = 56px + buffer)
    let current = ids[0];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= HEADER_OFFSET) {
        current = id;
      }
    }
    if (current !== this.activeId) {
      this.activeId = current;
      this.updateHTML();
    }
  }


  /**
   * Intercepts clicks on TOC anchor links to enable smooth scrolling.
   * Prevents default browser navigation (which would cause a page refresh),
   * extracts the heading ID from the clicked link's data attribute, finds
   * the target heading element, and smoothly scrolls it into view aligned
   * at the top. Also updates the active ID and re-renders to highlight the
   * clicked item, providing instant visual feedback.
   */
  @HostListener({event: 'click'})
  onTocClick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement).closest('a[data-toc-id]') as HTMLAnchorElement | null;
    if (!anchor) return;
    event.preventDefault();
    const id = anchor.dataset['tocId'];
    if (!id) return;
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({behavior: 'smooth', block: 'start'});
      this.activeId = id;
      this.updateHTML();
    }
  }

  /**
   * Recursively flattens the hierarchical TOC tree into a single array of heading IDs.
   * Walks each entry, collects its ID (if present), then recursively processes all
   * child entries to maintain document order (top-to-bottom). Used by scroll tracking
   * to determine which heading is currently visible based on scroll position.
   */
  private flatIds(entries: TocEntry[]): string[] {
    const ids: string[] = [];
    for (const e of entries) {
      if (e.id) ids.push(e.id);
      ids.push(...this.flatIds(e.children));
    }
    return ids;
  }

  /**
   * Recursively builds the HTML markup for TOC list items with proper nesting and styling.
   * Applies theme-specific classes from MarkdownThemeConfig for links and active indicators.
   * Increases left padding (pl-3, pl-6) for nested headings to create visual hierarchy.
   * Each item renders an active bar (colored vertical line), an anchor link with the heading
   * text, and recursively renders child headings if present. Active items get highlighted
   * with theme-colored text and bar, inactive ones use neutral gray tones.
   */
  private buildItems(entries: TocEntry[], depth = 0): string {
    if (!entries.length) return '';
    const toc = tocClasses(this.theme, this.color);
    const indent = depth === 0 ? '' : depth === 1 ? 'pl-3' : 'pl-6';

    return entries.map(entry => {
      const isActive  = entry.id === this.activeId;
      const linkClass = isActive ? toc.activeLink : toc.link;
      const barClass  = isActive ? toc.activeBar  : 'bg-transparent';

      const children = entry.children.length
        ? `<ul class="mt-1 space-y-1">${this.buildItems(entry.children, depth + 1)}</ul>`
        : '';

      return `
        <li class="relative">
          <span class="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-colors duration-200 ${barClass}"></span>
          <a
            href="#${entry.id}"
            data-toc-id="${entry.id}"
            class="block pl-3 pr-1 py-0.5 text-xs leading-5 truncate transition-colors duration-150 ${indent} ${linkClass}"
          >${entry.text}</a>
          ${children}
        </li>`;
    }).join('');
  }

  /**
   * Renders the sticky right-hand TOC panel visible only on xl+ screens.
   * Returns an empty spacer div if no TOC entries exist to maintain layout consistency.
   * Otherwise renders a sticky <aside> positioned at top-14 (below the header) with
   * height calc(100vh - 3.5rem) to fill the viewport minus header. Contains an "On this page"
   * label and a scrollable navigation list built by buildItems(). Includes custom scrollbar
   * styling and a left border separator. The sticky positioning keeps it visible while scrolling.
   */
  render(): string {
    if (!this.toc.length) {
      return HTML`<div class="hidden xl:block w-56 shrink-0"></div>`;
    }

    return HTML`
      <aside class="hidden xl:flex flex-col w-56 shrink-0
                    sticky top-14
                    h-[calc(100vh-3.5rem)]
                    border-l border-gray-200 dark:border-gray-800">
        <div class="overflow-y-auto flex-1 py-6 pr-2 pl-4
                    scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <p class="text-[0.65rem] font-semibold uppercase tracking-widest
                     text-gray-400 dark:text-gray-500 mb-3 px-3">
            On this page
          </p>
          <nav aria-label="Table of contents">
            <ul class="space-y-1 border-l border-gray-200 dark:border-gray-700">
              ${this.buildItems(this.toc)}
            </ul>
          </nav>
        </div>
      </aside>
    `;
  }
}

