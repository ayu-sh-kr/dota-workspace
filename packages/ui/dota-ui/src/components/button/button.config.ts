import {UIConfig} from "@dota/configs/app.config.ts";

const ButtonStyle: Partial<UIConfig> = {
    base: 'inline-flex relative justify-center items-center w-fit transition-all duration-300 active:scale-95 ease-in-out w-full',

    size: {
        xs: 'px-1 py-0.5 text-xs',
        sm: 'px-1.5 py-1 text-sm',
        md: 'px-2 py-1 text-base',
        lg: 'px-3 py-1.5 text-lg',
        xl: 'px-4 py-0.5 text-lg',
        '2xl': 'px-5 py-0.5 text-xl',
        '3xl': 'px-5 py-0.5 text-2xl',
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

    color: {
        ...UIConfig.color
    },

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

    }

};

type ButtonVariants = keyof ColorVariants


export { ButtonStyle };
export type { ButtonVariants };
export type IconPosition = 'leading' | 'forward';
export type ButtonAnimation = keyof typeof ButtonStyle.animation
export type ButtonAnimationColor = keyof typeof ButtonStyle.animation.fill.color
export type ButtonSize = keyof typeof ButtonStyle.size;
export type ButtonRound = keyof typeof ButtonStyle.rounded;
