import {IconStyle} from "@dota/components/icon/icons.config.ts";
import type {IconColor, IconVariant} from "@dota/components/icon/icons.config.ts";

/** Default visual slots for `d-avatar` and its internal wrapper. */
export const AvatarStyle = {
  container: "rounded-full content-center flex shrink-0 items-center justify-center overflow-hidden font-semibold",
  image: "size-full object-cover",
  initials: "select-none",
  icon: "",
  color: IconStyle.color,
  size: {
    xs: "size-5 text-xs",
    sm: "size-6 text-xs",
    md: "size-8 text-sm",
    lg: "size-10 text-base",
    xl: "size-12 text-lg",
    "2xl": "size-16 text-xl",
  },
};

export type AvatarSize = keyof typeof AvatarStyle.size;
export type AvatarColor = IconColor;
export type AvatarVariant = IconVariant;

/** Per-instance visual replacements for `d-avatar` without changing its content or ARIA behavior. */
export interface AvatarStyleConfig {
  container?: string;
  image?: string;
  initials?: string;
  icon?: string;
  size?: Partial<Record<AvatarSize, string>>;
  color?: Partial<Record<AvatarColor, Partial<Record<AvatarVariant, string>>>>;
}
