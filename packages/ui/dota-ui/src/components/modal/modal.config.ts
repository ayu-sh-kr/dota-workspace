
export const ModalStyle = {

    overlay: "fixed inset-0 m-0 flex h-screen max-h-none w-screen max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-slate-950/55 backdrop:backdrop-blur-[1px]",

    panel: "dota-modal-panel relative w-full max-w-lg space-y-4 border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",

    /** @deprecated Use `panel`; retained for existing programmatic consumers. */
    base: "dota-modal-panel relative w-full max-w-lg space-y-4 border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",

    closeButton: "absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",

    duration: {
        "0" : "0s",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
        "500": "500ms",
        "700": "700ms",
        "1000": "1000ms",
        "1200": "1200ms",
        "1300": "1300ms",
        "2000": "2000ms"
    },

    rounded: {
        'none': '',
        'sm': 'rounded-sm',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'xl': 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
        'full': 'rounded-full'
    },

    direction: {
        up: {
            startX: '-50%',
            endX: '-50%',
            startY: '-200%',
            endY: '-50%'
        },

        down: {
            startX: '-50%',
            endX: '-50%',
            startY: '200%',
            endY: '-50%'
        },

        left: {
            startX: '-180%',
            endX: '-50%',
            startY: '-50%',
            endY: '-50%'
        },

        right: {
            startX: '140%',
            endX: '-50%',
            startY: '-50%',
            endY: '-50%'
        }
    }

}

type ModalRounded = keyof typeof ModalStyle.rounded

type ModalDuration = keyof typeof ModalStyle.duration

type ModalDirection = keyof typeof ModalStyle.direction

export type {ModalRounded, ModalDuration, ModalDirection}

/** Per-instance visual replacements for `dota-modal` without changing dialog behavior. */
export interface ModalStyleConfig {
    overlay?: string;
    panel?: string;
    closeButton?: string;
    rounded?: Partial<Record<ModalRounded, string>>;
}
