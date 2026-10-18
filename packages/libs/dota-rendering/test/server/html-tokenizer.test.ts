// @vitest-environment node
import {decodeHtmlEntities, tokenizeHtml, type HtmlToken} from '@dota/server/html-tokenizer';

/** Reduces tokens to `kind:name-or-source` strings so expectations read like the input. */
function describeTokens(source: string): string[] {
  return [...tokenizeHtml(source)].map((token: HtmlToken) =>
    token.kind === 'start-tag' || token.kind === 'end-tag' ? `${token.kind}:${token.name}` : `${token.kind}:${source.slice(token.start, token.end)}`);
}

describe('tokenizeHtml', () => {
  it('splits tags, text, and comments and covers the whole source', () => {
    const source = '<!doctype html><P Class=x>Hi <b>there</b></P><!-- note -->';

    expect(describeTokens(source)).toEqual([
      'comment:<!doctype html>', 'start-tag:p', 'text:Hi ', 'start-tag:b', 'text:there', 'end-tag:b', 'end-tag:p', 'comment:<!-- note -->'
    ]);
    const tokens = [...tokenizeHtml(source)];
    const gaps = tokens.filter((token, index) => token.start !== (tokens[index - 1]?.end ?? 0));
    expect(gaps).toEqual([]);
    expect(tokens.at(-1)?.end).toBe(source.length);
  });

  it('reads quoted, unquoted, valueless, and entity-encoded attributes', () => {
    const [tag] = [...tokenizeHtml(`<a href='/x?a=1&amp;b=2' data-id=7 hidden title="a &quot;b&quot; &#39;c&#x27;">`)];

    expect(tag.kind === 'start-tag' && tag.attributes.map(({name, value, quote}) => [name, value, quote])).toEqual([
      ['href', '/x?a=1&b=2', "'"], ['data-id', '7', ''], ['hidden', '', ''], ['title', `a "b" 'c'`, '"']
    ]);
  });

  it('keeps markup-looking text inside attribute values and raw-text elements', () => {
    expect(describeTokens('<p title="<b>">x</p>')).toEqual(['start-tag:p', 'text:x', 'end-tag:p']);
    expect(describeTokens('<script>if (a < b) "</div>";</script><textarea><i></textarea>')).toEqual([
      'start-tag:script', 'text:if (a < b) "</div>";', 'end-tag:script', 'start-tag:textarea', 'text:<i>', 'end-tag:textarea'
    ]);
  });

  it('treats a lone < as text and stays total on unterminated markup', () => {
    expect(describeTokens('1 < 2 <3')).toEqual(['text:1 < 2 <3']);
    expect(describeTokens('<!-- open')).toEqual(['comment:<!-- open']);
    expect(describeTokens('<p title="open')).toEqual(['start-tag:p']);
  });

  it('applies raw-text rules only outside SVG and MathML', () => {
    expect(describeTokens('<svg><title><b/></title></svg>')).toEqual([
      'start-tag:svg', 'start-tag:title', 'start-tag:b', 'end-tag:title', 'end-tag:svg'
    ]);
  });

  it('reports self-closing start tags', () => {
    const [tag] = [...tokenizeHtml('<path d="M0"/>')];

    expect(tag.kind === 'start-tag' && tag.selfClosing).toBe(true);
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes numeric and common named references and keeps unknown ones', () => {
    expect(decodeHtmlEntities('&lt;&#60;&#x3C;&nbsp;&copy;&amp;')).toBe('<<<\u00a0&copy;&');
  });
});
