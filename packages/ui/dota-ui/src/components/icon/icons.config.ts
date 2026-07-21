/**
 * Default visual contract for `dota-icon`.
 *
 * Icon colors intentionally do not inherit `UIConfig.color`: those tokens are
 * designed for buttons and can produce opaque, rectangular hover surfaces.
 * These tokens keep every icon on a rounded, low-contrast surface in both themes.
 */
export const IconStyle = {
  container: 'inline-flex shrink-0 items-center justify-center align-middle leading-none',
  base: 'box-border block overflow-hidden rounded-lg p-1 transition-colors duration-150 ease-out motion-reduce:transition-none fill-current stroke-current',
  color: {
    none: {
      solid: 'text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 dark:text-gray-200 dark:bg-white/10 dark:hover:bg-white/15',
      soft: 'text-gray-700 bg-gray-100/60 hover:bg-gray-100 dark:text-gray-200 dark:bg-white/[0.07] dark:hover:bg-white/10',
      outline: 'text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-100/70 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-white/10',
      ghost: 'text-gray-700 hover:bg-gray-100/80 dark:text-gray-200 dark:hover:bg-white/10',
      link: 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white',
    },
    red: {
      solid: 'text-red-700 bg-red-100/80 hover:bg-red-200/80 dark:text-red-200 dark:bg-red-500/15 dark:hover:bg-red-500/25',
      soft: 'text-red-700 bg-red-50/80 hover:bg-red-100/80 dark:text-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20',
      outline: 'text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50/80 dark:text-red-200 dark:ring-red-400/30 dark:hover:bg-red-500/15',
      ghost: 'text-red-700 hover:bg-red-50/80 dark:text-red-200 dark:hover:bg-red-500/15',
      link: 'text-red-700 hover:text-red-900 dark:text-red-200 dark:hover:text-red-100',
    },
    yellow: {
      solid: 'text-yellow-700 bg-yellow-100/80 hover:bg-yellow-200/80 dark:text-yellow-200 dark:bg-yellow-500/15 dark:hover:bg-yellow-500/25',
      soft: 'text-yellow-700 bg-yellow-50/80 hover:bg-yellow-100/80 dark:text-yellow-200 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20',
      outline: 'text-yellow-700 ring-1 ring-inset ring-yellow-200 hover:bg-yellow-50/80 dark:text-yellow-200 dark:ring-yellow-400/30 dark:hover:bg-yellow-500/15',
      ghost: 'text-yellow-700 hover:bg-yellow-50/80 dark:text-yellow-200 dark:hover:bg-yellow-500/15',
      link: 'text-yellow-700 hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100',
    },
    rose: {
      solid: 'text-rose-700 bg-rose-100/80 hover:bg-rose-200/80 dark:text-rose-200 dark:bg-rose-500/15 dark:hover:bg-rose-500/25',
      soft: 'text-rose-700 bg-rose-50/80 hover:bg-rose-100/80 dark:text-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20',
      outline: 'text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50/80 dark:text-rose-200 dark:ring-rose-400/30 dark:hover:bg-rose-500/15',
      ghost: 'text-rose-700 hover:bg-rose-50/80 dark:text-rose-200 dark:hover:bg-rose-500/15',
      link: 'text-rose-700 hover:text-rose-900 dark:text-rose-200 dark:hover:text-rose-100',
    },
    emerald: {
      solid: 'text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200/80 dark:text-emerald-200 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25',
      soft: 'text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 dark:text-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20',
      outline: 'text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-50/80 dark:text-emerald-200 dark:ring-emerald-400/30 dark:hover:bg-emerald-500/15',
      ghost: 'text-emerald-700 hover:bg-emerald-50/80 dark:text-emerald-200 dark:hover:bg-emerald-500/15',
      link: 'text-emerald-700 hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-emerald-100',
    },
    green: {
      solid: 'text-green-700 bg-green-100/80 hover:bg-green-200/80 dark:text-green-200 dark:bg-green-500/15 dark:hover:bg-green-500/25',
      soft: 'text-green-700 bg-green-50/80 hover:bg-green-100/80 dark:text-green-200 dark:bg-green-500/10 dark:hover:bg-green-500/20',
      outline: 'text-green-700 ring-1 ring-inset ring-green-200 hover:bg-green-50/80 dark:text-green-200 dark:ring-green-400/30 dark:hover:bg-green-500/15',
      ghost: 'text-green-700 hover:bg-green-50/80 dark:text-green-200 dark:hover:bg-green-500/15',
      link: 'text-green-700 hover:text-green-900 dark:text-green-200 dark:hover:text-green-100',
    },
    blue: {
      solid: 'text-blue-700 bg-blue-100/80 hover:bg-blue-200/80 dark:text-blue-200 dark:bg-blue-500/15 dark:hover:bg-blue-500/25',
      soft: 'text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 dark:text-blue-200 dark:bg-blue-500/10 dark:hover:bg-blue-500/20',
      outline: 'text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-50/80 dark:text-blue-200 dark:ring-blue-400/30 dark:hover:bg-blue-500/15',
      ghost: 'text-blue-700 hover:bg-blue-50/80 dark:text-blue-200 dark:hover:bg-blue-500/15',
      link: 'text-blue-700 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100',
    },
    cyan: {
      solid: 'text-cyan-700 bg-cyan-100/80 hover:bg-cyan-200/80 dark:text-cyan-200 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25',
      soft: 'text-cyan-700 bg-cyan-50/80 hover:bg-cyan-100/80 dark:text-cyan-200 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20',
      outline: 'text-cyan-700 ring-1 ring-inset ring-cyan-200 hover:bg-cyan-50/80 dark:text-cyan-200 dark:ring-cyan-400/30 dark:hover:bg-cyan-500/15',
      ghost: 'text-cyan-700 hover:bg-cyan-50/80 dark:text-cyan-200 dark:hover:bg-cyan-500/15',
      link: 'text-cyan-700 hover:text-cyan-900 dark:text-cyan-200 dark:hover:text-cyan-100',
    },
    teal: {
      solid: 'text-teal-700 bg-teal-100/80 hover:bg-teal-200/80 dark:text-teal-200 dark:bg-teal-500/15 dark:hover:bg-teal-500/25',
      soft: 'text-teal-700 bg-teal-50/80 hover:bg-teal-100/80 dark:text-teal-200 dark:bg-teal-500/10 dark:hover:bg-teal-500/20',
      outline: 'text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50/80 dark:text-teal-200 dark:ring-teal-400/30 dark:hover:bg-teal-500/15',
      ghost: 'text-teal-700 hover:bg-teal-50/80 dark:text-teal-200 dark:hover:bg-teal-500/15',
      link: 'text-teal-700 hover:text-teal-900 dark:text-teal-200 dark:hover:text-teal-100',
    },
    gray: {
      solid: 'text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 dark:text-gray-200 dark:bg-gray-500/15 dark:hover:bg-gray-500/25',
      soft: 'text-gray-700 bg-gray-50/80 hover:bg-gray-100/80 dark:text-gray-200 dark:bg-gray-500/10 dark:hover:bg-gray-500/20',
      outline: 'text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50/80 dark:text-gray-200 dark:ring-gray-400/30 dark:hover:bg-gray-500/15',
      ghost: 'text-gray-700 hover:bg-gray-50/80 dark:text-gray-200 dark:hover:bg-gray-500/15',
      link: 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100',
    },
    purple: {
      solid: 'text-purple-700 bg-purple-100/80 hover:bg-purple-200/80 dark:text-purple-200 dark:bg-purple-500/15 dark:hover:bg-purple-500/25',
      soft: 'text-purple-700 bg-purple-50/80 hover:bg-purple-100/80 dark:text-purple-200 dark:bg-purple-500/10 dark:hover:bg-purple-500/20',
      outline: 'text-purple-700 ring-1 ring-inset ring-purple-200 hover:bg-purple-50/80 dark:text-purple-200 dark:ring-purple-400/30 dark:hover:bg-purple-500/15',
      ghost: 'text-purple-700 hover:bg-purple-50/80 dark:text-purple-200 dark:hover:bg-purple-500/15',
      link: 'text-purple-700 hover:text-purple-900 dark:text-purple-200 dark:hover:text-purple-100',
    },
    violet: {
      solid: 'text-violet-700 bg-violet-100/80 hover:bg-violet-200/80 dark:text-violet-200 dark:bg-violet-500/15 dark:hover:bg-violet-500/25',
      soft: 'text-violet-700 bg-violet-50/80 hover:bg-violet-100/80 dark:text-violet-200 dark:bg-violet-500/10 dark:hover:bg-violet-500/20',
      outline: 'text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-50/80 dark:text-violet-200 dark:ring-violet-400/30 dark:hover:bg-violet-500/15',
      ghost: 'text-violet-700 hover:bg-violet-50/80 dark:text-violet-200 dark:hover:bg-violet-500/15',
      link: 'text-violet-700 hover:text-violet-900 dark:text-violet-200 dark:hover:text-violet-100',
    },
    pink: {
      solid: 'text-pink-700 bg-pink-100/80 hover:bg-pink-200/80 dark:text-pink-200 dark:bg-pink-500/15 dark:hover:bg-pink-500/25',
      soft: 'text-pink-700 bg-pink-50/80 hover:bg-pink-100/80 dark:text-pink-200 dark:bg-pink-500/10 dark:hover:bg-pink-500/20',
      outline: 'text-pink-700 ring-1 ring-inset ring-pink-200 hover:bg-pink-50/80 dark:text-pink-200 dark:ring-pink-400/30 dark:hover:bg-pink-500/15',
      ghost: 'text-pink-700 hover:bg-pink-50/80 dark:text-pink-200 dark:hover:bg-pink-500/15',
      link: 'text-pink-700 hover:text-pink-900 dark:text-pink-200 dark:hover:text-pink-100',
    },
    sky: {
      solid: 'text-sky-700 bg-sky-100/80 hover:bg-sky-200/80 dark:text-sky-200 dark:bg-sky-500/15 dark:hover:bg-sky-500/25',
      soft: 'text-sky-700 bg-sky-50/80 hover:bg-sky-100/80 dark:text-sky-200 dark:bg-sky-500/10 dark:hover:bg-sky-500/20',
      outline: 'text-sky-700 ring-1 ring-inset ring-sky-200 hover:bg-sky-50/80 dark:text-sky-200 dark:ring-sky-400/30 dark:hover:bg-sky-500/15',
      ghost: 'text-sky-700 hover:bg-sky-50/80 dark:text-sky-200 dark:hover:bg-sky-500/15',
      link: 'text-sky-700 hover:text-sky-900 dark:text-sky-200 dark:hover:text-sky-100',
    },
    orange: {
      solid: 'text-orange-700 bg-orange-100/80 hover:bg-orange-200/80 dark:text-orange-200 dark:bg-orange-500/15 dark:hover:bg-orange-500/25',
      soft: 'text-orange-700 bg-orange-50/80 hover:bg-orange-100/80 dark:text-orange-200 dark:bg-orange-500/10 dark:hover:bg-orange-500/20',
      outline: 'text-orange-700 ring-1 ring-inset ring-orange-200 hover:bg-orange-50/80 dark:text-orange-200 dark:ring-orange-400/30 dark:hover:bg-orange-500/15',
      ghost: 'text-orange-700 hover:bg-orange-50/80 dark:text-orange-200 dark:hover:bg-orange-500/15',
      link: 'text-orange-700 hover:text-orange-900 dark:text-orange-200 dark:hover:text-orange-100',
    },
    slate: {
      solid: 'text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 dark:text-slate-200 dark:bg-slate-500/15 dark:hover:bg-slate-500/25',
      soft: 'text-slate-700 bg-slate-50/80 hover:bg-slate-100/80 dark:text-slate-200 dark:bg-slate-500/10 dark:hover:bg-slate-500/20',
      outline: 'text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50/80 dark:text-slate-200 dark:ring-slate-400/30 dark:hover:bg-slate-500/15',
      ghost: 'text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-slate-500/15',
      link: 'text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-100',
    },
    indigo: {
      solid: 'text-indigo-700 bg-indigo-100/80 hover:bg-indigo-200/80 dark:text-indigo-200 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25',
      soft: 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 dark:text-indigo-200 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20',
      outline: 'text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50/80 dark:text-indigo-200 dark:ring-indigo-400/30 dark:hover:bg-indigo-500/15',
      ghost: 'text-indigo-700 hover:bg-indigo-50/80 dark:text-indigo-200 dark:hover:bg-indigo-500/15',
      link: 'text-indigo-700 hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-indigo-100',
    },
    fuchsia: {
      solid: 'text-fuchsia-700 bg-fuchsia-100/80 hover:bg-fuchsia-200/80 dark:text-fuchsia-200 dark:bg-fuchsia-500/15 dark:hover:bg-fuchsia-500/25',
      soft: 'text-fuchsia-700 bg-fuchsia-50/80 hover:bg-fuchsia-100/80 dark:text-fuchsia-200 dark:bg-fuchsia-500/10 dark:hover:bg-fuchsia-500/20',
      outline: 'text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200 hover:bg-fuchsia-50/80 dark:text-fuchsia-200 dark:ring-fuchsia-400/30 dark:hover:bg-fuchsia-500/15',
      ghost: 'text-fuchsia-700 hover:bg-fuchsia-50/80 dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/15',
      link: 'text-fuchsia-700 hover:text-fuchsia-900 dark:text-fuchsia-200 dark:hover:text-fuchsia-100',
    },
    zinc: {
      solid: 'text-zinc-700 bg-zinc-100/80 hover:bg-zinc-200/80 dark:text-zinc-200 dark:bg-zinc-500/15 dark:hover:bg-zinc-500/25',
      soft: 'text-zinc-700 bg-zinc-50/80 hover:bg-zinc-100/80 dark:text-zinc-200 dark:bg-zinc-500/10 dark:hover:bg-zinc-500/20',
      outline: 'text-zinc-700 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50/80 dark:text-zinc-200 dark:ring-zinc-400/30 dark:hover:bg-zinc-500/15',
      ghost: 'text-zinc-700 hover:bg-zinc-50/80 dark:text-zinc-200 dark:hover:bg-zinc-500/15',
      link: 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100',
    },
    amber: {
      solid: 'text-amber-700 bg-amber-100/80 hover:bg-amber-200/80 dark:text-amber-200 dark:bg-amber-500/15 dark:hover:bg-amber-500/25',
      soft: 'text-amber-700 bg-amber-50/80 hover:bg-amber-100/80 dark:text-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20',
      outline: 'text-amber-700 ring-1 ring-inset ring-amber-200 hover:bg-amber-50/80 dark:text-amber-200 dark:ring-amber-400/30 dark:hover:bg-amber-500/15',
      ghost: 'text-amber-700 hover:bg-amber-50/80 dark:text-amber-200 dark:hover:bg-amber-500/15',
      link: 'text-amber-700 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100',
    },
    lime: {
      solid: 'text-lime-700 bg-lime-100/80 hover:bg-lime-200/80 dark:text-lime-200 dark:bg-lime-500/15 dark:hover:bg-lime-500/25',
      soft: 'text-lime-700 bg-lime-50/80 hover:bg-lime-100/80 dark:text-lime-200 dark:bg-lime-500/10 dark:hover:bg-lime-500/20',
      outline: 'text-lime-700 ring-1 ring-inset ring-lime-200 hover:bg-lime-50/80 dark:text-lime-200 dark:ring-lime-400/30 dark:hover:bg-lime-500/15',
      ghost: 'text-lime-700 hover:bg-lime-50/80 dark:text-lime-200 dark:hover:bg-lime-500/15',
      link: 'text-lime-700 hover:text-lime-900 dark:text-lime-200 dark:hover:text-lime-100',
    },
    stone: {
      solid: 'text-stone-700 bg-stone-100/80 hover:bg-stone-200/80 dark:text-stone-200 dark:bg-stone-500/15 dark:hover:bg-stone-500/25',
      soft: 'text-stone-700 bg-stone-50/80 hover:bg-stone-100/80 dark:text-stone-200 dark:bg-stone-500/10 dark:hover:bg-stone-500/20',
      outline: 'text-stone-700 ring-1 ring-inset ring-stone-200 hover:bg-stone-50/80 dark:text-stone-200 dark:ring-stone-400/30 dark:hover:bg-stone-500/15',
      ghost: 'text-stone-700 hover:bg-stone-50/80 dark:text-stone-200 dark:hover:bg-stone-500/15',
      link: 'text-stone-700 hover:text-stone-900 dark:text-stone-200 dark:hover:text-stone-100',
    },
    neutral: {
      solid: 'text-neutral-700 bg-neutral-100/80 hover:bg-neutral-200/80 dark:text-neutral-200 dark:bg-neutral-500/15 dark:hover:bg-neutral-500/25',
      soft: 'text-neutral-700 bg-neutral-50/80 hover:bg-neutral-100/80 dark:text-neutral-200 dark:bg-neutral-500/10 dark:hover:bg-neutral-500/20',
      outline: 'text-neutral-700 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50/80 dark:text-neutral-200 dark:ring-neutral-400/30 dark:hover:bg-neutral-500/15',
      ghost: 'text-neutral-700 hover:bg-neutral-50/80 dark:text-neutral-200 dark:hover:bg-neutral-500/15',
      link: 'text-neutral-700 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-neutral-100',
    },
  },
  size: {
    sm: 'size-5',
    md: 'size-6',
    lg: 'size-7',
    xl: 'size-8',
    '2xl': 'size-10',
    '3xl': 'size-12',
  },
} as const;

export type IconSize = keyof typeof IconStyle.size;
export type IconColor = keyof typeof IconStyle.color;
export type IconVariant = keyof typeof IconStyle.color[IconColor];

/** Per-instance replacements for selected visual slots of `dota-icon`. */
export interface IconStyleConfig {
  container?: string;
  base?: string;
  size?: Partial<Record<IconSize, string>>;
  color?: Partial<Record<IconColor, Partial<Record<IconVariant, string>>>>;
}
