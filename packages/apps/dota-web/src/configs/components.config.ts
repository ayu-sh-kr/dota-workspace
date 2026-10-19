import {defineComponentLoaders} from "@ayu-sh-kr/dota-wrap";

/** Loads Dota UI once; every tag below shares the same chunk. */
const ui = () => import("@ayu-sh-kr/dota-ui");

/** Loads Dota MD through the site's Markdown setup, so it is configured before any element renders. */
const md = () => import("@dota/configs/markdown.config.ts").then(() => import("@ayu-sh-kr/dota-md"));

/**
 * Library elements the site renders, defined only when a route or the document needs them.
 * Application components come from `virtual:dota-component-registry`; register a library
 * tag here before using it in a template.
 */
export const libraryComponents = defineComponentLoaders({
  "dota-icon": () => ui().then(m => {
    m.IconsComponent.baseUrl = `${import.meta.env.BASE_URL}assets/icons`;
    return m.IconsComponent;
  }),
  "dota-popover": () => ui().then(m => m.PopoverComponent),
  "dota-carousel": () => ui().then(m => m.DotaCarouselComponent),
  "dota-slide": () => ui().then(m => m.DotaSlideComponent),
  "scroll-deck": () => ui().then(m => m.ScrollDeckComponent),
  "dota-button": () => ui().then(m => m.ButtonComponent),
  "blob-separator": () => ui().then(m => m.BlobSeparatorComponent),
  "orb-background": () => ui().then(m => m.OrbBackgroundComponent),
  "cloud-chamber": () => ui().then(m => m.CloudChamberComponent),
  "cursor-displacement": () => ui().then(m => m.CursorDisplacementComponent),
  "dota-accordion": () => ui().then(m => m.AccordionComponent),
  "d-avatar": () => ui().then(m => m.AvatarComponent),
  "avatar-wrapper": () => ui().then(m => m.AvatarWrapper),
  "dota-breadcrumb": () => ui().then(m => m.BreadcrumbComponent),
  "dota-alert": () => ui().then(m => m.DotaAlertComponent),
  "md-view": () => md().then(m => m.MdViewComponent),
  "md-toc": () => md().then(m => m.MdTocComponent),
});
