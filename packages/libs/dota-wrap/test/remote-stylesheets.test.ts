import {describe, expect, it} from 'vitest';
import {dotaRemoteStylesheets, extractRemoteImports, remoteStylesheetTags} from '../src/vite/remote-stylesheets';

const FONTS = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@100..1000&display=swap';

describe('remote stylesheets', () => {
  it('removes unconditional remote imports in both minified spellings', () => {
    const css = `@import "${FONTS}";@import url(https://cdn.example.com/a.css);.a{color:red}`;

    expect(extractRemoteImports(css)).toEqual({
      css: '.a{color:red}',
      urls: [FONTS, 'https://cdn.example.com/a.css'],
    });
  });

  it('keeps local and conditional imports', () => {
    const css = '@import "./local.css";@import "https://cdn.example.com/print.css" print;@import url(https://x.dev/a.css) layer(base);';

    expect(extractRemoteImports(css)).toEqual({css, urls: []});
  });

  it('preconnects to the stylesheet and font origins before linking the stylesheet', () => {
    expect(remoteStylesheetTags([FONTS])).toEqual([
      {tag: 'link', attrs: {rel: 'preconnect', href: 'https://fonts.googleapis.com'}, injectTo: 'head-prepend'},
      {tag: 'link', attrs: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: ''}, injectTo: 'head-prepend'},
      {tag: 'link', attrs: {rel: 'stylesheet', href: FONTS}, injectTo: 'head-prepend'},
    ]);
  });
});

describe('dotaRemoteStylesheets', () => {
  const A_FONT = 'https://fonts.googleapis.com/css2?family=A';
  const B_FONT = 'https://fonts.googleapis.com/css2?family=B';
  const LAZY_FONT = 'https://fonts.googleapis.com/css2?family=Lazy';
  const chunk = (fileName: string, imports: string[], css: string[], isEntry = false) =>
    ({type: 'chunk', fileName, isEntry, imports, viteMetadata: {importedCss: new Set(css)}});
  const asset = (fileName: string, source: string) => ({type: 'asset', fileName, source});

  /** Runs the plugin over a two-page build with one lazily loaded route stylesheet. */
  function build() {
    const plugin = dotaRemoteStylesheets();
    const bundle: Record<string, any> = {
      'a.js': chunk('a.js', ['shared.js'], ['a.css'], true),
      'b.js': chunk('b.js', ['shared.js'], ['b.css'], true),
      'shared.js': chunk('shared.js', [], []),
      'route.js': chunk('route.js', ['shared.js'], ['route.css']),
      'a.css': asset('a.css', `@import "${A_FONT}";.a{}`),
      'b.css': asset('b.css', `@import "${B_FONT}";.b{}`),
      'route.css': asset('route.css', `@import "${LAZY_FONT}";.r{}`),
    };
    (plugin.buildStart as () => void)();
    (plugin.generateBundle as any).handler.call({}, {}, bundle);
    const tagsFor = (entry: string) => (plugin.transformIndexHtml as any).handler('', {chunk: bundle[entry]})
      .filter((tag: any) => tag.attrs.rel === 'stylesheet').map((tag: any) => tag.attrs.href);
    return {bundle, tagsFor};
  }

  it('gives each page only the imports of its own start-up stylesheets', () => {
    const {bundle, tagsFor} = build();

    expect(tagsFor('a.js')).toEqual([A_FONT]);
    expect(tagsFor('b.js')).toEqual([B_FONT]);
    expect(bundle['a.css'].source).toBe('.a{}');
    expect(bundle['b.css'].source).toBe('.b{}');
  });

  it('leaves imports of lazily loaded stylesheets in their CSS', () => {
    const {bundle, tagsFor} = build();

    expect(bundle['route.css'].source).toContain(LAZY_FONT);
    expect([...tagsFor('a.js'), ...tagsFor('b.js')]).not.toContain(LAZY_FONT);
  });
});
