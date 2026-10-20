import {type ColorEntry, extendTheme, flatMarkdownTheme, registerTheme, THEMES} from "@ayu-sh-kr/dota-md";

/** Name of the site's Markdown theme and of its color key. */
export const SITE_MARKDOWN_THEME = 'dota';
export const SITE_MARKDOWN_COLOR = 'dota';

/**
 * Site colors for Markdown: neutral text, accent only on links and quote rules, so articles use
 * the same roles as the rest of the site. Every value is a semantic token, so it follows dark mode.
 */
const siteColor: ColorEntry = {
  h1: {text: 'text-foreground', border: 'border-default'},
  h2: {text: 'text-foreground', border: 'border-default'},
  h3: {text: 'text-foreground'},
  h4: {text: 'text-foreground'},
  h5: {text: 'text-muted'},
  h6: {text: 'text-muted'},
  p: {text: 'text-foreground'},
  span: {text: 'text-foreground'},
  strong: {text: 'text-foreground'},
  em: {text: 'text-foreground'},
  li: {text: 'text-foreground'},
  a: {text: 'text-primary', hover: 'hover:text-primary-hover'},
  code: {text: 'text-foreground', background: 'bg-raised'},
  blockquote: {text: 'text-muted', border: 'border-primary-border'},
  hr: {border: 'border-default'},
  th: {text: 'text-foreground', background: 'bg-raised', border: 'border-default'},
  td: {text: 'text-foreground', border: 'border-default'},
  table: {border: 'border-default'},
  button: {
    text: 'text-foreground',
    background: 'bg-surface',
    border: 'border-default',
    hover: 'hover:bg-raised',
  },
};

/**
 * The site's Markdown theme: DM Sans with the heading, reading, and code roles of the
 * site's type scale, and code blocks drawn as the same panel as the home page examples.
 */
registerTheme(extendTheme(flatMarkdownTheme, {
  name: SITE_MARKDOWN_THEME,
  fontFamily: 'var(--font-body)',
  typography: {
    h1: 'type-section mt-0 mb-6',
    h2: 'font-display text-2xl font-semibold leading-tight tracking-[-0.025em] mt-12 mb-4',
    h3: 'type-card mt-8 mb-3',
    h4: 'text-base font-semibold mt-6 mb-2',
    h5: 'type-compact font-semibold mt-5 mb-1',
    h6: 'type-compact font-semibold mt-5 mb-1',
    p: 'type-reading my-4',
    a: 'underline decoration-1 underline-offset-4 transition-colors break-words',
    strong: 'font-semibold',
    em: 'italic',
    code: 'px-1.5 py-0.5 rounded-md text-[0.875em] font-mono before:content-none after:content-none',
    pre: 'code-panel overflow-x-auto my-6 text-sm',
    blockquote: 'border-l-2 not-italic pl-4 py-1 my-6',
    hr: 'my-10 border-0 border-t',
    th: 'type-compact font-semibold px-3 py-2 text-left border-b',
    td: 'type-compact px-3 py-2 align-top border-b',
    ul: 'type-reading list-disc pl-6 my-4 space-y-1',
    ol: 'type-reading list-decimal pl-6 my-4 space-y-1',
    li: 'my-1',
    table: 'table-auto border-collapse my-6 w-full',
    button: 'button-secondary button-compact',
  },
  color: {[SITE_MARKDOWN_COLOR]: siteColor},
}));

// The site accent is offered with every theme, so the theme picker never drops to uncolored text.
Object.values(THEMES)
  .filter(theme => theme.name !== SITE_MARKDOWN_THEME)
  .forEach(theme => registerTheme(extendTheme(theme, {name: theme.name, color: {[SITE_MARKDOWN_COLOR]: siteColor}})));
