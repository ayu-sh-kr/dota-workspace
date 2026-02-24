import {UIConfig} from "@dota/configs/app.config.ts";


/**
 * Configuration object for Accordion component styling
 * @property {object} button - Button styling configuration
 * @property {string} button.base - Base classes for button styling
 * @property {object} button.size - Size variants for button
 * @property {object} button.color - Color variants for button
 * @property {string} paragraph - Classes for paragraph styling
 */
export const AccordionStyle = {

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
    paragraph: 'text-sm text-gray-500 dark:text-gray-400 pt-1.5 pb-3'

}

/** Type representing available color options for the Accordion component */
type AccordionColor = keyof typeof AccordionStyle.button.color;
/** Type representing available size options for the Accordion component */
type AccordionSize = keyof typeof AccordionStyle.button.size;
/** Type representing available variant options for the Accordion component */
type AccordionVariant = keyof ColorVariants;

export type {AccordionSize, AccordionColor, AccordionVariant}