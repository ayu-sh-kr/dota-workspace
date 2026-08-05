import {
  html,
  isAttributePosition,
  isTemplateResult,
  unsafeHTML,
  valueMarkerFor,
  valueMarkerPattern,
  valueText
} from '@dota/template';
import {nothing} from '@dota/types';

describe('template helpers', () => {
  it('creates a structured result without touching the DOM', () => {
    const result = html`<p title=${'title'}>${'content'}</p>`;

    expect(result).toEqual({
      kind: 'dota-template',
      strings: result.strings,
      values: ['title', 'content']
    });
    expect(isTemplateResult(result)).toBe(true);
  });

  it('flattens nested templates and template arrays without turning markup into text', () => {
    const items = ['one', 'two'].map((item) => html`<li data-value=${item}>${item}</li>`);

    const result = html`<ul>${items}</ul>`;

    expect(result.strings).toEqual(['<ul><li data-value=', '>', '</li><li data-value=', '>', '</li></ul>']);
    expect(result.values).toEqual(['one', 'one', 'two', 'two']);
  });

  it('reuses flattened static structure while collecting new nested values', () => {
    const view = (items: string[]) => html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;

    const first = view(['one', 'two']);
    const second = view(['updated', 'two']);

    expect(second.strings).toBe(first.strings);
    expect(second.values).toEqual(['updated', 'two']);
  });

  it('rebuilds flattened structure when an array shape or trusted markup changes', () => {
    const list = (items: string[]) => html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;
    const trusted = (markup: string) => html`<section>${unsafeHTML(markup)}</section>`;

    const shortList = list(['one']);
    const longList = list(['one', 'two']);
    const firstMarkup = trusted('<strong>first</strong>');
    const secondMarkup = trusted('<em>second</em>');

    expect(longList.strings).not.toBe(shortList.strings);
    expect(longList.values).toEqual(['one', 'two']);
    expect(secondMarkup.strings).not.toBe(firstMarkup.strings);
    expect(secondMarkup.strings.join('')).toContain('<em>second</em>');
  });

  it('merges explicitly trusted markup while leaving ordinary strings dynamic', () => {
    const trusted = unsafeHTML('<svg><circle></circle></svg>');

    const result = html`<div>${trusted}${'<strong>text</strong>'}</div>`;

    expect(result.strings).toEqual(['<div><svg><circle></circle></svg>', '</div>']);
    expect(result.values).toEqual(['<strong>text</strong>']);
  });

  it.each([
    ['<p title=', true],
    ['<p title="', true],
    ['<p>', false],
    ['text > <p>', false]
  ])('identifies attribute source positions: %s', (source, expected) => {
    expect(isAttributePosition(source)).toBe(expected);
  });

  it('creates parser tokens and exposes their matching pattern', () => {
    const token = valueMarkerFor(4);

    expect(token).toBe('dota-value-4');
    expect(new RegExp(valueMarkerPattern.source).exec('title=dota-value-4')?.[1]).toBe('4');
  });

  it.each([
    [nothing, ''],
    [null, ''],
    [undefined, ''],
    [0, '0'],
    [false, 'false'],
    ['', '']
  ])('normalizes child value %s to %s', (value, expected) => {
    expect(valueText(value)).toBe(expected);
  });

  it.each([
    [null, false],
    [undefined, false],
    [nothing, false],
    ['plain value', false],
    [{kind: 'dota-template', strings: [], values: []}, true]
  ])('recognizes structured results without accepting arbitrary values: %s', (value, expected) => {
    expect(isTemplateResult(value)).toBe(expected);
  });
});
