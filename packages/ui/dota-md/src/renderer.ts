import type { Theme, ColorKey, TagName, ColorToken } from './Types.ts';

/** Tags that receive theme classes; `img` and `table` also get fixed layout classes. */
const THEMED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'strong', 'em', 'a', 'pre', 'code',
  'blockquote', 'hr', 'table', 'th', 'td',
  'ul', 'ol', 'li', 'img',
] as const;

type ThemedTag = typeof THEMED_TAGS[number];

const LAYOUT_CLASSES: Partial<Record<ThemedTag, string>> = {
  table: 'overflow-x-auto block',
  img: 'rounded-md sm:rounded-lg shadow-md my-4 sm:my-6 max-w-full h-auto',
};

const OPENING_TAG = new RegExp(`<(${THEMED_TAGS.join('|')})(\\s[^>]*?)?\\s*(\\/?)>`, 'g');
const CLASS_ATTRIBUTE = /\bclass="([^"]*)"/;
const APPLIED_THEME_CLASSES = new WeakMap<Element, readonly string[]>();

/**
 * Resolves the class string for one tag: `theme.typography[tag]`, the color entry's
 * tokens for that tag (text, background, border, hover, active, focus), and fixed
 * layout classes for tables and images.
 */
function resolveClasses(theme: Theme, color: ColorKey, tag: ThemedTag): string {
  const token: ColorToken | undefined = tag === 'img' ? undefined : theme.color[color]?.[tag as TagName];
  const colorClasses = token
    ? [token.text, token.background, token.border, token.hover, token.active, token.focus]
    : [];
  const typography = tag === 'img' ? undefined : theme.typography[tag as TagName];
  return [typography, ...colorClasses, LAYOUT_CLASSES[tag]].filter(Boolean).join(' ');
}

/**
 * Code elements that already carry parser classes (fenced, highlighted blocks) keep
 * the highlighter's styling instead of the inline-code theme.
 */
const isHighlightedCode = (tag: string, existingClasses: string) => tag === 'code' && existingClasses.trim() !== '';

/**
 * Stamps theme classes onto every themed opening tag in an HTML string.
 * Use it where no DOM exists yet (server rendering, string templates); existing
 * `class` attributes are extended rather than duplicated.
 *
 * @param html  HTML produced by a Markdown parser
 * @param theme Theme supplying typography and color tokens, e.g. `flatMarkdownTheme`
 * @param color Key of the theme's color map, e.g. `'indigo'` or an app key such as `'primary'`
 * @returns The HTML with classes applied
 *
 * @example
 * ```ts
 * const html = applyMarkdownTheme(MDService.renderHtml(raw), flatMarkdownTheme, 'indigo');
 * ```
 */
export function applyMarkdownTheme(html: string, theme: Theme, color: ColorKey): string {
  return html.replace(OPENING_TAG, (match, tag: ThemedTag, attributes = '', selfClosing: string) => {
    const existing = CLASS_ATTRIBUTE.exec(attributes)?.[1] ?? '';
    if (isHighlightedCode(tag, existing)) return match;
    const classes = resolveClasses(theme, color, tag);
    if (!classes) return match;
    return existing
      ? `<${tag}${attributes.replace(CLASS_ATTRIBUTE, `class="${existing} ${classes}"`)}${selfClosing}>`
      : `<${tag}${attributes} class="${classes}"${selfClosing}>`;
  });
}

/**
 * Applies theme classes to mounted Markdown without recreating its nodes.
 * Classes this function added previously are removed first, so switching theme or
 * color never accumulates stale classes, while parser classes such as highlight tokens remain.
 *
 * @param root  Container whose descendants receive the theme
 * @param theme Theme supplying typography and color tokens
 * @param color Key of the theme's color map
 */
export function applyMarkdownThemeToElement(root: ParentNode, theme: Theme, color: ColorKey): void {
  root.querySelectorAll(THEMED_TAGS.join(',')).forEach((element) => {
    const tag = element.localName as ThemedTag;
    const previous = APPLIED_THEME_CLASSES.get(element);
    if (previous?.length) element.classList.remove(...previous);
    const next = isHighlightedCode(tag, element.className)
      ? []
      : resolveClasses(theme, color, tag).split(/\s+/).filter(Boolean);
    // Guarded so unthemed tags do not gain an empty `class` attribute.
    if (next.length) element.classList.add(...next);
    APPLIED_THEME_CLASSES.set(element, next);
  });
}

/** Returns the color entry's `selection:*` classes, meant for the content wrapper. */
export function getSelectionClass(theme: Theme, color: ColorKey): string {
  return theme.color[color]?.selection ?? '';
}
