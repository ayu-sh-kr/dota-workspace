/** Default visual slots for the light-DOM `dota-breadcrumb` skin. */
export const BreadcrumbStyle = {
  container: "block min-w-0",
  nav: "relative min-w-0",
  list: "m-0 flex min-w-0 list-none items-center gap-1 overflow-hidden p-0",
  item: "flex min-w-0 shrink-0 items-center gap-1",
  crumb: "block max-w-56 truncate rounded px-1 py-2 text-sm font-medium leading-6 text-gray-500 no-underline transition-colors hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:text-gray-400 dark:hover:text-white dark:focus-visible:outline-white",
  current: "block max-w-56 truncate rounded px-1 py-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white",
  separator: "inline-flex size-4 shrink-0 items-center justify-center text-gray-400 opacity-60 dark:text-gray-500",
  fold: "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-transparent p-0 leading-none text-gray-500 transition-colors hover:border-gray-900 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:border-white dark:hover:text-white dark:focus-visible:outline-white",
  menu: "absolute left-0 z-10 mt-2 min-w-36 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900",
  menuItem: "block w-full truncate rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white dark:focus-visible:outline-white",
  live: "sr-only",
  separatorIcon: "material-symbols:chevron-right-rounded",
  separatorIconClass: "!size-3 !p-0",
  foldIcon: "material-symbols:more-horiz",
  foldIconClass: "!size-4 !p-0",
};

/** Per-instance visual replacements; omitted slots retain `BreadcrumbStyle`. */
export interface BreadcrumbStyleConfig {
  container?: string;
  nav?: string;
  list?: string;
  item?: string;
  crumb?: string;
  current?: string;
  separator?: string;
  fold?: string;
  menu?: string;
  menuItem?: string;
  live?: string;
  /** Iconify name rendered by `dota-icon` between visible crumbs. */
  separatorIcon?: string;
  /** Classes applied to the separator `dota-icon` instance. */
  separatorIconClass?: string;
  /** Iconify name rendered by `dota-icon` inside the fold button. */
  foldIcon?: string;
  /** Classes applied to the fold `dota-icon` instance. */
  foldIconClass?: string;
}
