export type CarouselColor =
    | 'none' | 'red' | 'yellow' | 'rose' | 'emerald' | 'green'
    | 'blue' | 'cyan' | 'teal' | 'gray' | 'purple' | 'violet'
    | 'pink' | 'sky' | 'orange' | 'slate' | 'indigo' | 'fuchsia'
    | 'zinc' | 'amber' | 'lime' | 'stone' | 'neutral';

export type CarouselIndicator = 'number' | 'icon' | 'none';
export type CarouselNavigation = 'auto' | 'always' | 'never';
export type CarouselGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
export type CarouselVariant = keyof ColorVariants;
export type CarouselAnimation = 'slide' | 'fade' | 'zoom' | 'flip';