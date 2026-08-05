import {html, render} from '@dota/main';

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
});
