import {UIConfig} from "@dota/configs/app.config.ts";
import type {CarouselColor, CarouselGap} from "@dota/components/carousel/CarouselTypes.ts";

/** Default visual slots for `dota-carousel`. */
export const DotaCarouselStyle = {
  container: "dota-carousel w-full",
  viewport: "relative overflow-hidden",
  track: "flex transition-transform duration-500 ease-in-out motion-reduce:transition-none",
  slide: "carousel-slide flex-shrink-0 overflow-hidden",
  stacked: "relative",
  drag: "cursor-grab active:cursor-grabbing select-none",
  gap: {
    none: "",
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  } as Record<CarouselGap, string>,
  indicators: {
    container: "flex items-center justify-center gap-2 mt-3",
    number: "text-sm font-medium",
    button: "border-0 p-0 cursor-pointer transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 rounded-full",
    active: "opacity-100",
    inactive: "opacity-40 hover:opacity-70",
    color: Object.fromEntries(
      Object.entries(UIConfig.color ?? {}).map(([color, variants]) => [color, variants.ghost]),
    ) as Record<CarouselColor, string>,
  },
  navigation: {
    base: "absolute top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2",
    prev: "left-2",
    next: "right-2",
    disabled: "opacity-40 cursor-not-allowed pointer-events-none",
    color: Object.fromEntries(
      Object.entries(UIConfig.color ?? {}).map(([color, variants]) => [color, variants.ghost]),
    ) as Record<CarouselColor, string>,
  },
};

/** Per-instance replacements for selected `dota-carousel` visual slots. */
export interface DotaCarouselStyleConfig {
  container?: string;
  viewport?: string;
  track?: string;
  slide?: string;
  stacked?: string;
  drag?: string;
  gap?: Partial<Record<CarouselGap, string>>;
  indicators?: {
    container?: string;
    number?: string;
    button?: string;
    active?: string;
    inactive?: string;
    color?: Partial<Record<CarouselColor, string>>;
  };
  navigation?: {
    base?: string;
    prev?: string;
    next?: string;
    disabled?: string;
    color?: Partial<Record<CarouselColor, string>>;
  };
}

/** @deprecated Use `DotaCarouselStyle`. */
export const CarouselConfig = DotaCarouselStyle;
