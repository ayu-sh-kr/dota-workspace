export * from "./Types.ts"
export * from "./themes.ts"
export * from "./renderer.ts"

import { flatMarkdownTheme } from "./themes.ts";
import { materialMarkdownTheme } from "./themes.ts";
import { appleMarkdownTheme } from "./themes.ts";
import type { Theme } from "./Types.ts";

/** All built-in themes keyed by name. */
export const THEMES: Record<string, Theme> = {
  flat:     flatMarkdownTheme,
  material: materialMarkdownTheme,
  apple:    appleMarkdownTheme,
};

/** Union of built-in theme names. */
export type ThemeName = keyof typeof THEMES;

