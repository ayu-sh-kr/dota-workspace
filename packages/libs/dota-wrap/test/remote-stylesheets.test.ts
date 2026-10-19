import {describe, expect, it} from 'vitest';
import {extractRemoteImports, remoteStylesheetTags} from '../src/vite/remote-stylesheets';

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
