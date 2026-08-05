import type { Theme, ColorName, TagName, ColorToken } from './Types.ts';

const THEMED_MARKDOWN_TAGS: readonly TagName[] = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'strong', 'em', 'a', 'pre', 'code',
  'blockquote', 'hr', 'table', 'th', 'td',
  'ul', 'ol', 'li',
];
const APPLIED_THEME_CLASSES = new WeakMap<Element, readonly string[]>();

/**
 * Resolves the combined Tailwind class string for a given tag by merging:
 *   - `theme.typography[tag]` — structural / layout classes
 *   - `theme.color[color][tag]` — semantic color token classes (text, bg, border, …)
 *
 * Both halves are optional; whichever is defined is included.
 */
function resolveClasses(theme: Theme, color: ColorName, tag: TagName): string {
  const typo  = theme.typography[tag] ?? '';
  const entry = theme.color[color];
  const token: ColorToken | undefined = entry ? (entry as Record<string, any>)[tag] : undefined;

  const colorParts = token
    ? [token.text, token.background, token.border, token.hover, token.active, token.focus]
        .filter(Boolean)
        .join(' ')
    : '';

  return [typo, colorParts].filter(Boolean).join(' ').trim();
}

/**
 * `applyMarkdownTheme` — the public renderer exported from `dota-md`.
 *
 * Given raw HTML (from a Markdown parser), a `Theme` object and a `ColorName`,
 * stamps the merged typography and color Tailwind classes directly onto every
 * HTML element.  This is the same approach as the app-local `applyThemeClasses`
 * but driven entirely by the structured `Theme` type, so no hard-coded strings
 * escape the library.
 *
 * @param html    Raw HTML string produced by a Markdown parser (e.g., markdown-it)
 * @param theme   A `Theme` object — e.g. `flatMarkdownTheme` or `materialMarkdownTheme`
 * @param color   A `ColorName` key — e.g. `'indigo'`, `'slate'`, `'rose'`
 * @returns       HTML string with Tailwind classes stamped on every element
 *
 * @example
 * ```ts
 * import { applyMarkdownTheme, flatMarkdownTheme } from '@ayu-sh-kr/dota-md';
 * const html = applyMarkdownTheme(rawHtml, flatMarkdownTheme, 'indigo');
 * ```
 */
export function applyMarkdownTheme(
  html: string,
  theme: Theme,
  color: ColorName,
): string {
  const c = (tag: TagName) => resolveClasses(theme, color, tag);

  return html
    // ── Headings (h1/h2 have border, h3–h6 do not) ──────────────────────────
    .replace(/<h1(\s[^>]*)?>/g,  (_, a = '') => `<h1${a} class="${c('h1')}">`)
    .replace(/<h2(\s[^>]*)?>/g,  (_, a = '') => `<h2${a} class="${c('h2')}">`)
    .replace(/<h3(\s[^>]*)?>/g,  (_, a = '') => `<h3${a} class="${c('h3')}">`)
    .replace(/<h4(\s[^>]*)?>/g,  (_, a = '') => `<h4${a} class="${c('h4')}">`)
    .replace(/<h5(\s[^>]*)?>/g,  (_, a = '') => `<h5${a} class="${c('h5')}">`)
    .replace(/<h6(\s[^>]*)?>/g,  (_, a = '') => `<h6${a} class="${c('h6')}">`)
    // ── Inline text ──────────────────────────────────────────────────────────
    .replace(/<p(\s[^>]*)?>/g,   (_, a = '') => `<p${a} class="${c('p')}">`)
    .replace(/<strong(\s[^>]*)?>/g, (_, a = '') => `<strong${a} class="${c('strong')}">`)
    .replace(/<em(\s[^>]*)?>/g,  (_, a = '') => `<em${a} class="${c('em')}">`)
    // ── Links ────────────────────────────────────────────────────────────────
    .replace(/<a(\s[^>]*)?>/g,   (_, a = '') => `<a${a} class="${c('a')}">`)
    // ── Code — inline only; skip if class= already present (fenced blocks) ──
    .replace(/<pre(\s[^>]*)?>/g, (_, a = '') => `<pre${a} class="${c('pre')}">`)
    .replace(/<code(\s[^>]*)?>/g, (match, a = '') => {
      if (a && a.includes('class=')) return match; // fenced — leave alone
      return `<code${a} class="${c('code')}">`;
    })
    // ── Block elements ───────────────────────────────────────────────────────
    .replace(/<blockquote(\s[^>]*)?>/g, (_, a = '') => `<blockquote${a} class="${c('blockquote')}">`)
    .replace(/<hr(\s[^>]*)?>/g,  (_, a = '') => `<hr${a} class="${c('hr')}">`)
    // ── Table ────────────────────────────────────────────────────────────────
    .replace(/<table(\s[^>]*)?>/g, (_, a = '') => `<table${a} class="${c('table')} overflow-x-auto block">`)
    .replace(/<th(\s[^>]*)?>/g,  (_, a = '') => `<th${a} class="${c('th')}">`)
    .replace(/<td(\s[^>]*)?>/g,  (_, a = '') => `<td${a} class="${c('td')}">`)
    // ── Lists ────────────────────────────────────────────────────────────────
    .replace(/<ul(\s[^>]*)?>/g,  (_, a = '') => `<ul${a} class="${c('ul')}">`)
    .replace(/<ol(\s[^>]*)?>/g,  (_, a = '') => `<ol${a} class="${c('ol')}">`)
    .replace(/<li(\s[^>]*)?>/g,  (_, a = '') => `<li${a} class="${c('li')}">`)
    // ── Media ────────────────────────────────────────────────────────────────
    .replace(/<img(\s[^>]*)?>/g, (_, a = '') =>
      `<img${a} class="rounded-md sm:rounded-lg shadow-md my-4 sm:my-6 max-w-full h-auto">`
    );
}

/**
 * Applies Markdown theme classes to existing content without recreating its nodes.
 * Classes previously owned by this function are removed before the next theme is
 * applied, while parser-authored classes such as syntax-highlighting tokens remain.
 * @param root Existing Markdown DOM whose descendants receive the selected theme.
 * @param theme Theme supplying typography and semantic color classes.
 * @param color Active color entry used to resolve tag-specific color tokens.
 */
export function applyMarkdownThemeToElement(
  root: ParentNode,
  theme: Theme,
  color: ColorName,
): void {
  for (const tag of THEMED_MARKDOWN_TAGS) {
    root.querySelectorAll(tag).forEach((element) => {
      const previousClasses = APPLIED_THEME_CLASSES.get(element) ?? [];
      if (previousClasses.length > 0) element.classList.remove(...previousClasses);

      const hasParserClasses = element.classList.length > 0;
      const themeClasses = tag === 'code' && hasParserClasses
        ? []
        : resolveClasses(theme, color, tag).split(/\s+/).filter(Boolean);
      const layoutClasses = tag === 'table' ? ['overflow-x-auto', 'block'] : [];
      const nextClasses = [...themeClasses, ...layoutClasses];

      if (nextClasses.length > 0) element.classList.add(...nextClasses);
      APPLIED_THEME_CLASSES.set(element, nextClasses);
    });
  }

  root.querySelectorAll('img').forEach((element) => {
    const previousClasses = APPLIED_THEME_CLASSES.get(element) ?? [];
    if (previousClasses.length > 0) element.classList.remove(...previousClasses);

    const nextClasses = [
      'rounded-md', 'sm:rounded-lg', 'shadow-md', 'my-4', 'sm:my-6', 'max-w-full', 'h-auto',
    ];
    element.classList.add(...nextClasses);
    APPLIED_THEME_CLASSES.set(element, nextClasses);
  });
}

/**
 * Returns the `selection` CSS string for the given color from a theme.
 * This is the Tailwind `selection:bg-*` utility class stored at the
 * color-entry level (not per-tag).
 *
 * Useful when the consumer wants to apply a `selection:*` class to the
 * wrapper element directly via Tailwind (where the utility is supported).
 */
export function getSelectionClass(theme: Theme, color: ColorName): string {
  return theme.color[color]?.selection ?? '';
}
