import {html, render, update} from '@dota/main';

describe('renderer component boundaries', () => {
  it('shows which light and shadow descendants the current traversal sees', () => {
    const tagName = 'dota-boundary-probe';
    if (!customElements.get(tagName)) {
      customElements.define(tagName, class extends HTMLElement {});
    }

    const root = document.createElement('div');
    render(root, html`<section><dota-boundary-probe><span>light child</span></dota-boundary-probe></section>`);

    const host = root.querySelector(tagName);
    const lightChild = host?.querySelector('span');
    const shadowRoot = host?.shadowRoot ?? host?.attachShadow({mode: 'open'});
    if (!shadowRoot) throw new Error('Expected the custom-element probe to have a shadow root');
    shadowRoot.innerHTML = '<i>shadow child</i>';
    const shadowChild = shadowRoot.querySelector('i');

    console.log('[dota-rendering] component boundary traversal', {
      host: host?.getAttribute('data-dota-index'),
      lightChild: lightChild?.getAttribute('data-dota-index'),
      shadowChild: shadowChild?.getAttribute('data-dota-index'),
      component: host?.getAttribute('data-dota-component')
    });

    expect(host?.getAttribute('data-dota-component')).toBe(tagName);
    expect(host?.getAttribute('data-dota-index')).toBe('1');
    expect(lightChild?.getAttribute('data-dota-index')).toBe('2');
    expect(shadowRoot).toBeTruthy();
    expect(shadowChild?.hasAttribute('data-dota-index')).not.toBe(true);
  });

  it('does not index light DOM created by a child during connection', () => {
    const tagName = 'dota-rendering-child';
    if (!customElements.get(tagName)) {
      customElements.define(tagName, class extends HTMLElement {
        connectedCallback(): void {
          this.innerHTML = '<span>child-owned content</span>';
        }
      });
    }

    const root = document.createElement('div');
    render(root, html`<section><dota-rendering-child></dota-rendering-child></section>`);

    const child = root.querySelector(tagName) as (HTMLElement & {connectedCallback?: () => void}) | null;
    child?.connectedCallback?.();
    const childContent = root.querySelector(`${tagName} span`);

    expect(childContent).toBeTruthy();
    expect(childContent?.hasAttribute('data-dota-index')).toBe(false);
    expect(childContent?.hasAttribute('data-dota-dynamic')).toBe(false);
  });

  it('patches a live custom-element host recreated by an intermediate light-DOM component', () => {
    const wrapperName = 'dota-recreating-wrapper';
    const childName = 'dota-recreated-child';
    if (!customElements.get(wrapperName)) {
      customElements.define(wrapperName, class extends HTMLElement {
        connectedCallback(): void {
          this.innerHTML = this.innerHTML;
        }
      });
    }
    if (!customElements.get(childName)) {
      customElements.define(childName, class extends HTMLElement {
        color = '';

        static get observedAttributes(): string[] {
          return ['color'];
        }

        attributeChangedCallback(_name: string, _oldValue: string | null, newValue: string | null): void {
          this.color = newValue ?? '';
        }

        connectedCallback(): void {
          this.append(document.createElement('span'));
        }
      });
    }

    const root = document.createElement('div');
    document.body.append(root);
    const view = (color: string) => html`
      <dota-recreating-wrapper>
        <dota-recreated-child color="${color}"></dota-recreated-child>
      </dota-recreating-wrapper>
    `;
    const instance = render(root, view('indigo'));
    const child = root.querySelector(childName) as (HTMLElement & {color: string}) | null;
    const internalChild = child?.firstElementChild;

    update(instance, view('rose'));

    expect(root.querySelector(childName)).toBe(child);
    expect(child?.getAttribute('color')).toBe('rose');
    expect(child?.color).toBe('rose');
    expect(child?.firstElementChild).toBe(internalChild);
    root.remove();
  });
});
