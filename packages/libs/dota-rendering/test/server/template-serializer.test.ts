// @vitest-environment node
import {serializeOutput} from '@dota/server/index';
import {html, keyed, nothing, trustedHTML, unsafeHTML, when} from '@dota/main';

describe('serializeOutput', () => {
  it('escapes text and quoted attribute interpolations', () => {
    const title = '<script>alert("x")</script>';

    const markup = serializeOutput(html`<a title="${title}" data-x='${"it's"}'>${title}</a>`);

    expect(markup).toBe(
      '<a title="&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;" data-x="it&#39;s">' +
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</a>'
    );
  });

  it('keeps static single-quoted text safe when rewriting the attribute with double quotes', () => {
    expect(serializeOutput(html`<a title='say "${'hi'}"'></a>`)).toBe('<a title="say &quot;hi&quot;"></a>');
  });

  it('keeps visible falsy values and drops absent ones', () => {
    expect(serializeOutput(html`<p>${0}|${false}|${''}|${null}|${undefined}|${nothing}</p>`)).toBe('<p>0|false||||</p>');
  });

  it('renders nested, conditional, keyed, and array values in child positions', () => {
    const items = ['a', 'b'];

    const markup = serializeOutput(html`<ul>${keyed(items, (item) => item, (item) => html`<li>${item}</li>`)}</ul>`);
    const composed = serializeOutput(html`<div>${html`<b>${1}</b>`}${when(true, html`<i>yes</i>`)}${when(false, html`<i>no</i>`)}${[1, '<2>']}</div>`);

    expect(markup).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(composed).toBe('<div><b>1</b><i>yes</i>1,&lt;2&gt;</div>');
  });

  it('emits trusted markup raw in child positions only', () => {
    expect(serializeOutput(html`<div>${trustedHTML('<b>ok</b>')}${unsafeHTML('<hr>')}</div>`)).toBe('<div><b>ok</b><hr></div>');
    expect(() => serializeOutput(html`<div title="${trustedHTML('<b>')}"></div>`)).toThrow(TypeError);
  });

  it('rejects interpolations the client renderer cannot bind', () => {
    expect(() => serializeOutput(html`<div title=${'x'}></div>`)).toThrow('Dynamic attribute "title" must use a quoted value');
    expect(() => serializeOutput(html`<div ${'hidden'}></div>`)).toThrow('Dynamic attribute names are not supported');
  });

  it('rejects duplicate keys like the client renderer', () => {
    expect(() => serializeOutput(html`<ul>${keyed([1, 1], (item) => item, () => html`<li></li>`)}</ul>`)).toThrow('Duplicate render key: 1');
  });

  it('writes raw-text and comment values as text without breaking out of the element', () => {
    const markup = serializeOutput(html`<script>const v = "${'</script><b>'}";</script><style>${'a{}'}</style><textarea>${'<i>'}</textarea><!-- ${'-->'} -->`);

    expect(markup).toBe('<script>const v = "<\\/script><b>";</script><style>a{}</style><textarea>&lt;i&gt;</textarea><!-- --&gt; -->');
  });

  it('passes legacy string output through and clears nothing', () => {
    expect(serializeOutput('<p>legacy</p>')).toBe('<p>legacy</p>');
    expect(serializeOutput(nothing)).toBe('');
    expect(serializeOutput('<p>legacy</p>', 'h0')).toBe('<p>legacy</p>');
    expect(serializeOutput(undefined as never)).toBe('');
  });

  it('adds durable markers owned by the given scope', () => {
    const markup = serializeOutput(html`<p class="${'note'}">${'Hi'}${keyed([7], (item) => item, (item) => html`<b>${item}</b>`)}</p>`, 'h3');

    expect(markup).toBe(
      '<!--dota-component-start--><p class="note" data-dota-index="0" data-dota-dynamic="" data-dh-a="h3:p0">' +
      '<!--dh:h3:p1-->Hi<!--/dh:h3:p1-->' +
      '<!--dh:h3:p2--><!--dh:h3:k2:0--><!--dota-component-start--><b data-dota-index="0" data-dota-dynamic=""><!--dh:h3:p0-->7<!--/dh:h3:p0--></b><!--dota-component-end--><!--/dh:h3:k2:0--><!--/dh:h3:p2-->' +
      '</p><!--dota-component-end-->'
    );
  });
});
