import {afterEach, describe, expect, it} from 'vitest';
import {createMarkdown, MDService} from '@dota/services/md.service.ts';

afterEach(() => {
  MDService.setMd(createMarkdown());
});

describe('MDService.render', () => {
  it('nests TOC entries by heading level and uses the rendered heading ids', () => {
    const {html, toc} = MDService.render('# Guide\n\n## Error: denied\n\n### `npm` setup\n\n## Next');

    expect(toc).toHaveLength(1);
    expect(toc[0].children.map((entry) => entry.text)).toEqual(['Error: denied', 'Next']);
    expect(toc[0].children[0].children[0]).toMatchObject({level: 3, text: 'npm setup'});
    const ids = [...html.matchAll(/<h\d id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toEqual(['guide', 'error%3A-denied', 'npm-setup', 'next']);
    expect(toc[0].children[0].id).toBe('error%3A-denied');
  });

  it('returns the cached result object until the content is busted', () => {
    const first = MDService.render('cached body');

    expect(MDService.render('cached body')).toBe(first);
    expect(MDService.render('cached body', {bust: true})).not.toBe(first);
  });

  it('renders escaped fenced code without a highlighter by default', () => {
    expect(MDService.renderHtml('```html\n<p>\n```')).toBe('<pre><code class="language-html">&lt;p&gt;\n</code></pre>\n');
  });
});

describe('MDService.configure', () => {
  it('uses a custom highlighter for fenced code', () => {
    MDService.configure({highlight: (code, language) => `<b data-lang="${language}">${code.trim()}</b>`});

    const html = MDService.renderHtml('```ts\nlet a\n```');

    expect(html).toContain('<b data-lang="ts">let a</b>');
    expect(html).not.toContain('hljs');
  });

  it('renders plain escaped code when highlighting is disabled explicitly', () => {
    MDService.configure({highlight: false});

    expect(MDService.renderHtml('```html\n<p>\n```')).toBe('<pre><code class="language-html">&lt;p&gt;\n</code></pre>\n');
  });

  it('applies parser options and plugins with parameters', () => {
    const marker = (md: ReturnType<typeof createMarkdown>, label: string) => {
      md.core.ruler.push('marker', (state) => {
        state.env.label = label;
      });
      md.renderer.rules.hr = (_tokens, _index, _options, env) => `<hr data-label="${env.label}">`;
    };
    MDService.configure({options: {html: false}, plugins: [[marker, 'section']]});

    const html = MDService.renderHtml('<em>raw</em>\n\n---');

    expect(html).toContain('&lt;em&gt;raw&lt;/em&gt;');
    expect(html).toContain('<hr data-label="section">');
  });

  it('accepts a plugin that installs its own highlighter', () => {
    const highlighter = (md: ReturnType<typeof createMarkdown>) => {
      md.set({highlight: (code: string, language: string) => `<pre><code class="plugin language-${language}">${code.trim()}</code></pre>`});
    };
    MDService.configure({plugins: [highlighter]});

    expect(MDService.renderHtml('```ts\nlet a\n```')).toBe('<pre><code class="plugin language-ts">let a</code></pre>\n');
  });

  it('clears cached results rendered with the previous instance', () => {
    const before = MDService.render('```js\nx\n```');
    MDService.configure({highlight: false});

    expect(MDService.render('```js\nx\n```')).not.toBe(before);
  });
});
