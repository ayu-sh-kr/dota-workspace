import {appleMarkdownTheme, flatMarkdownTheme, githubMarkdownTheme, materialMarkdownTheme} from "@dota/md-themes";
import type {ColorEntry, Theme} from "@dota/Types.ts";

/** All registered themes keyed by name; extend it with {@link registerTheme}. */
export const THEMES: Record<string, Theme> = {
  flat:     flatMarkdownTheme,
  material: materialMarkdownTheme,
  apple:    appleMarkdownTheme,
  github:   githubMarkdownTheme
};

/** Name of a built-in theme or one added with {@link registerTheme}. */
export type ThemeName = keyof typeof THEMES;

/** Partial theme accepted by {@link extendTheme}; every field except `name` is optional. */
export type ThemeOverrides = Pick<Theme, 'name'> & Partial<Omit<Theme, 'name'>>;

/**
 * Makes a theme available by name to `<md-view theme="…">`, `<md-toc>`, and `md:theme-change`.
 * Registering an existing name replaces that theme.
 */
export function registerTheme(theme: Theme): Theme {
  THEMES[theme.name] = theme;
  return theme;
}

/** Returns the registered theme for a name, falling back to `flat`. */
export function resolveTheme(name: ThemeName | undefined): Theme {
  return THEMES[name ?? 'flat'] ?? flatMarkdownTheme;
}

/**
 * Derives a new theme from a base, replacing only the tags and colors you pass.
 * Typography is overridden per tag; each color entry is merged per tag so one token
 * (for example `a.text`) can change without restating the rest of that color.
 *
 * @example
 * ```ts
 * registerTheme(extendTheme(flatMarkdownTheme, {
 *   name: 'brand',
 *   typography: { pre: 'brand-code-block' },
 *   color: { primary: { a: { text: 'text-[var(--brand)]' } } },
 * }));
 * ```
 */
export function extendTheme(base: Theme, overrides: ThemeOverrides): Theme {
  const color: Theme['color'] = {...base.color};
  for (const [key, entry] of Object.entries(overrides.color ?? {})) {
    const merged: Record<string, unknown> = {...color[key]};
    for (const [tag, token] of Object.entries(entry ?? {})) {
      merged[tag] = typeof token === 'string' ? token : {...(merged[tag] as object), ...token};
    }
    color[key] = merged as ColorEntry;
  }

  return {
    name: overrides.name,
    fontFamily: overrides.fontFamily ?? base.fontFamily,
    typography: {...base.typography, ...overrides.typography},
    color,
  };
}
