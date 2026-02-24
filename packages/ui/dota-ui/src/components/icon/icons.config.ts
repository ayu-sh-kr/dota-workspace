import {UIConfig} from "@dota/configs/app.config.ts";

export const IconStyle = {
    shadow: 'shadow-sm',
    base: 'overflow-hidden rounded-md focus:outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0 relative font-medium',
    color: {
      ...UIConfig.color
    },

    size: {
        sm: 'p-0.5 size-4',
        md: 'p-0.5 size-6',
        lg: 'p-1 size-8',
        xl: 'p-1 size-10',
        '2xl': 'p-1.5 size-12',
        '3xl': 'p-1.5 size-14'
    }
}

type IconSize = keyof typeof IconStyle.size;
type IconColor = keyof typeof IconStyle.color;
type IconVariant = keyof ColorVariants

export type {IconSize, IconVariant, IconColor}