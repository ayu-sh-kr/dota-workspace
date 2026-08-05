import {diff} from '@dota/diff';
import {html} from '@dota/template';

describe('diff', () => {
  it('returns mount before any output has been committed', () => {
    expect(diff(undefined, '<p>first</p>')).toEqual({kind: 'mount', changedParts: []});
  });

  it('returns noop for the same output object and equivalent values', () => {
    const first = html`<p title="${'same'}">${'same'}</p>`;

    expect(diff(first, first)).toEqual({kind: 'noop', changedParts: []});
    expect(diff(first, html`<p title="${'same'}">${'same'}</p>`)).toEqual({kind: 'noop', changedParts: []});
  });

  it('reports each changed dynamic value with its previous and next value', () => {
    const previous = html`<button title="${'before'}">${1}</button>`;
    const next = html`<button title="${'after'}">${2}</button>`;

    expect(diff(previous, next)).toEqual({
      kind: 'patch',
      changedParts: [
        {index: 0, previousValue: 'before', nextValue: 'after'},
        {index: 1, previousValue: 1, nextValue: 2}
      ]
    });
  });

  it('uses Object.is semantics for NaN and object identity', () => {
    expect(diff(html`<p>${Number.NaN}</p>`, html`<p>${Number.NaN}</p>`)).toEqual({kind: 'noop', changedParts: []});

    const previous = {};
    const next = {};
    expect(diff(html`<p>${previous}</p>`, html`<p>${next}</p>`)).toEqual({
      kind: 'patch',
      changedParts: [{index: 0, previousValue: previous, nextValue: next}]
    });
  });

  it('returns replace when output kinds or static structures differ', () => {
    expect(diff('<p>old</p>', '<p>new</p>')).toEqual({kind: 'replace', changedParts: []});
    expect(diff(html`<p>${'value'}</p>`, '<p>value</p>')).toEqual({kind: 'replace', changedParts: []});
    expect(diff(html`<p>${'value'}</p>`, html`<strong>${'value'}</strong>`)).toEqual({kind: 'replace', changedParts: []});
  });
});
