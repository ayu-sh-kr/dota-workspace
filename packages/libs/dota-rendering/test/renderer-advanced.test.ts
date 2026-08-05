import {html, keyed, nothing, render, update, when} from '@dota/main';

describe('renderer advanced contracts', () => {
  it('mounts and patches a root-level text interpolation', () => {
    const root = document.createElement('div');
    const view = (value: string) => html`${value}`;
    const instance = render(root, view('first'));

    expect(root.textContent).toBe('first');

    update(instance, view('updated'));

    expect(root.textContent).toBe('updated');
  });

  it('preserves legacy string behavior and can transition between rendering strategies', () => {
    const root = document.createElement('div');
    const instance = render(root, '<p>legacy</p>');
    const legacyParagraph = root.querySelector('p');

    expect(update(instance, '<p>legacy</p>')).toEqual({kind: 'noop', changedParts: 0, replacedNodes: 0});
    expect(root.querySelector('p')).toBe(legacyParagraph);
    expect(update(instance, '<p>changed</p>')).toEqual({kind: 'replace', changedParts: 0, replacedNodes: 1});
    expect(root.innerHTML).toBe('<p>changed</p>');

    expect(update(instance, html`<p>${'structured'}</p>`)).toEqual({
      kind: 'replace', changedParts: 0, replacedNodes: 1
    });
    const structuredParagraph = root.querySelector('p');
    expect(structuredParagraph?.textContent).toBe('structured');
    expect(update(instance, html`<p>${'patched'}</p>`).kind).toBe('patch');
    expect(root.querySelector('p')).toBe(structuredParagraph);
    expect(update(instance, '<p>legacy again</p>').kind).toBe('replace');
    expect(root.innerHTML).toBe('<p>legacy again</p>');
  });

  it('reconstructs attributes containing several interpolations', () => {
    const root = document.createElement('div');
    const view = (size: string, theme: string) => html`<div class="card ${size} theme-${theme}"></div>`;
    const instance = render(root, view('small', 'light'));
    const element = root.querySelector('div');

    expect(element?.className).toBe('card small theme-light');

    update(instance, view('large', 'dark'));

    expect(root.querySelector('div')).toBe(element);
    expect(element?.className).toBe('card large theme-dark');
  });

  it('applies boolean attributes and DOM properties with their native semantics', () => {
    const root = document.createElement('div');
    const view = (disabled: boolean, value: string) => html`
      <input ?disabled=${disabled} .value=${value}>
    `;
    const instance = render(root, view(false, 'initial'));
    const input = root.querySelector('input');

    expect(input?.disabled).toBe(false);
    expect(input?.hasAttribute('disabled')).toBe(false);
    expect(input?.value).toBe('initial');
    expect(input?.hasAttribute('.value')).toBe(false);

    update(instance, view(true, 'updated'));

    expect(root.querySelector('input')).toBe(input);
    expect(input?.disabled).toBe(true);
    expect(input?.getAttribute('disabled')).toBe('');
    expect(input?.value).toBe('updated');
  });

  it('preserves case-sensitive property names through HTML parsing', () => {
    const root = document.createElement('div');
    const view = (value: unknown) => html`<dota-property-target .selectedItem=${value}></dota-property-target>`;
    const firstValue = {id: 1};
    const nextValue = {id: 2};
    const instance = render(root, view(firstValue));
    const target = root.querySelector('dota-property-target') as (HTMLElement & {selectedItem?: unknown}) | null;

    expect(target?.selectedItem).toBe(firstValue);
    expect((target as unknown as {selecteditem?: unknown})?.selecteditem).toBeUndefined();

    update(instance, view(nextValue));

    expect(target?.selectedItem).toBe(nextValue);
  });

  it('replaces and removes declarative event listeners without remounting', () => {
    const root = document.createElement('div');
    const first = vi.fn();
    const second = vi.fn();
    const view = (listener: EventListener | typeof nothing) => html`<button @click=${listener}>Run</button>`;
    const instance = render(root, view(first));
    const button = root.querySelector('button');

    button?.click();
    update(instance, view(second));
    button?.click();
    update(instance, view(nothing));
    button?.click();

    expect(root.querySelector('button')).toBe(button);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(button?.hasAttribute('@click')).toBe(false);
  });

  it('changes conditional branches without replacing their parent', () => {
    const root = document.createElement('div');
    const view = (isReady: boolean, value: string) => html`
      <section>${when(isReady, html`<strong>${value}</strong>`, html`<em>Waiting</em>`)}</section>
    `;
    const instance = render(root, view(false, 'first'));
    const section = root.querySelector('section');
    const waiting = root.querySelector('em');

    update(instance, view(true, 'ready'));

    expect(root.querySelector('section')).toBe(section);
    expect(root.querySelector('em')).toBeNull();
    expect(root.querySelector('strong')?.textContent).toBe('ready');
    expect(root.querySelector('strong')).not.toBe(waiting);

    const strong = root.querySelector('strong');
    update(instance, view(true, 'updated'));
    expect(root.querySelector('strong')).toBe(strong);
    expect(strong?.textContent).toBe('updated');
  });

  it('clears conditional range nodes when returning to an ordinary child value', () => {
    const root = document.createElement('div');
    const conditionalView = () => html`<section>${when(true, html`<strong>branch</strong>`)}</section>`;
    const textView = () => html`<section>${'plain text'}</section>`;
    const instance = render(root, conditionalView());
    const section = root.querySelector('section');

    update(instance, textView());

    expect(root.querySelector('section')).toBe(section);
    expect(root.querySelector('strong')).toBeNull();
    expect(section?.textContent).toBe('plain text');
  });

  it('inserts, removes, updates, and reorders keyed templates while retaining nodes', () => {
    type Item = {id: number; label: string};
    const root = document.createElement('div');
    const view = (items: Item[]) => html`
      <ul>${keyed(items, ({id}) => id, ({id, label}) => html`<li data-id=${id}>${label}</li>`)}</ul>
    `;
    const instance = render(root, view([
      {id: 1, label: 'one'},
      {id: 2, label: 'two'},
      {id: 3, label: 'three'}
    ]));
    const first = root.querySelector('[data-id="1"]');
    const second = root.querySelector('[data-id="2"]');

    update(instance, view([
      {id: 3, label: 'three'},
      {id: 2, label: 'updated two'},
      {id: 4, label: 'four'}
    ]));

    const items = [...root.querySelectorAll('li')];
    expect(items.map((item) => item.getAttribute('data-id'))).toEqual(['3', '2', '4']);
    expect(items[1]).toBe(second);
    expect(items[1].textContent).toBe('updated two');
    expect(first?.isConnected).toBe(false);
  });

  it('uses atomic keyed moves when the parent supports them', () => {
    const root = document.createElement('div');
    const view = (ids: number[]) => html`
      <ul>${keyed(ids, (id) => id, (id) => html`<li>${id}</li>`)}</ul>
    `;
    const instance = render(root, view([1, 2]));
    const list = root.querySelector('ul');
    if (!list) throw new Error('Expected a rendered list');
    const moveBefore = vi.fn((node: Node, before: Node | null) => list.insertBefore(node, before));
    Object.defineProperty(list, 'moveBefore', {configurable: true, value: moveBefore});

    update(instance, view([2, 1]));

    expect(moveBefore).toHaveBeenCalled();
    expect([...list.querySelectorAll('li')].map(({textContent}) => textContent)).toEqual(['2', '1']);
  });

  it('rejects duplicate keys before mutating an existing keyed list', () => {
    const root = document.createElement('div');
    const view = (ids: number[]) => html`
      <ul>${keyed(ids, (id) => id, (id) => html`<li>${id}</li>`)}</ul>
    `;
    const instance = render(root, view([1, 2]));
    const before = root.textContent;

    expect(() => update(instance, view([1, 1]))).toThrow('Duplicate render key: 1');
    expect(root.textContent).toBe(before);
  });

  it('keeps component-local indexes isolated between parent and child render roots', () => {
    const parentRoot = document.createElement('div');
    const parentView = (label: string) => html`
      <section><dota-index-child label=${label}></dota-index-child></section>
    `;
    const childView = (value: string) => html`<div><span>${value}</span></div>`;
    const parent = render(parentRoot, parentView('parent value'));
    const childHost = parentRoot.querySelector('dota-index-child');
    const childShadow = childHost?.attachShadow({mode: 'open'});
    if (!childShadow) throw new Error('Expected a child shadow root');
    const child = render(childShadow, childView('child value'));
    const childDiv = childShadow.querySelector('div');
    const childSpan = childShadow.querySelector('span');

    expect(parentRoot.querySelector('section')?.getAttribute('data-dota-index')).toBe('0');
    expect(childHost?.getAttribute('data-dota-index')).toBe('1');
    expect(childDiv?.getAttribute('data-dota-index')).toBe('0');
    expect(childSpan?.getAttribute('data-dota-index')).toBe('1');

    update(parent, parentView('updated parent'));
    expect(childShadow.querySelector('span')).toBe(childSpan);
    expect(childHost?.getAttribute('label')).toBe('updated parent');

    update(child, childView('updated child'));
    expect(parentRoot.querySelector('dota-index-child')).toBe(childHost);
    expect(childShadow.querySelector('div')).toBe(childDiv);
    expect(childSpan?.textContent).toBe('updated child');
  });
});
