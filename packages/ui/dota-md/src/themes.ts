import {appleMarkdownTheme, flatMarkdownTheme, githubMarkdownTheme, materialMarkdownTheme} from "@dota/md-themes";
import {Theme} from "@dota/Types.ts";

/** All built-in themes keyed by name. */
export const THEMES: Record<string, Theme> = {
  flat:     flatMarkdownTheme,
  material: materialMarkdownTheme,
  apple:    appleMarkdownTheme,
  github:   githubMarkdownTheme
};

/** Union of built-in theme names. */
export type ThemeName = keyof typeof THEMES;