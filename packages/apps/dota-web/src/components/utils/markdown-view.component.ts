import {BaseElement, Component, HTML, Property, String} from "@ayu-sh-kr/dota-core";
import {MarkdownThemeConfig, type MarkdownTheme} from "@dota/configs/markdown.config.ts";

/**
 * Builds a scoped <style> block containing ::selection and ::-moz-selection
 * rules for the component's wrapper div, identified by a unique data attribute.
 *
 * Uses raw hex values from theme.selection — NOT @apply — because ::selection
 * is a browser pseudo-element resolved at paint time; PostCSS directives don't
 * exist at runtime.
 *
 * The dark mode branch keys off the `.dark` class on <html>, exactly the same
 * mechanism the rest of the app uses for dark mode toggling.
 */
function buildSelectionStyle(uid: string, theme: MarkdownTheme): string {
  const cfg = MarkdownThemeConfig[theme] ?? MarkdownThemeConfig['purple'];
  const selection = cfg.selection;
  const sel = `[data-md="${uid}"]`;
  return [
    /* light mode */
    `${sel} ::selection        { background-color: ${selection.light.bg}; color: ${selection.light.text}; }`,
    `${sel} ::-moz-selection   { background-color: ${selection.light.bg}; color: ${selection.light.text}; }`,
    /* dark mode — .dark on <html> */
    `.dark ${sel} ::selection      { background-color: ${selection.dark.bg}; color: ${selection.dark.text}; }`,
    `.dark ${sel} ::-moz-selection { background-color: ${selection.dark.bg}; color: ${selection.dark.text}; }`,
  ].join('\n');
}

function applyThemeClasses(html: string, theme: MarkdownTheme): string {
  const t = MarkdownThemeConfig[theme] ?? MarkdownThemeConfig['purple'];

  // Order matters: more specific patterns first (pre code before code)
  return html
    // wrapper body classes applied via the container div, not here
    .replace(/<h1(\s[^>]*)?>/g, (_, a = '') => `<h1${a} class="${t.h1}">`)
    .replace(/<h2(\s[^>]*)?>/g, (_, a = '') => `<h2${a} class="${t.h2}">`)
    .replace(/<h3(\s[^>]*)?>/g, (_, a = '') => `<h3${a} class="${t.h3}">`)
    .replace(/<h4(\s[^>]*)?>/g, (_, a = '') => `<h4${a} class="${t.h4}">`)
    .replace(/<a(\s[^>]*)?>/g, (_, a = '') => `<a${a} class="${t.a}">`)
    .replace(/<pre(\s[^>]*)?>/g, (_, a = '') => `<pre${a} class="${t.pre}">`)
    // inline code only — pre > code gets its own minimal classes
    .replace(/<code(\s[^>]*)?>/g, (match, a = '') => {
      // inside a pre block markdown-it emits <code class="language-*">
      // we must not double-stamp pre's code — keep existing class if present
      if (a && a.includes('class=')) return match;
      return `<code${a} class="${t.code}">`;
    })
    .replace(/<blockquote(\s[^>]*)?>/g, (_, a = '') => `<blockquote${a} class="${t.blockquote}">`)
    .replace(/<hr(\s[^>]*)?>/g, (_, a = '') => `<hr${a} class="${t.hr}">`)
    .replace(/<table(\s[^>]*)?>/g, (_, a = '') => `<table${a} class="w-full my-4 sm:my-6 border-collapse text-xs sm:text-sm overflow-x-auto block">`)
    .replace(/<th(\s[^>]*)?>/g, (_, a = '') => `<th${a} class="${t.th}">`)
    .replace(/<td(\s[^>]*)?>/g, (_, a = '') => `<td${a} class="${t.td}">`)
    .replace(/<strong(\s[^>]*)?>/g, (_, a = '') => `<strong${a} class="${t.strong}">`)
    .replace(/<ul(\s[^>]*)?>/g, (_, a = '') => `<ul${a} class="${t.ul}">`)
    .replace(/<ol(\s[^>]*)?>/g, (_, a = '') => `<ol${a} class="${t.ol}">`)
    .replace(/<li(\s[^>]*)?>/g, (_, a = '') => `<li${a} class="my-0.5 sm:my-1">`)
    .replace(/<img(\s[^>]*)?>/g, (_, a = '') => `<img${a} class="rounded-md sm:rounded-lg shadow-md my-4 sm:my-6 max-w-full h-auto">`)
    .replace(/<p(\s[^>]*)?>/g, (_, a = '') => `<p${a} class="my-3 sm:my-4 leading-6 sm:leading-7">`);
}

/**
 * MarkdownViewComponent — renders pre-converted HTML from MarkdownService
 * with full theme control via the `theme` attribute.
 *
 * Theme classes are stamped directly onto the rendered HTML elements at
 * render time, so they work with the Tailwind bundle without any @apply or
 * runtime style injection.
 *
 * @example
 * ```html
 * <markdown-view theme="purple"></markdown-view>
 * <markdown-view theme="zinc"></markdown-view>
 * ```
 */
@Component({
  selector: 'markdown-view',
  shadow: false
})
export class MarkdownViewComponent extends BaseElement {

  /**
   * Theme name — must be a key of MarkdownThemeConfig.
   * Controls accent colour for links, inline code, blockquotes, heading borders.
   */
  @Property({name: 'theme', type: String})
  theme: MarkdownTheme = 'purple';

  /**
   * Tailwind max-width utility class applied to the content wrapper.
   * Defaults to 'max-w-full' — the wrapper fills available space and
   * the parent (doc-content / blog-view / page layout) controls the actual
   * visible width via its own container. Pass a specific class to override:
   * 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-full'
   */
  @Property({name: 'max-width', type: String})
  maxWidth: string = 'max-w-full';

  /** Pre-rendered HTML from MarkdownService.renderMarkdown(). Set by parent. */
  content: string = '';

  /** Stable per-instance ID used to scope the ::selection <style> block. */
  private readonly _uid: string = Math.random().toString(36).slice(2, 9);

  constructor() {
    super();
    this.content = this.innerHTML
  }

  render(): string {
    const theme = this.theme ?? 'purple';
    const maxWidth = this.maxWidth ?? 'max-w-full';
    const t = MarkdownThemeConfig[theme] ?? MarkdownThemeConfig['purple'];
    const themed = this.content ? applyThemeClasses(this.content, theme) : '';
    return HTML`
            <style>${buildSelectionStyle(this._uid, theme)}</style>
            <div data-md="${this._uid}"
                 class="${maxWidth} mx-auto w-full
                         px-3 sm:px-5 lg:px-8
                         py-4 sm:py-6 lg:py-8
                         ${t.wrapper} ${t.body}">
                ${themed}
            </div>
        `;
  }
}
