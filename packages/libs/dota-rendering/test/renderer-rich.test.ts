import {diff, html, nothing, patch, render, update} from '@dota/main';

describe('renderer rich behavior', () => {
  it('mounts a complex document and marks its owned structure', () => {
    const root = document.createElement('div');
    const instance = render(root, html`
      <article class="card" data-theme=${'dark'}>
        <header>
          <h1>${'Rendering'}</h1>
          <p>${'A structured view'}</p>
        </header>
        <dota-rich-card data-id=${42}>
          <strong>${'Nested content'}</strong>
        </dota-rich-card>
        <footer>
          <button disabled=${false} title=${'Save item'}>${'Save'}</button>
        </footer>
      </article>
    `);

    const article = root.querySelector('article');
    const button = root.querySelector('button');
    const customCard = root.querySelector('dota-rich-card');

    expect(instance.output).toMatchObject({kind: 'dota-template'});
    expect(article?.getAttribute('data-dota-index')).toBe('0');
    expect(article?.hasAttribute('data-dota-dynamic')).toBe(true);
    expect(customCard?.getAttribute('data-dota-component')).toBe('dota-rich-card');
    expect(customCard?.getAttribute('data-id')).toBe('42');
    expect(button?.hasAttribute('disabled')).toBe(false);
    expect(button?.getAttribute('title')).toBe('Save item');
    expect(root.querySelector('h1')?.textContent).toBe('Rendering');
    expect(root.querySelector('strong')?.textContent).toBe('Nested content');
    expect(root.innerHTML).toContain('dota-component-start');
    expect(root.innerHTML).toContain('dota-component-end');
  });

  it('patches several parts while preserving unrelated element identity', () => {
    const root = document.createElement('div');
    const instance = render(root, html`
      <section>
        <h2 title=${'before'}>${'Title'}</h2>
        <p>${'Before description'}</p>
        <button>${'Keep this node'}</button>
      </section>
    `);
    const section = root.querySelector('section');
    const heading = root.querySelector('h2');
    const paragraph = root.querySelector('p');
    const button = root.querySelector('button');

    const result = update(instance, html`
      <section>
        <h2 title=${'after'}>${'Updated title'}</h2>
        <p>${'After description'}</p>
        <button>${'Keep this node'}</button>
      </section>
    `);

    expect(result).toEqual({kind: 'patch', changedParts: 3, replacedNodes: 0});
    expect(root.querySelector('section')).toBe(section);
    expect(root.querySelector('h2')).toBe(heading);
    expect(root.querySelector('p')).toBe(paragraph);
    expect(root.querySelector('button')).toBe(button);
    expect(heading?.getAttribute('title')).toBe('after');
    expect(heading?.textContent).toBe('Updated title');
    expect(paragraph?.textContent).toBe('After description');
  });

  it('splits and updates multiple dynamic values in one text parent', () => {
    const root = document.createElement('div');
    const instance = render(root, html`<p>${'first'} / ${'second'} / ${'third'}</p>`);
    const paragraph = root.querySelector('p');

    patch(instance, html`<p>${'one'} / ${'two'} / ${'three'}</p>`);

    expect(root.querySelector('p')).toBe(paragraph);
    expect(paragraph?.textContent).toBe('one / two / three');
    expect(paragraph?.getAttribute('data-dota-dynamic')).toBe('');
  });

  it('preserves meaningful falsy text values and removes empty attribute values intentionally', () => {
    const root = document.createElement('div');
    const instance = render(root, html`
      <output title=${''}>${0}|${false}|${''}|${nothing}</output>
    `);
    const output = root.querySelector('output');

    expect(output?.textContent).toBe('0|false||');
    expect(output?.hasAttribute('title')).toBe(true);
    expect(output?.getAttribute('title')).toBe('');

    patch(instance, html`
      <output title=${null}>${undefined}|${nothing}|${false}|${0}</output>
    `);

    expect(output?.textContent).toBe('||false|0');
    expect(output?.hasAttribute('title')).toBe(false);
  });

  it('removes and restores a dynamic boolean-like attribute without remounting', () => {
    const root = document.createElement('div');
    const instance = render(root, html`<button disabled=${true}>Submit</button>`);
    const button = root.querySelector('button');

    patch(instance, html`<button disabled=${false}>Submit</button>`);
    expect(button?.hasAttribute('disabled')).toBe(false);

    patch(instance, html`<button disabled=${true}>Submit</button>`);
    expect(root.querySelector('button')).toBe(button);
    expect(button?.getAttribute('disabled')).toBe('true');
  });

  it('returns noop and preserves the DOM when all values are unchanged', () => {
    const root = document.createElement('div');
    const first = html`<p title=${'same'}>${'same text'}</p>`;
    const instance = render(root, first);
    const paragraph = root.querySelector('p');

    const result = update(instance, html`<p title=${'same'}>${'same text'}</p>`);

    expect(result).toEqual({kind: 'noop', changedParts: 0, replacedNodes: 0});
    expect(root.querySelector('p')).toBe(paragraph);
  });

  it('replaces the structure when the tag or static template changes', () => {
    const root = document.createElement('div');
    const instance = render(root, html`<div><span>${'value'}</span></div>`);
    const oldRoot = root.firstElementChild;
    const oldChild = root.querySelector('span');

    const result = update(instance, html`<main><strong>${'value'}</strong></main>`);

    expect(result).toEqual({kind: 'replace', changedParts: 0, replacedNodes: 1});
    expect(root.firstElementChild).not.toBe(oldRoot);
    expect(root.querySelector('span')).toBeNull();
    expect(root.querySelector('strong')).not.toBe(oldChild);
  });

  it('handles an empty structured root and empty legacy output', () => {
    const structuredRoot = document.createElement('div');
    const structured = render(structuredRoot, html`<div></div>`);

    expect(structuredRoot.querySelector('div')).toBeTruthy();
    expect(structuredRoot.querySelector('div')?.childNodes).toHaveLength(0);

    const legacyRoot = document.createElement('div');
    const legacy = render(legacyRoot, '');

    expect(legacyRoot.childNodes).toHaveLength(0);
    expect(patch(legacy, '')).toEqual({kind: 'noop', changedParts: 0, replacedNodes: 0});
  });

  it('classifies output transitions and value changes without touching the DOM', () => {
    const first = html`<p>${'one'}</p>`;
    const same = html`<p>${'one'}</p>`;
    const changed = html`<p>${'two'}</p>`;
    const differentTag = html`<span>${'two'}</span>`;

    expect(diff(undefined, first)).toEqual({kind: 'mount', changedParts: []});
    expect(diff(first, same)).toEqual({kind: 'noop', changedParts: []});
    expect(diff(first, changed)).toEqual({
      kind: 'patch',
      changedParts: [{index: 0, previousValue: 'one', nextValue: 'two'}]
    });
    expect(diff(first, differentTag)).toEqual({kind: 'replace', changedParts: []});
    expect(diff(first, '<p>two</p>')).toEqual({kind: 'replace', changedParts: []});
  });

  it('uses exact equality for NaN and distinguishes different object values', () => {
    const first = html`<p>${Number.NaN}</p>`;
    const sameNaN = html`<p>${Number.NaN}</p>`;
    const firstObject = {};
    const secondObject = {};

    expect(diff(first, sameNaN)).toEqual({kind: 'noop', changedParts: []});
    expect(diff(html`<p>${firstObject}</p>`, html`<p>${secondObject}</p>`)).toEqual({
      kind: 'patch',
      changedParts: [{index: 0, previousValue: firstObject, nextValue: secondObject}]
    });
  });
});
