import type {CarouselGap} from "@dota/components/carousel/CarouselTypes.ts";

const CarouselConfig = {

    gap: {
        none: '',
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
    } as Record<CarouselGap, string>,

    navigation: {
        base: 'absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full w-10 h-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border-0',
        prev: 'left-2',
        next: 'right-2',
    },

};

export {CarouselConfig};