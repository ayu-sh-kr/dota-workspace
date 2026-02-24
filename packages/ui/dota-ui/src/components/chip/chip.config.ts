export const ChipStyle = {
    base: {
        parent: 'relative inline-flex items-center justify-center flex-shrink-0',
        chip: 'absolute rounded-full text-center text-white flex item-center justify-center'
    },

    position: {
        'top-left': 'top-0 left-0 -translate-y-1/2 -translate-x-1/2',
        'top-right': 'top-0 right-0 -translate-y-1/2 translate-x-1/2',
        'bottom-right': 'bottom-0 right-0 translate-y-1/2 translate-x-1/2',
        'bottom-left': 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2',
    },

    color: {
        red: 'bg-red-500 dark:bg-red-400',
        yellow: 'bg-yellow-500 dark:bg-yellow-400',
        rose: 'bg-rose-500 dark:bg-rose-400',
        emerald: 'bg-emerald-500 dark:bg-emerald-400',
        green: 'bg-green-500 dark:bg-green-400',
        blue: 'bg-blue-500 dark:bg-blue-400',
        cyan: 'bg-cyan-500 dark:bg-cyan-400',
        teal: 'bg-teal-500 dark:bg-teal-400',
        gray: 'bg-gray-500 dark:bg-gray-400',
        orange: 'bg-orange-500 dark:bg-orange-400',
        sky: 'bg-sky-500 dark:bg-sky-400',
        purple: 'bg-purple-500 dark:bg-purple-400',
        violet: 'bg-violet-500 dark:bg-violet-400',
        pink: 'bg-pink-500 dark:bg-pink-400'
    }
}

export type ChipPosition = keyof typeof ChipStyle.position;
export type ChipColor = keyof typeof ChipStyle.color