import {UIConfig} from "@dota/configs/app.config.ts";


/**
 * Default visual contract for `dota-accordion`.
 *
 * The component resolves its container, button base, size, color/variant, and
 * paragraph classes from this object unless a per-instance `AccordionStyleConfig`
 * provides a replacement for the corresponding slot. Paragraph spacing belongs
 * here so it remains clipped inside the collapsed animation wrapper.
 */
export const AccordionStyle = {

    container: '',

    button: {
        base: 'focus:outline-none focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0 font-medium rounded-md inline-flex justify-between items-center mb-1.5 w-full',
        size: {
            '2xs': 'text-xs gap-x-1 px-2 py-1',
            xs: 'text-xs gap-x-1.5 px-2.5 py-1.5',
            sm: 'text-sm gap-x-1.5 px-2.5 py-1.5',
            md: 'text-sm gap-x-2 px-3 py-2',
            lg: 'text-sm gap-x-2.5 px-3.5 py-2.5',
            xl: 'text-base gap-x-2.5 px-3.5 py-2.5'
        },
        color: {
            ...UIConfig.color
        },
    },
    paragraph: 'px-2 pt-1.5 pb-3 text-sm text-gray-500 dark:text-gray-400'

}

/** Type representing available color options for the Accordion component */
type AccordionColor = keyof typeof AccordionStyle.button.color;
/** Type representing available size options for the Accordion component */
type AccordionSize = keyof typeof AccordionStyle.button.size;
/** Type representing available variant options for the Accordion component */
type AccordionVariant = keyof ColorVariants;

/**
 * Per-instance replacements for selected `dota-accordion` style slots.
 *
 * Supply this value as JSON through the component's `config` attribute. Omitted
 * fields retain their `AccordionStyle` default; an override can therefore theme
 * only the container, button base, a selected size/color/variant, or paragraph.
 */
export interface AccordionStyleConfig {
    container?: string;
    button?: {
        base?: string;
        size?: Partial<Record<AccordionSize, string>>;
        color?: Partial<Record<AccordionColor, Partial<Record<AccordionVariant, string>>>>;
    };
    paragraph?: string;
}

export type {AccordionSize, AccordionColor, AccordionVariant}
