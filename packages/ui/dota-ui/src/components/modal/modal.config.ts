
export const ModalStyle = {

    base: "bg-white border border-gray-200 fixed left-1/2 top-1/2 space-y-4 shadow-md p-6 min-w-[320px] z-[999]",

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