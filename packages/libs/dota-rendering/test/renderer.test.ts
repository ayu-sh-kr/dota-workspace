import {html, patch, render, update} from '@dota/main';

describe('renderer public API', () => {
  it('mounts legacy output and skips an equal string update', () => {
    const root = document.createElement('div');
    const instance = render(root, '<p>legacy</p>');
    const paragraph = root.firstElementChild;

    expect(root.innerHTML).toBe('<p>legacy</p>');
    expect(update(instance, '<p>legacy</p>')).toEqual({kind: 'noop', changedParts: 0, replacedNodes: 0});
    expect(root.firstElementChild).toBe(paragraph);
  });

  it('mounts structured output and exposes patch through both public update names', () => {
    const root = document.createElement('div');
    const instance = render(root, html`<p title=${'before'}>${'Before'}</p>`);
    const paragraph = root.querySelector('p');

    expect(patch(instance, html`<p title=${'after'}>${'After'}</p>`)).toEqual({
      kind: 'patch',
      changedParts: 2,
      replacedNodes: 0
    });
    expect(update(instance, html`<p title=${'final'}>${'Final'}</p>`)).toEqual({
      kind: 'patch',
      changedParts: 2,
      replacedNodes: 0
    });
    expect(root.querySelector('p')).toBe(paragraph);
    expect(paragraph?.getAttribute('title')).toBe('final');
    expect(paragraph?.textContent).toBe('Final');
  });

  it('mounts and patches flattened nested templates without replacing their elements', () => {
    const root = document.createElement('div');
    const view = (values: string[]) => html`
      <ul>${values.map((value) => html`<li data-value=${value}>${value}</li>`)}</ul>
    `;
    const instance = render(root, view(['one', 'two']));
    const firstItem = root.querySelector('li');

    expect(update(instance, view(['updated', 'two']))).toEqual({
      kind: 'patch',
      changedParts: 2,
      replacedNodes: 0
    });
    expect(root.querySelector('li')).toBe(firstItem);
    expect(firstItem?.getAttribute('data-value')).toBe('updated');
    expect(firstItem?.textContent).toBe('updated');
  });

  it('applies initial attributes before a child custom element connects', () => {
    const connectedValues: Array<string | null> = [];
    const tagName = 'dota-renderer-observed-child';
    if (!customElements.get(tagName)) {
      customElements.define(tagName, class extends HTMLElement {
        connectedCallback(): void {
          connectedValues.push(this.getAttribute('count'));
        }
      });
    }
    const root = document.createElement('div');
    document.body.append(root);

    render(root, html`<dota-renderer-observed-child count=${2}></dota-renderer-observed-child>`);

    expect(connectedValues).toEqual(['2']);
    root.remove();
  });

  it('remounts a structured instance when its static shape changes', () => {
    const root = document.createElement('div');
    const instance = render(root, html`<p>${'value'}</p>`);
    const paragraph = root.firstElementChild;

    expect(update(instance, html`<section>${'value'}</section>`)).toEqual({
      kind: 'replace',
      changedParts: 0,
      replacedNodes: 1
    });
    expect(root.firstElementChild).not.toBe(paragraph);
    expect(root.querySelector('section')?.textContent).toBe('value');
  });

  it('supports a ShadowRoot as the render root', () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({mode: 'open'});
    const instance = render(shadowRoot, html`<p>${'shadow content'}</p>`);

    expect(shadowRoot.querySelector('p')?.textContent).toBe('shadow content');
    expect(update(instance, html`<p>${'updated shadow content'}</p>`).kind).toBe('patch');
    expect(shadowRoot.querySelector('p')?.textContent).toBe('updated shadow content');
  });

  it('disposes a render instance without changing committed DOM', () => {
    const root = document.createElement('div');
    const instance = render(root, html`<p>${'content'}</p>`);
    const committedMarkup = root.innerHTML;

    expect(() => instance.dispose()).not.toThrow();
    expect(root.innerHTML).toBe(committedMarkup);
  });
});
