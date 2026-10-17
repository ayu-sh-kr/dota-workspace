// @vitest-environment node
import {serializeOutput} from '@dota/ssr/index';
import {html, keyed, nothing, trustedHTML, unsafeHTML, when} from '@ayu-sh-kr/dota-rendering';

describe('serializeOutput', () => {
  it('escapes text and quoted attribute interpolations', () => {
    const title = '<script>alert("x")</script>';

    const markup = serializeOutput(html`<a title="${title}" data-x='${"it's"}'>${title}</a>`);

    expect(markup).toBe(
      '<a title="&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;" data-x=\'it&#39;s\'>' +
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</a>'
    );
  });

  it('keeps visible falsy values and drops absent ones', () => {
    expect(serializeOutput(html`<p>${0}|${false}|${''}|${null}|${undefined}|${nothing}</p>`)).toBe('<p>0|false||||</p>');
  });

  it('renders nested, conditional, keyed, and array values in child positions', () => {
    const items = ['a', 'b'];

    const markup = serializeOutput(html`<ul>${keyed(items, (item) => item, (item) => html`<li>${item}</li>`)}</ul>`);
    const composed = serializeOutput(html`<div>${html`<b>${1}</b>`}${when(true, html`<i>yes</i>`)}${when(false, html`<i>no</i>`)}${[1, '<2>']}</div>`);

    expect(markup).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(composed).toBe('<div><b>1</b><i>yes</i>1&lt;2&gt;</div>');
  });

  it('emits trusted markup raw in child positions only', () => {
    expect(serializeOutput(html`<div>${trustedHTML('<b>ok</b>')}${unsafeHTML('<hr>')}</div>`)).toBe('<div><b>ok</b><hr></div>');
    expect(() => serializeOutput(html`<div title="${trustedHTML('<b>')}"></div>`)).toThrow(TypeError);
  });

  it('rejects unquoted attribute interpolations like the client renderer', () => {
    expect(() => serializeOutput(html`<div title=${'x'}></div>`)).toThrow(/must be quoted/);
  });

  it('passes legacy string output through and clears nothing', () => {
    expect(serializeOutput('<p>legacy</p>')).toBe('<p>legacy</p>');
    expect(serializeOutput(nothing)).toBe('');
  });
});
