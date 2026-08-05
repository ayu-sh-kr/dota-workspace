import {ApplicationEventService, BaseElement, Component, HostListener, Property, String} from "@ayu-sh-kr/dota-wrap/core";
import {type ApplicationEvent, OnEvent} from "@ayu-sh-kr/dota-wrap/event";
import {html, type TemplateResult} from "@ayu-sh-kr/dota-wrap/rendering";
import {LocalStorageService} from "@dota/service/local-storage.service.ts";
import type {ColorName} from "@ayu-sh-kr/dota-md";

/** Tailwind bg-500 swatch class for each ColorName. */
const COLOR_SWATCHES: { name: ColorName; bg: string; hex: string }[] = [
  { name: 'slate',   bg: 'bg-slate-500',   hex: '#64748b' },
  { name: 'gray',    bg: 'bg-gray-500',    hex: '#6b7280' },
  { name: 'zinc',    bg: 'bg-zinc-500',    hex: '#71717a' },
  { name: 'neutral', bg: 'bg-neutral-500', hex: '#737373' },
  { name: 'stone',   bg: 'bg-stone-500',   hex: '#78716c' },
  { name: 'red',     bg: 'bg-red-500',     hex: '#ef4444' },
  { name: 'orange',  bg: 'bg-orange-500',  hex: '#f97316' },
  { name: 'amber',   bg: 'bg-amber-500',   hex: '#f59e0b' },
  { name: 'yellow',  bg: 'bg-yellow-500',  hex: '#eab308' },
  { name: 'lime',    bg: 'bg-lime-500',    hex: '#84cc16' },
  { name: 'green',   bg: 'bg-green-500',   hex: '#22c55e' },
  { name: 'emerald', bg: 'bg-emerald-500', hex: '#10b981' },
  { name: 'teal',    bg: 'bg-teal-500',    hex: '#14b8a6' },
  { name: 'cyan',    bg: 'bg-cyan-500',    hex: '#06b6d4' },
  { name: 'sky',     bg: 'bg-sky-500',     hex: '#0ea5e9' },
  { name: 'blue',    bg: 'bg-blue-500',    hex: '#3b82f6' },
  { name: 'indigo',  bg: 'bg-indigo-500',  hex: '#6366f1' },
  { name: 'violet',  bg: 'bg-violet-500',  hex: '#8b5cf6' },
  { name: 'purple',  bg: 'bg-purple-500',  hex: '#a855f7' },
  { name: 'fuchsia', bg: 'bg-fuchsia-500', hex: '#d946ef' },
  { name: 'pink',    bg: 'bg-pink-500',    hex: '#ec4899' },
  { name: 'rose',    bg: 'bg-rose-500',    hex: '#f43f5e' },
];

@Component({
  selector: 'color-picker',
  shadow: false
})
export class ColorPickerComponent extends BaseElement {

  @Property({name: 'current-color', type: String})
  currentColor: ColorName = 'indigo';

  constructor() {
    super();
  }

  @OnEvent('connected', true)
  onConnected() {
    const saved = LocalStorageService.get('docs-color') as ColorName | null;
    if (saved && saved !== this.currentColor) {
      this.currentColor = saved;
      this.updateHTML();
    }
  }

  @OnEvent('docs:color-change')
  onColorChange(event: ApplicationEvent<'docs:color-change'>) {
    const c = event?.data?.color as ColorName | undefined;
    if (c && c !== this.currentColor) {
      this.currentColor = c;
      this.updateHTML();
    }
  }

  private selectColor(color: ColorName) {
    if (color !== this.currentColor) {
      this.currentColor = color;
      this.updateHTML();
    }
    LocalStorageService.add('docs-color', color);
    const popover = document.querySelector<HTMLElement & {close?: () => void}>(
      'dota-popover[anchored-selector="color-picker"]'
    );
    ApplicationEventService.getInstance()
      .getPublisher()
      .publishAsync({ name: 'docs:color-change', data: { color } });
    popover?.close?.();
  }

  private buildSwatches(): TemplateResult[] {
    return COLOR_SWATCHES.map(({ name, bg }) => {
      const isActive = name === this.currentColor;
      const ring = isActive
        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-gray-600 dark:ring-gray-300 scale-110'
        : 'hover:scale-110 hover:ring-2 hover:ring-offset-1 hover:ring-offset-white dark:hover:ring-offset-gray-900 hover:ring-gray-400 dark:hover:ring-gray-500';
      return html`
        <button
          data-color="${name}"
          title="${name}"
          aria-label="${`Color ${name}`}"
          class="w-6 h-6 rounded-full ${bg} transition-transform duration-150
                 focus:outline-none cursor-pointer ${ring}">
        </button>`;
    });
  }

  @HostListener({event: 'click'})
  handleClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest('[data-color]') as HTMLElement | null;
    if (target?.dataset?.['color']) {
      this.selectColor(target.dataset['color'] as ColorName);
    }
  }

  render(): TemplateResult {
    return html`
      <div class="z-[100] p-3 rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900 shadow-xl w-52">
        <p class="text-[0.6rem] font-bold uppercase tracking-widest
                   text-gray-400 dark:text-gray-500 mb-2.5 px-1">Color</p>
        <div class="grid grid-cols-7 gap-2">
          ${this.buildSwatches()}
        </div>
      </div>
    `;
  }
}
