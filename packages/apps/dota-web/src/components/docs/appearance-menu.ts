import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";

/** Classes of the `<summary>` button that opens an appearance menu. */
export const MENU_TRIGGER = 'button-secondary button-compact list-none select-none group-open:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden';

/** Classes of the floating panel below an appearance menu trigger. */
export const MENU_PANEL = 'absolute right-0 top-full z-50 mt-2 rounded-card border border-default bg-surface p-1.5 shadow-lg';

/** Chevron shown in a menu trigger; it flips while the menu is open. */
export const menuChevron = (): TemplateResult => html`<svg class="h-4 w-4 text-muted transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"/></svg>`;

/**
 * Closes the menu rendered by `host` when a click lands outside it. Because every menu does
 * this, opening one appearance menu closes any other.
 * @param host The picker component that owns the `<details>` menu.
 * @param event Any click on the document.
 */
export function closeMenuOnOutsideClick(host: HTMLElement, event: Event): void {
  if (event.target instanceof Node && host.contains(event.target)) return;
  const menu = host.querySelector('details');
  if (menu) menu.open = false;
}

/**
 * Closes the menu rendered by `host` on Escape and returns focus to its trigger.
 * @param host The picker component that owns the `<details>` menu.
 * @param event Any key press on the document.
 */
export function closeMenuOnEscape(host: HTMLElement, event: KeyboardEvent): void {
  const menu = host.querySelector('details');
  if (event.key !== 'Escape' || !menu?.open) return;
  menu.open = false;
  menu.querySelector('summary')?.focus();
}

/**
 * Marks the option whose `data-value` equals `value` as pressed and closes the menu.
 * @param host The picker component that owns the options.
 * @param value The newly active value.
 */
export function selectMenuOption(host: HTMLElement, value: string): void {
  host.querySelectorAll<HTMLElement>('[data-value]').forEach(option => {
    option.setAttribute('aria-pressed', `${option.dataset['value'] === value}`);
  });
  const menu = host.querySelector('details');
  if (menu) menu.open = false;
}
