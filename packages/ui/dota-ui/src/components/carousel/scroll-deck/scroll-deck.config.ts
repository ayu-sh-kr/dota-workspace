/** Default visual slots for `scroll-deck`. */
export const ScrollDeckStyle = {
  container: "my-8 w-full",
  scroller: "cursor-grab overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth select-none custom-scrollbar active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  content: "flex gap-4 pb-2",
  dragging: "is-dragging",
};

/** Per-instance replacements for selected `scroll-deck` visual slots. */
export interface ScrollDeckStyleConfig {
  container?: string;
  scroller?: string;
  content?: string;
  dragging?: string;
}
