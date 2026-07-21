import {UIConfig} from "@dota/configs/app.config.ts";

const ButtonColors = UIConfig.color as NonNullable<typeof UIConfig.color>;

/**
 * Default visual contract for `dota-button`.
 *
 * Every class is statically declared so Tailwind can emit it for library
 * consumers. `ButtonStyleConfig` can replace individual slots per instance
 * without changing the button's native semantics or interaction behavior.
 */
export const ButtonStyle = {
  base: 'inline-flex w-fit select-none items-center justify-center gap-2 whitespace-nowrap font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
  label: 'min-w-0',
  icon: 'shrink-0',
  loadingIndicator: 'size-[1em] shrink-0 animate-spin motion-reduce:animate-none',

  size: {
    xs: 'min-h-7 px-2 py-1 text-xs',
    sm: 'min-h-8 px-2.5 py-1.5 text-sm',
    md: 'min-h-10 px-3.5 py-2 text-sm',
    lg: 'min-h-11 px-4 py-2.5 text-base',
    xl: 'min-h-12 px-5 py-3 text-lg',
    '2xl': 'min-h-14 px-6 py-3.5 text-xl',
    '3xl': 'min-h-16 px-7 py-4 text-2xl',
  },

  rounded: {
    xs: 'rounded-xs',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  },

  color: ButtonColors,

  animation: {
    fill: {
      base: 'buttonFill',
      color: {
        emerald: 'after:bg-emerald-400 before:bg-emerald-500 dark:before:bg-emerald-500 hover:text-white',
        blue: 'after:bg-blue-400 before:bg-blue-500 dark:before:bg-blue-500 hover:text-white',
        sky: 'after:bg-sky-400 before:bg-sky-500 dark:before:bg-sky-500 hover:text-white',
        indigo: 'after:bg-indigo-400 before:bg-indigo-500 dark:before:bg-indigo-500 hover:text-white',
        purple: 'after:bg-purple-400 before:bg-purple-500 dark:before:bg-purple-500 hover:text-white',
        cyan: 'after:bg-cyan-400 before:bg-cyan-500 dark:before:bg-cyan-500 hover:text-white',
        green: 'after:bg-green-400 before:bg-green-500 dark:before:bg-green-500 hover:text-white',
        teal: 'after:bg-teal-400 before:bg-teal-500 dark:before:bg-teal-500 hover:text-white',
        orange: 'after:bg-orange-400 before:bg-orange-500 dark:before:bg-orange-500 hover:text-white',
        yellow: 'after:bg-yellow-400 before:bg-yellow-500 dark:before:bg-yellow-500 hover:text-white',
        rose: 'after:bg-rose-400 before:bg-rose-500 dark:before:bg-rose-500 hover:text-white',
        violet: 'after:bg-violet-400 before:bg-violet-500 dark:before:bg-violet-500 hover:text-white',
        slate: 'after:bg-slate-400 before:bg-slate-500 dark:before:bg-slate-500 hover:text-white',
        gray: 'after:bg-gray-400 before:bg-gray-500 dark:before:bg-gray-500 hover:text-white',
        pink: 'after:bg-pink-400 before:bg-pink-500 dark:before:bg-pink-500 hover:text-white',
        fuchsia: 'after:bg-fuchsia-400 before:bg-fuchsia-500 dark:before:bg-fuchsia-500 hover:text-white',
      },
    },
  },
} as const;

export type ButtonColor = keyof typeof ButtonColors;
export type ButtonVariants = keyof typeof ButtonStyle.color[ButtonColor];
export type ButtonAnimation = keyof typeof ButtonStyle.animation;
export type ButtonAnimationColor = keyof typeof ButtonStyle.animation.fill.color;
export type ButtonSize = keyof typeof ButtonStyle.size;
export type ButtonRound = keyof typeof ButtonStyle.rounded;
export type IconPosition = 'leading' | 'forward';
export type ButtonType = 'button' | 'submit' | 'reset';

/** Per-instance replacements for selected visual slots of `dota-button`. */
export interface ButtonStyleConfig {
  base?: string;
  label?: string;
  icon?: string;
  loadingIndicator?: string;
  size?: Partial<Record<ButtonSize, string>>;
  rounded?: Partial<Record<ButtonRound, string>>;
  color?: Partial<Record<ButtonColor, Partial<Record<ButtonVariants, string>>>>;
  animation?: Partial<Record<ButtonAnimation, {
    base?: string;
    color?: Partial<Record<ButtonAnimationColor, string>>;
  }>>;
}
