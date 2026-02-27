import type { TocEntry } from '@dota/services/md.service.ts';
import type { ThemeName } from '@dota/themes.ts';
import type { ColorName } from '@dota/Types.ts';
import { THEMES } from '@dota/themes.ts';

// ─── TocClasses ───────────────────────────────────────────────────────────────

export interface TocClasses {
  /** Classes applied to every non-active TOC link. */
  link: string;
  /** Classes applied to the currently active TOC link. */
  activeLink: string;
  /** Background class used for the active left-side indicator bar. */
  activeBar: string;
}

// ─── TocUtils ─────────────────────────────────────────────────────────────────

/**
 * `TocUtils` — static helpers shared across the standalone `md-toc` component
 * and any consuming application that wants to build its own TOC UI.
 *
 * ### Responsibilities
 * - Resolve Tailwind classes for links / active-bar from a `Theme` + `ColorName`.
 * - Flatten a nested `TocEntry[]` tree into an ordered list of heading IDs.
 * - Build the inner HTML string for a TOC list (recursive, theme-aware).
 * - Smooth-scroll a heading element into view below a sticky header.
 * - Determine which heading ID is "active" given the current scroll position.
 */
export class TocUtils {

  // ── Theme ──────────────────────────────────────────────────────────────────

  /**
   * Derive the three Tailwind class strings needed to render a TOC from the
   * active `theme` + `color` combo.
   *
   * - `link`       — inactive link (muted text + hover)
   * - `activeLink` — active link (accent text + medium weight)
   * - `activeBar`  — background colour for the left-side indicator bar
   *
   * Falls back to indigo tokens when the theme / color entry is absent.
   */
  static resolveClasses(theme: ThemeName, color: ColorName): TocClasses {
    const entry   = THEMES[theme]?.color?.[color];
    const aToken  = entry?.a;
    const active  = aToken?.text  ?? 'text-indigo-600 dark:text-indigo-400';
    const hover   = aToken?.hover ?? 'hover:text-indigo-600 dark:hover:text-indigo-400';
    // Convert the hr border colour to a bg colour for the indicator bar
    const borderColor = (entry?.hr?.border ?? 'border-indigo-500 dark:border-indigo-400')
      .replace(/\bborder-/g, 'bg-');
    return {
      link:       `text-gray-500 dark:text-gray-400 ${hover}`,
      activeLink: `${active} font-medium`,
      activeBar:  borderColor,
    };
  }

  // ── Tree helpers ───────────────────────────────────────────────────────────

  /**
   * Recursively flatten a nested `TocEntry[]` tree into a single ordered
   * array of heading IDs (document order, top to bottom).
   */
  static flatIds(entries: TocEntry[]): string[] {
    const ids: string[] = [];
    for (const e of entries) {
      if (e.id) ids.push(e.id);
      ids.push(...TocUtils.flatIds(e.children));
    }
    return ids;
  }

  /**
   * Recursively build the inner HTML string for a TOC `<ul>` list.
   *
   * @param entries    The TOC entries to render.
   * @param activeId   ID of the heading currently in view.
   * @param classes    Resolved `TocClasses` from `TocUtils.resolveClasses`.
   * @param depth      Current nesting depth (0 = root); used for indent.
   */
  static buildItems(
    entries:  TocEntry[],
    activeId: string,
    classes:  TocClasses,
    depth   = 0,
  ): string {
    if (!entries.length) return '';
    const indent = depth === 0 ? '' : depth === 1 ? 'pl-3' : 'pl-6';

    return entries.map(entry => {
      const isActive  = entry.id === activeId;
      const linkClass = isActive ? classes.activeLink : classes.link;
      const barClass  = isActive ? classes.activeBar  : 'bg-transparent';

      const children = entry.children.length
        ? `<ul class="mt-1 space-y-1">${TocUtils.buildItems(entry.children, activeId, classes, depth + 1)}</ul>`
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

  // ── Scroll helpers ─────────────────────────────────────────────────────────

  /**
   * Smooth-scroll `el` into view so it appears just below the sticky header.
   *
   * @param el           The heading `HTMLElement` to scroll to.
   * @param headerHeight Height of the sticky header in pixels (default: 64).
   * @param gap          Additional gap below the header in pixels (default: 8).
   */
  static scrollBelowHeader(el: HTMLElement, headerHeight = 64, gap = 8): void {
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - gap;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  /**
   * Walk all heading IDs in document order and return the one that is
   * currently "in view" — defined as the last heading whose top edge is
   * at or above `headerHeight + activationZone` from the viewport top.
   *
   * @param ids            Ordered heading IDs (from `TocUtils.flatIds`).
   * @param headerHeight   Height of the sticky header in pixels (default: 64).
   * @param activationZone Extra pixels below the header before a heading
   *                       becomes active (default: 120).
   */
  static resolveActiveId(
    ids:            string[],
    headerHeight  = 64,
    activationZone= 120,
  ): string {
    if (!ids.length) return '';
    const threshold = headerHeight + activationZone;
    let current = ids[0];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= threshold) {
        current = id;
      }
    }
    return current;
  }
}

