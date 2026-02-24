

const BadgeStyle = {
    base: 'inline-flex item-center text-center w-fit px-3 py-1',

    rounded: {
        'none': '',
        'sm': 'rounded-sm',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'xl': 'rounded-xl'
    },

    size: {
        xs: 'text-xs',
        sm: 'text-sm',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl'
    },

    color: {
        red: {
            solid: 'bg-red-500 dark:bg-red-400 text-white dark:text-gray-900',
            outline: 'text-red-500 dark:text-red-400 ring-1 ring-inset ring-red-500 dark:ring-red-400',
            soft: 'bg-red-50 dark:bg-red-400 dark:bg-opacity-10 text-red-500 dark:text-red-400',
            subtle: 'bg-red-50 dark:bg-red-400 dark:bg-opacity-10 text-red-500 dark:text-red-400 ring-1 ring-inset ring-red-500 dark:ring-red-400 ring-opacity-25 dark:ring-opacity-25',
        },
        yellow: {
            solid: 'bg-yellow-500 dark:bg-yellow-400 text-white dark:text-gray-900',
            outline: 'text-yellow-500 dark:text-yellow-400 ring-1 ring-inset ring-yellow-500 dark:ring-yellow-400',
            soft: 'bg-yellow-50 dark:bg-yellow-400 dark:bg-opacity-10 text-yellow-500 dark:text-yellow-400',
            subtle: 'bg-yellow-50 dark:bg-yellow-400 dark:bg-opacity-10 text-yellow-500 dark:text-yellow-400 ring-1 ring-inset ring-yellow-500 dark:ring-yellow-400 ring-opacity-25 dark:ring-opacity-25',
        },
        pink: {
            solid: 'bg-pink-500 dark:bg-pink-400 text-white dark:text-gray-900',
            outline: 'text-pink-500 dark:text-pink-400 ring-1 ring-inset ring-pink-500 dark:ring-pink-400',
            soft: 'bg-pink-50 dark:bg-pink-400 dark:bg-opacity-10 text-pink-500 dark:text-pink-400',
            subtle: 'bg-pink-50 dark:bg-pink-400 dark:bg-opacity-10 text-pink-500 dark:text-pink-400 ring-1 ring-inset ring-pink-500 dark:ring-pink-400 ring-opacity-25 dark:ring-opacity-25',
        },
        purple: {
            solid: 'bg-purple-500 dark:bg-purple-400 text-white dark:text-gray-900',
            outline: 'text-purple-500 dark:text-purple-400 ring-1 ring-inset ring-purple-500 dark:ring-purple-400',
            soft: 'bg-purple-50 dark:bg-purple-400 dark:bg-opacity-10 text-purple-500 dark:text-purple-400',
            subtle: 'bg-purple-50 dark:bg-purple-400 dark:bg-opacity-10 text-purple-500 dark:text-purple-400 ring-1 ring-inset ring-purple-500 dark:ring-purple-400 ring-opacity-25 dark:ring-opacity-25',
        },
        blue: {
            solid: 'bg-blue-500 dark:bg-blue-400 text-white dark:text-gray-900',
            outline: 'text-blue-500 dark:text-blue-400 ring-1 ring-inset ring-blue-500 dark:ring-blue-400',
            soft: 'bg-blue-50 dark:bg-blue-400 dark:bg-opacity-10 text-blue-500 dark:text-blue-400',
            subtle: 'bg-blue-50 dark:bg-blue-400 dark:bg-opacity-10 text-blue-500 dark:text-blue-400 ring-1 ring-inset ring-blue-500 dark:ring-blue-400 ring-opacity-25 dark:ring-opacity-25',
        },
        cyan: {
            solid: 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-gray-900',
            outline: 'text-cyan-500 dark:text-cyan-400 ring-1 ring-inset ring-cyan-500 dark:ring-cyan-400',
            soft: 'bg-cyan-50 dark:bg-cyan-400 dark:bg-opacity-10 text-cyan-500 dark:text-cyan-400',
            subtle: 'bg-cyan-50 dark:bg-cyan-400 dark:bg-opacity-10 text-cyan-500 dark:text-cyan-400 ring-1 ring-inset ring-cyan-500 dark:ring-cyan-400 ring-opacity-25 dark:ring-opacity-25',
        },
        green: {
            solid: 'bg-green-500 dark:bg-green-400 text-white dark:text-gray-900',
            outline: 'text-green-500 dark:text-green-400 ring-1 ring-inset ring-green-500 dark:ring-green-400',
            soft: 'bg-green-50 dark:bg-green-400 dark:bg-opacity-10 text-green-500 dark:text-green-400',
            subtle: 'bg-green-50 dark:bg-green-400 dark:bg-opacity-10 text-green-500 dark:text-green-400 ring-1 ring-inset ring-green-500 dark:ring-green-400 ring-opacity-25 dark:ring-opacity-25',
        },
        emerald: {
            solid: 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-gray-900',
            outline: 'text-emerald-500 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500 dark:ring-emerald-400',
            soft: 'bg-emerald-50 dark:bg-emerald-400 dark:bg-opacity-10 text-emerald-500 dark:text-emerald-400',
            subtle: 'bg-emerald-50 dark:bg-emerald-400 dark:bg-opacity-10 text-emerald-500 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500 dark:ring-emerald-400 ring-opacity-25 dark:ring-opacity-25',
        }
    }
}

type BadgeVariants = keyof typeof BadgeStyle.color.red;

type BadgeColor = keyof typeof BadgeStyle.color

type BadgeSize = keyof typeof BadgeStyle.size;

type BadgeRounded = keyof typeof BadgeStyle.rounded;

export {BadgeStyle}
export type {BadgeVariants, BadgeRounded, BadgeSize, BadgeColor}