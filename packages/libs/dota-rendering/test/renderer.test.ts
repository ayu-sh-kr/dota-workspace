import {
  configureDotaRenderingLogger,
  deferRender,
  getDotaRenderingLogger,
  html,
  patch,
  render,
  update
} from '@dota/main';

afterEach(() => {
  configureDotaRenderingLogger('silent');
});

describe('renderer public API', () => {
  it('does not clear adopted DOM when a deferred session is disposed before updating', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>server</p>';
    const createSession = vi.fn((output) => render(root, output));
    const instance = deferRender(html``, createSession);
    const serverParagraph = root.firstElementChild;

    instance.dispose();
    expect(root.firstElementChild).toBe(serverParagraph);

    expect(instance.update(html`<p>${'client'}</p>`)).toEqual({
      kind: 'noop',
      changedParts: 0,
      replacedNodes: 0
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('creates one session from the first deferred update and delegates later updates', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>server</p>';
    const createSession = vi.fn((output) => render(root, output));
    const instance = deferRender(html``, createSession);
    const firstOutput = html`<p>${'client'}</p>`;

    expect(instance.update(firstOutput)).toEqual({kind: 'mount', changedParts: 0, replacedNodes: 0});
    expect(createSession).toHaveBeenCalledOnce();
    expect(createSession).toHaveBeenCalledWith(firstOutput);
    expect(root.textContent).toBe('client');

    expect(instance.update(html`<p>${'updated'}</p>`)).toEqual({
      kind: 'patch',
      changedParts: 1,
      replacedNodes: 0
    });
    expect(createSession).toHaveBeenCalledOnce();
    expect(root.textContent).toBe('updated');
  });

  it('emits diagnostics through the logger configured by its host integration', () => {
    configureDotaRenderingLogger('debug');
    const debug = vi.spyOn(getDotaRenderingLogger(), 'debug');

    render(document.createElement('div'), '<p>legacy</p>');

    expect(debug).toHaveBeenCalledWith('[dota-rendering] mounting render session', {
      output: 'legacy',
      hydrationMarkers: false
    });
  });

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
    const instance = render(root, html`<p title="${'before'}">${'Before'}</p>`);
    const paragraph = root.querySelector('p');

    expect(patch(instance, html`<p title="${'after'}">${'After'}</p>`)).toEqual({
      kind: 'patch',
      changedParts: 2,
      replacedNodes: 0
    });
    expect(update(instance, html`<p title="${'final'}">${'Final'}</p>`)).toEqual({
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
      <ul>${values.map((value) => html`<li data-value="${value}">${value}</li>`)}</ul>
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

  it('uses normal observed attributes before connection and during patches', () => {
    const attributeValues: Array<string | null> = [];
    const connectedValues: Array<string | null> = [];
    const tagName = 'dota-renderer-observed-child';
    if (!customElements.get(tagName)) {
      customElements.define(tagName, class extends HTMLElement {
        count = 0;

        static get observedAttributes(): string[] {
          return ['count'];
        }

        attributeChangedCallback(_name: string, _oldValue: string | null, newValue: string | null): void {
          attributeValues.push(newValue);
          this.count = Number(newValue);
        }

        connectedCallback(): void {
          connectedValues.push(this.getAttribute('count'));
          this.append(document.createElement('span'));
        }
      });
    }
    const root = document.createElement('div');
    document.body.append(root);

    const view = (count: number) => html`
      <dota-renderer-observed-child count="${count}"></dota-renderer-observed-child>
    `;
    const instance = render(root, view(2));
    const child = root.querySelector(tagName) as (HTMLElement & {count: number}) | null;
    const internalChild = child?.firstElementChild;

    update(instance, view(3));

    expect(root.querySelector(tagName)).toBe(child);
    expect(child?.getAttribute('count')).toBe('3');
    expect(child?.count).toBe(3);
    expect(child?.firstElementChild).toBe(internalChild);
    expect(attributeValues).toEqual(['2', '3']);
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
