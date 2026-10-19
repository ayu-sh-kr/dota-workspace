import type {HtmlTagDescriptor, Plugin} from 'vite';

/**
 * Matches an unconditional `@import` of an absolute http(s) stylesheet, as minified CSS
 * writes it (`@import "https://…";` or `@import url(https://…);`). Imports with a media
 * query, `layer()` or `supports()` are left in place because a `<link>` cannot express them.
 */
const REMOTE_IMPORT_PATTERN = /@import\s+(?:url\(\s*)?(["']?)(https?:\/\/[^"')\s]+)\1\s*\)?\s*;/g;

/** Origins that serve a stylesheet's font files from a second host. */
const FONT_FILE_ORIGINS: Readonly<Record<string, string>> = {
  'https://fonts.googleapis.com': 'https://fonts.gstatic.com',
};

/**
 * Removes remote `@import` rules from a stylesheet.
 * @param css Emitted stylesheet source.
 * @returns The stylesheet without hoistable imports, and their URLs in source order.
 */
export function extractRemoteImports(css: string): {css: string; urls: string[]} {
  const urls: string[] = [];
  const stripped = css.replace(REMOTE_IMPORT_PATTERN, (_rule, _quote, url: string) => {
    urls.push(url);
    return '';
  });
  return {css: stripped, urls};
}

/**
 * Builds the head tags that load hoisted stylesheets: a preconnect per origin (and per font
 * origin the stylesheet will use), then the stylesheets in their original order.
 * @param urls Remote stylesheet URLs.
 * @returns Tags to prepend to the document head.
 */
export function remoteStylesheetTags(urls: readonly string[]): HtmlTagDescriptor[] {
  const origins = new Set<string>();
  for (const url of urls) {
    const origin = new URL(url).origin;
    origins.add(origin);
    if (FONT_FILE_ORIGINS[origin]) origins.add(FONT_FILE_ORIGINS[origin]);
  }

  return [
    ...[...origins].map((origin): HtmlTagDescriptor => ({
      tag: 'link',
      attrs: {rel: 'preconnect', href: origin, ...(Object.values(FONT_FILE_ORIGINS).includes(origin) ? {crossorigin: ''} : {})},
      injectTo: 'head-prepend',
    })),
    ...urls.map((href): HtmlTagDescriptor => ({tag: 'link', attrs: {rel: 'stylesheet', href}, injectTo: 'head-prepend'})),
  ];
}

/**
 * Moves remote stylesheet `@import`s (typically web fonts) out of the built CSS and into the
 * HTML head. Inside CSS, the browser only discovers such a stylesheet after the bundle that
 * imports it has downloaded, which chains two render-blocking requests before first paint;
 * as `<link>`s with a preconnect they download in parallel with the bundle. The stylesheets
 * are prepended, so they still precede the bundle in the cascade as the `@import` did.
 * Applies to production builds only; prerendered pages inherit it from the built `index.html`.
 * @returns Vite plugin.
 */
export function dotaRemoteStylesheets(): Plugin {
  const urls = new Set<string>();

  return {
    name: 'vite-plugin-dota-remote-stylesheets',
    apply: 'build',
    generateBundle: {
      // Before Vite's HTML plugin, whose `transformIndexHtml` pass runs in its own generateBundle.
      order: 'pre',
      handler(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type !== 'asset' || !output.fileName.endsWith('.css')) continue;
          const source = typeof output.source === 'string' ? output.source : new TextDecoder().decode(output.source);
          const extracted = extractRemoteImports(source);
          if (extracted.urls.length === 0) continue;
          extracted.urls.forEach(url => urls.add(url));
          output.source = extracted.css;
        }
      },
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        return remoteStylesheetTags([...urls]);
      },
    },
  };
}
