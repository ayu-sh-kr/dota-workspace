import {diff, html, patch, render, update} from '@dota/main';

describe('dota-rendering', () => {
  it('diffs stable templates by dynamic part', () => {
    const first = html`<p title="${'one'}">${1}</p>`;
    const second = html`<p title="${'two'}">${2}</p>`;

    expect(diff(first, second)).toMatchObject({kind: 'patch'});
    expect(diff(first, second).changedParts.map((change) => change.index)).toEqual([0, 1]);
  });

  it('patches text and attribute parts without replacing the element', () => {
    const root = document.createElement('div');
    const first = html`<button title="${'before'}">${'Count: 1'}</button>`;
    const instance = render(root, first);
    const button = root.firstElementChild;

    expect(update(instance, html`<button title="${'after'}">${'Count: 2'}</button>`)).toMatchObject({kind: 'patch'});
    expect(root.firstElementChild).toBe(button);
    expect(button?.getAttribute('title')).toBe('after');
    expect(button?.textContent).toBe('Count: 2');
  });

  it('keeps native boolean attributes presence-only while patching quoted values', () => {
    const root = document.createElement('div');
    const instance = render(root, html`<button disabled title="${'before'}">Save</button>`);
    const button = root.querySelector('button');

    patch(instance, html`<button disabled title="${'after'}">Save</button>`);

    expect(root.querySelector('button')).toBe(button);
    expect(button?.getAttribute('disabled')).toBe('');
    expect(button?.getAttribute('title')).toBe('after');
  });

  it('keeps legacy string rendering and skips equal updates', () => {
    const root = document.createElement('div');
    const instance = render(root, '<p>hello</p>');
    const paragraph = root.firstElementChild;

    expect(patch(instance, '<p>hello</p>')).toMatchObject({kind: 'noop'});
    expect(root.firstElementChild).toBe(paragraph);
  });
});
