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

/** Output chunk fields this plugin reads; `viteMetadata` is added by Vite's CSS plugin. */
type ChunkLike = {
  type: 'chunk';
  fileName: string;
  isEntry: boolean;
  imports: readonly string[];
  viteMetadata?: {importedCss: Set<string>};
};

/** Output asset fields this plugin reads and rewrites. */
type AssetLike = {type: 'asset'; fileName: string; source: string | Uint8Array};

/**
 * Lists the CSS each entry chunk loads at start-up: its own and that of every chunk it
 * imports statically, in import order.
 * @param bundle Output bundle.
 * @returns CSS file names per entry chunk file name.
 */
export function startupStylesheets(bundle: Record<string, ChunkLike | AssetLike>): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const output of Object.values(bundle)) {
    if (output.type !== 'chunk' || !output.isEntry) continue;
    const css: string[] = [];
    const visited = new Set<string>();
    const visit = (fileName: string) => {
      const chunk = bundle[fileName];
      if (visited.has(fileName) || chunk?.type !== 'chunk') return;
      visited.add(fileName);
      chunk.imports.forEach(visit);
      chunk.viteMetadata?.importedCss.forEach(file => { if (!css.includes(file)) css.push(file); });
    };
    visit(output.fileName);
    result.set(output.fileName, css);
  }
  return result;
}

/**
 * Moves remote stylesheet `@import`s (typically web fonts) out of an HTML page's start-up CSS
 * and into that page's head. Inside CSS, the browser only discovers such a stylesheet after
 * the bundle that imports it has downloaded, which chains two render-blocking requests before
 * first paint; as `<link>`s with a preconnect they download in parallel with the bundle.
 *
 * Each page receives only the imports of the CSS its own entry loads at start-up. CSS that a
 * lazily loaded chunk also uses keeps its imports, so a route's stylesheet never becomes active
 * on pages that do not load it. The links are prepended, so they still precede the bundle in
 * the cascade as the `@import` did. Applies to production builds only; prerendered pages
 * inherit it from the built `index.html`.
 * @returns Vite plugin.
 */
export function dotaRemoteStylesheets(): Plugin {
  /** Hoisted URLs per entry chunk file name, rebuilt for every build. */
  let urlsByEntry = new Map<string, string[]>();

  return {
    name: 'vite-plugin-dota-remote-stylesheets',
    apply: 'build',
    buildStart() {
      urlsByEntry = new Map();
    },
    generateBundle: {
      // Before Vite's HTML plugin, whose `transformIndexHtml` pass runs in its own generateBundle.
      order: 'pre',
      handler(_options, outputBundle) {
        const bundle = outputBundle as unknown as Record<string, ChunkLike | AssetLike>;
        const startup = startupStylesheets(bundle);
        const startupChunks = new Set<string>();
        for (const entry of startup.keys()) {
          const visit = (fileName: string) => {
            const chunk = bundle[fileName];
            if (startupChunks.has(fileName) || chunk?.type !== 'chunk') return;
            startupChunks.add(fileName);
            chunk.imports.forEach(visit);
          };
          visit(entry);
        }
        const lazyCss = new Set<string>();
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk' && !startupChunks.has(output.fileName)) {
            output.viteMetadata?.importedCss.forEach(file => lazyCss.add(file));
          }
        }

        const urlsByCss = new Map<string, string[]>();
        for (const css of new Set([...startup.values()].flat())) {
          const asset = bundle[css];
          if (lazyCss.has(css) || asset?.type !== 'asset') continue;
          const source = typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source);
          const extracted = extractRemoteImports(source);
          if (extracted.urls.length === 0) continue;
          asset.source = extracted.css;
          urlsByCss.set(css, extracted.urls);
        }

        for (const [entry, cssFiles] of startup) {
          const urls = [...new Set(cssFiles.flatMap(css => urlsByCss.get(css) ?? []))];
          if (urls.length > 0) urlsByEntry.set(entry, urls);
        }
      },
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const entry = context.chunk?.fileName;
        return entry ? remoteStylesheetTags(urlsByEntry.get(entry) ?? []) : [];
      },
    },
  };
}
