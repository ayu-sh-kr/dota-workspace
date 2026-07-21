/** Default visual slots for `dota-placeholder`. */
export const PlaceholderStyle = {
  container: "flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-slate-400 p-1 dark:bg-slate-600",
  content: "placeholder h-full w-full rounded-lg bg-slate-300 dark:bg-slate-500",
} as const;

/** Per-instance visual replacements for `dota-placeholder` loading surfaces. */
export interface PlaceholderStyleConfig {
  container?: string;
  content?: string;
}
