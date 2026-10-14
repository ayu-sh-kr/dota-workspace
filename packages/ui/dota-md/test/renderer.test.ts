import {describe, expect, it} from 'vitest';
import {applyMarkdownTheme, applyMarkdownThemeToElement} from '@dota/renderer.ts';
import type {Theme} from '@dota/Types.ts';

const theme: Theme = {
  name: 'test',
  fontFamily: 'serif',
  typography: {p: 'leading-7', code: 'font-mono', a: 'underline', table: 'w-full'},
  color: {
    primary: {selection: 'selection:bg-brand', a: {text: 'text-brand', hover: 'hover:text-ink'}},
    accent: {a: {text: 'text-accent'}},
  },
};

describe('applyMarkdownTheme', () => {
  it('adds typography, color, and layout classes for a custom color key', () => {
    const html = applyMarkdownTheme('<p><a href="/x">x</a></p><table></table>', theme, 'primary');

    expect(html).toBe('<p class="leading-7"><a href="/x" class="underline text-brand hover:text-ink">x</a></p>'
      + '<table class="w-full overflow-x-auto block"></table>');
  });

  it('extends existing class attributes and leaves highlighted code untouched', () => {
    const html = applyMarkdownTheme('<p class="lead"><code>a</code></p><pre><code class="hljs">b</code></pre>', theme, 'primary');

    expect(html).toContain('<p class="lead leading-7">');
    expect(html).toContain('<code class="font-mono">a</code>');
    expect(html).toContain('<code class="hljs">b</code>');
  });

  it('keeps self-closing tags valid and ignores tags that only share a prefix', () => {
    const html = applyMarkdownTheme('<img src="a.png" /><pre></pre><abbr>x</abbr>', theme, 'primary');

    expect(html).toContain('<img src="a.png" class="rounded-md sm:rounded-lg shadow-md my-4 sm:my-6 max-w-full h-auto"/>');
    expect(html).toContain('<abbr>x</abbr>');
  });
});

describe('applyMarkdownThemeToElement', () => {
  it('replaces only classes it applied when the color changes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<a class="own">x</a><pre><code class="hljs">y</code></pre>';
    const link = root.querySelector('a')!;

    applyMarkdownThemeToElement(root, theme, 'primary');
    applyMarkdownThemeToElement(root, theme, 'accent');

    expect([...link.classList]).toEqual(['own', 'underline', 'text-accent']);
    expect(root.querySelector('code')!.className).toBe('hljs');
  });
});
