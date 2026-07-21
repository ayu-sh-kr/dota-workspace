import {UIConfig} from "@dota/configs/app.config.ts";

/** Default visual slots for `dota-badge`. */
export const BadgeStyle = {
  base: "inline-flex w-fit items-center text-center font-medium",
  content: "",
  rounded: {
    none: "",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  },
  size: {
    xs: "px-1.5 py-0.5 text-xs",
    sm: "px-2 py-0.5 text-sm",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1 text-lg",
    xl: "px-3.5 py-1.5 text-xl",
    "2xl": "px-4 py-1.5 text-2xl",
    "3xl": "px-5 py-2 text-3xl",
    "4xl": "px-6 py-2 text-4xl",
  },
  color: {
    ...UIConfig.color,
  },
};

export type BadgeColor = keyof typeof BadgeStyle.color;
export type BadgeVariant = keyof ColorVariants | "subtle";
export type BadgeSize = keyof typeof BadgeStyle.size;
export type BadgeRounded = keyof typeof BadgeStyle.rounded;

/** Per-instance visual replacements for `dota-badge` without changing its text semantics. */
export interface BadgeStyleConfig {
  base?: string;
  content?: string;
  rounded?: Partial<Record<BadgeRounded, string>>;
  size?: Partial<Record<BadgeSize, string>>;
  color?: Partial<Record<BadgeColor, Partial<Record<BadgeVariant, string>>>>;
}
