import markdownit, { type Options as MarkdownItOptions, type PluginSimple, type PluginWithParams } from 'markdown-it';
import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import anchor from 'markdown-it-anchor';
import { ApplicationEventService } from '@ayu-sh-kr/dota-core';


/** A single entry in the extracted Table of Contents. */
export interface TocEntry {
  /** Heading level (1–6). */
  level: number;
  /** Heading text as it appears in the source. */
  text: string;
  /** Anchor id rendered on the heading, so `#id` links always resolve. */
  id: string;
  /** Nested child headings. */
  children: TocEntry[];
}

/**
 * Combined result returned by the render methods.
 * Both fields are always present; consumers can ignore whichever they don't need.
 */
export interface MarkdownResult {
  /** Fully rendered HTML string, ready to set as `innerHTML`. */
  html: string;
  /** Nested TOC entries extracted from the document's headings. */
  toc: TocEntry[];
}

/**
 * Highlights fenced code. `dota-md` ships no highlighter, so applications choose the library
 * and the languages they bundle.
 * Receives the fenced block's source and language and returns highlighted HTML, or an
 * empty string to let markdown-it escape the code itself.
 */
export type MarkdownHighlighter = (code: string, language: string) => string;

/** Customises the markdown-it instance built by {@link createMarkdown}. */
export interface MarkdownSetup {
  /** markdown-it options merged over the defaults (`html`, `linkify`, `typographer`). */
  options?: MarkdownItOptions;
  /**
   * Highlighter for fenced code. Omitted or `false` renders escaped code without highlighting.
   * A plugin that sets markdown-it's highlighter, such as `markdown-it-highlightjs`, also works
   * through {@link MarkdownSetup.plugins}.
   */
  highlight?: MarkdownHighlighter | false;
  /** Extra plugins applied after the built-in ones, e.g. `[footnote, [container, 'tip']]`. */
  plugins?: Array<PluginSimple | [plugin: PluginWithParams, ...params: any[]]>;
}

/** Options accepted by {@link MDService.render}. */
export interface MarkdownRenderOptions {
  /** Publishes the result as an `md:render` event so mounted components update. */
  publish?: boolean;
  /** Discards the cached result for this content before rendering. */
  bust?: boolean;
}

/**
 * Builds a markdown-it instance with the `dota-md` defaults: raw HTML, linkify, typographer,
 * and heading anchors. Fenced code is escaped but not highlighted; pass a {@link MarkdownSetup}
 * to add a highlighter, change parser options, or add plugins.
 *
 * @example
 * ```ts
 * MDService.setMd(createMarkdown({
 *   highlight: (code, lang) => shiki.codeToHtml(code, { lang, theme: 'github-dark' }),
 *   plugins: [footnote],
 * }));
 * ```
 */
export function createMarkdown(setup: MarkdownSetup = {}): MarkdownIt {
  const { options, highlight, plugins = [] } = setup;
  const md = markdownit({ html: true, linkify: true, typographer: true, breaks: false, ...options });

  if (highlight) md.set({ highlight });

  md.use(anchor);
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) md.use(...plugin);
    else md.use(plugin);
  }
  return md;
}

/**
 * Builds the nested TOC from parsed heading tokens.
 * Ids are read from the tokens the anchor plugin already decorated, so TOC links always
 * match the rendered heading ids instead of re-deriving them with a second slug function.
 */
function extractToc(tokens: Token[]): TocEntry[] {
  const root: TocEntry = { level: 0, text: '', id: '', children: [] };
  const stack = [root];

  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return;
    const inline = tokens[index + 1];
    const entry: TocEntry = {
      level: Number(token.tag.slice(1)),
      text: inline?.children?.map((child) => child.type === 'text' || child.type === 'code_inline' ? child.content : '').join('')
        ?? inline?.content ?? '',
      id: token.attrGet('id') ?? '',
      children: [],
    };
    while (stack.length > 1 && stack[stack.length - 1].level >= entry.level) stack.pop();
    stack[stack.length - 1].children.push(entry);
    stack.push(entry);
  });

  return root.children;
}

/**
 * `MDService` — singleton markdown rendering service for `dota-md`.
 *
 * - Renders with a shared markdown-it instance; replace it with {@link MDService.setMd}
 *   or {@link MDService.configure} to change the parser, highlighter, or plugins.
 * - Caches results by content string (insertion-ordered, 50 entries by default).
 * - Publishes an `md:render` event when asked so `<md-view>` and `<md-toc>` update.
 *
 * @example
 * ```ts
 * const { html, toc } = MDService.render(rawMd);
 * MDService.render(rawMd, { publish: true });
 * MDService.configure({ highlight: (code, lang) => myHighlighter(code, lang) });
 * ```
 */
export class MDService {

  private static _md: MarkdownIt = createMarkdown();

  private static _cache = new Map<string, MarkdownResult>();

  private static _cacheLimit = 50;

  /**
   * Swaps the shared parser for an instance the application built itself.
   * Every later render uses it, and cached results are cleared so no page keeps HTML
   * produced by the previous parser.
   * Headings receive TOC ids only when the instance uses `markdown-it-anchor` (as
   * {@link createMarkdown} does) or another plugin that sets heading `id` attributes.
   * @param md Fully configured markdown-it instance to render with from now on.
   */
  static setMd(md: MarkdownIt): void {
    MDService._md = md;
    MDService._cache.clear();
  }

  /**
   * Applies the application's Markdown setup, such as its syntax highlighter, parser options,
   * or extra plugins, to every later render.
   * Call it once at startup, before the first render: content rendered earlier stays in its
   * old form, and prerendered and client-rendered pages only match when both use the same setup.
   * Equivalent to `setMd(createMarkdown(setup))`, so the cache is cleared as well.
   * @param setup Highlighter, parser options, and plugins; omitted fields keep the `dota-md` defaults.
   */
  static configure(setup: MarkdownSetup): void {
    MDService.setMd(createMarkdown(setup));
  }

  /** Adjusts the maximum number of cached results, evicting the oldest excess entries. */
  static setCacheLimit(limit: number): void {
    MDService._cacheLimit = limit;
    while (MDService._cache.size > limit) {
      MDService._cache.delete(MDService._cache.keys().next().value!);
    }
  }

  /** Removes all cached results. */
  static clearCache(): void {
    MDService._cache.clear();
  }

  /** Removes the cached result for one content string. */
  static clearCacheFor(content: string): void {
    MDService._cache.delete(content);
  }

  /**
   * Renders markdown into HTML and extracts its TOC.
   * The same content string returns the same cached result object until the cache is cleared.
   *
   * @param content Raw markdown string.
   * @param options `publish` broadcasts `md:render`; `bust` forces a fresh render.
   */
  static render(content: string, options: MarkdownRenderOptions = {}): MarkdownResult {
    if (options.bust) MDService._cache.delete(content);

    let result = MDService._cache.get(content);
    if (!result) {
      const env = {};
      const tokens = MDService._md.parse(content, env);
      result = { html: MDService._md.renderer.render(tokens, MDService._md.options, env), toc: extractToc(tokens) };
      if (MDService._cache.size >= MDService._cacheLimit) {
        MDService._cache.delete(MDService._cache.keys().next().value!);
      }
      MDService._cache.set(content, result);
    }

    if (options.publish) MDService.publish(result);
    return result;
  }

  /** Renders markdown and returns only the HTML string. */
  static renderHtml(content: string, options: Omit<MarkdownRenderOptions, 'publish'> = {}): string {
    return MDService.render(content, options).html;
  }

  /** Renders markdown and returns only the TOC entries. */
  static renderToc(content: string, options: Omit<MarkdownRenderOptions, 'publish'> = {}): TocEntry[] {
    return MDService.render(content, options).toc;
  }

  /** Publishes a result as one `md:render` event; skipped when no event bus is available. */
  static publish(result: MarkdownResult): void {
    try {
      ApplicationEventService
        .getInstance()
        .getPublisher()
        .publishAsync({ name: 'md:render', data: result });
    } catch {
      // No event bus (e.g. a unit test): rendering still succeeds.
    }
  }
}
