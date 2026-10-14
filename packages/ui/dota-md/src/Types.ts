export type TagName =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'a'
  | 'li'
  | 'code'
  | 'table'
  | 'th'
  | 'td'
  | 'button'
  | 'blockquote'
  | 'hr'
  | 'pre'
  | 'strong'
  | 'em'
  | 'ul'
  | 'ol';


export type ColorName =
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';


// Theme maps each color to a set of tag-specific style tokens.
export type Typography = Record<TagName, string>;

// Per-tag color token — each field is optional so only relevant slots are filled.
export type ColorToken = {
  text?:       string;
  background?: string;
  border?:     string;
  hover?:      string;
  active?:     string;
  focus?:      string;
}

// All tag-specific tokens for one color, all optional.
export type TypographColorToken = Partial<Record<TagName, ColorToken>>

// One color entry: per-tag tokens + a single selection string shared across all tags.
export type ColorEntry = TypographColorToken & {
  selection?: string;
}

/**
 * Key of a theme's color map: a built-in Tailwind color name or an app-defined key such
 * as `'primary'` that a custom theme provides.
 */
export type ColorKey = ColorName | (string & {});

export type Color = Record<ColorKey, ColorEntry>

export type Theme = {
  name: string;
  fontFamily: string;
  typography: Partial<Typography>;
  color: Partial<Color>;
}
