import {
  BaseElement,
  Component,
  HostListener,
  Property,
  String,
  WindowListener,
} from '@ayu-sh-kr/dota-core';
import { type ApplicationEvent, OnEvent } from '@ayu-sh-kr/dota-event';
import { type TocEntry } from '@dota/services/md.service.ts';
import { type ThemeName } from '@dota/themes.ts';
import { type ColorName } from '@dota/Types.ts';
import { TocUtils } from '@dota/toc-utils.ts';

/**
 * `<md-toc>` — standalone, generic Table of Contents component for `dota-md`.
 *
 * ### Features
 * - Listens to `md:render` to pick up fresh TOC entries whenever new content
 *   is rendered via `MDService.render({ publish: true })`.
 * - Listens to `md:theme-change` / `md:color-change` to stay in sync with the
 *   active theme and accent colour.
 * - Highlights the active heading as the user scrolls using a window scroll
 *   listener (delegated to `TocUtils.resolveActiveId`).
 * - Intercepts anchor clicks and smooth-scrolls the target heading below the
 *   sticky header (delegated to `TocUtils.scrollBelowHeader`).
 *
 * ### Attributes
 * | Attribute      | Default    | Description                                     |
 * |----------------|------------|-------------------------------------------------|
 * | `theme`        | `'flat'`   | Theme name — must be a key of `THEMES`.         |
 * | `color`        | `'indigo'` | Accent colour — a `ColorName` key.              |
 * | `header-height`| `64`       | Sticky header height in px for scroll offsets.  |
 * | `label`        | `'On this page'` | Text shown above the TOC list.          |
 *
 * ### Events consumed
 * | Event              | Payload                  |
 * |--------------------|--------------------------|
 * | `md:render`        | `{ html, toc }`          |
 * | `md:theme-change`  | `{ theme: string }`      |
 * | `md:color-change`  | `{ color: string }`      |
 *
 * @selector md-toc
 *
 * @example
 * ```html
 * <md-toc theme="flat" color="indigo"></md-toc>
 * ```
 */
@Component({
  selector: 'md-toc',
  shadow: false,
})
export class MdTocComponent extends BaseElement {

  // ── Observed attributes ────────────────────────────────────────────────────

  @Property({ name: 'theme', type: String })
  theme: ThemeName = 'flat';

  @Property({ name: 'color', type: String })
  color: ColorName = 'indigo';

  /**
   * Sticky header height in pixels.  Must match your layout's header height, so
   * scroll-into-view and the active-heading threshold are calculated correctly.
   * Attribute: `header-height` (string, parsed as integer internally).
   */
  @Property({ name: 'header-height', type: String })
  headerHeight: string = '64';

  /**
   * Label shown in small caps above the TOC list.
   * Attribute: `label`.
   */
  @Property({ name: 'label', type: String })
  label: string = 'On this page';

  private _toc: TocEntry[] = [];
  private _activeId: string = '';

  constructor() {
    super();
  }

  /**
   * Receives new TOC entries whenever `MDService.render({ publish: true })`
   * fires an ` md:render` event.  Resets the active heading to the first entry
   * and re-renders the list.
   */
  @OnEvent('md:render')
  onRender(event: ApplicationEvent<'md:render'>) {
    const data = event?.data;
    if (data?.toc) {
      this._toc = data.toc;
      this._activeId = TocUtils.flatIds(this._toc)[0] ?? '';
      this.updateHTML();
    }
  }

  /**
   * Keeps the TOC styling in sync when the user switches the active theme.
   */
  @OnEvent('md:theme-change')
  onThemeChange(event: ApplicationEvent<'md:theme-change'>) {
    const t = event?.data?.theme;
    if (t) {
      this.theme = t as ThemeName;
      this.updateHTML();
    }
  }

  /**
   * Keeps the TOC styling in sync when the user switches the accent colour.
   */
  @OnEvent('md:color-change')
  onColorChange(event: ApplicationEvent<'md:color-change'>) {
    const c = event?.data?.color;
    if (c) {
      this.color = c as ColorName;
      this.updateHTML();
    }
  }

  /**
   * On every scroll tick, determine which heading is currently in view and
   * update the active ID. Only triggers a re-render when the active heading
   * actually changes (avoids thrashing).
   */
  @WindowListener({ event: 'scroll' })
  onScroll() {
    const ids = TocUtils.flatIds(this._toc);
    if (!ids.length) return;

    const h       = this._headerHeightPx;
    const current = TocUtils.resolveActiveId(ids, h);
    if (current !== this._activeId) {
      this._activeId = current;
      this.updateHTML();
    }
  }

  /**
   * Intercepts clicks on TOC anchor links, prevents navigation, smooth-scrolls
   * the target heading below the sticky header, and updates the active ID.
   */
  @HostListener({ event: 'click' })
  onTocClick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement).closest(
      'a[data-toc-id]',
    ) as HTMLAnchorElement | null;
    if (!anchor) return;
    event.preventDefault();

    const id = anchor.dataset['tocId'];
    if (!id) return;

    const target = document.getElementById(id);
    if (target) {
      TocUtils.scrollBelowHeader(target, this._headerHeightPx);
      this._activeId = id;
      this.updateHTML();
    }
  }

  /** Parse the `headerHeight` string attribute as an integer (pixels). */
  private get _headerHeightPx(): number {
    return parseInt(this.headerHeight, 10) || 64;
  }


  render(): string {
    if (!this._toc.length) {
      return `<div class="hidden xl:block w-56 shrink-0"></div>`;
    }

    const classes = TocUtils.resolveClasses(this.theme, this.color);
    const items   = TocUtils.buildItems(this._toc, this._activeId, classes);

    return `
      <aside class="hidden xl:flex flex-col w-56 shrink-0
                    sticky top-14
                    h-[calc(100vh-3.5rem)]
                    border-l border-gray-200 dark:border-gray-800">
        <div class="overflow-y-auto flex-1 py-6 pr-2 pl-4
                    scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <p class="text-[0.65rem] font-semibold uppercase tracking-widest
                     text-gray-400 dark:text-gray-500 mb-3 px-3">
            ${this.label}
          </p>
          <nav aria-label="Table of contents">
            <ul class="space-y-1 border-l border-gray-200 dark:border-gray-700">
              ${items}
            </ul>
          </nav>
        </div>
      </aside>
    `;
  }
}