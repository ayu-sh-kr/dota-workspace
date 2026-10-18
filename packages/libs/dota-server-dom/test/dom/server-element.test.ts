// @vitest-environment node
import '@dota/install';
import {ServerDocument, ServerElement} from '@dota/index';

describe('ServerElement', () => {
  it('stores attributes case-insensitively in insertion order', () => {
    const element = ServerElement.create('div');

    element.setAttribute('Data-A', 1);
    element.setAttribute('title', 'x');
    element.setAttribute('data-a', 2);

    expect(element.getAttributeNames()).toEqual(['data-a', 'title']);
    expect(element.getAttribute('DATA-A')).toBe('2');
    expect(element.toggleAttribute('hidden')).toBe(true);
    expect(element.toggleAttribute('hidden')).toBe(false);
    expect(element.toggleAttribute('hidden', true)).toBe(true);
    expect(element.attributes).toEqual([{name: 'data-a', value: '2'}, {name: 'title', value: 'x'}, {name: 'hidden', value: ''}]);
  });

  it('reflects id, className, classList, dataset, and style into attributes', () => {
    const element = ServerElement.create('div');

    element.id = 'card';
    element.className = 'a b';
    element.classList.add('c', 'a');
    element.classList.remove('b');
    element.classList.toggle('d', false);
    element.dataset.userId = '42';
    element.style.setProperty('margin', '0');
    element.style.backgroundColor = 'red';
    element.style.setProperty('--gap', '1rem', 'important');

    expect(element.getAttribute('class')).toBe('a c');
    expect(element.classList.contains('c')).toBe(true);
    expect(element.getAttribute('data-user-id')).toBe('42');
    expect({...element.dataset}).toEqual({userId: '42'});
    expect(element.getAttribute('style')).toBe('margin: 0; background-color: red; --gap: 1rem !important;');
    expect(element.style.getPropertyValue('background-color')).toBe('red');
    expect(element.style.getPropertyPriority('--gap')).toBe('important');
    expect(element.style.removeProperty('margin')).toBe('0');
    expect(element.id).toBe('card');
  });

  it('resolves the tag name from customElements, then the @Component selector', () => {
    class Registered extends ServerElement {}
    class Decorated extends ServerElement {
      static __dotaSelector = 'decorated-el';
    }
    customElements.define('registered-el', Registered as unknown as CustomElementConstructor);

    expect(new Registered().localName).toBe('registered-el');
    expect(new Decorated().tagName).toBe('DECORATED-EL');
    expect(ServerElement.create('svg').nodeName).toBe('SVG');
  });

  it('keeps a small node tree and moves nodes between parents', () => {
    const list = ServerElement.create('ul');
    const other = ServerElement.create('ol');
    const item = ServerElement.create('li');

    list.append(item, 'tail');
    item.textContent = 'one';
    other.appendChild(item);

    expect(list.childNodes.map((node) => node.nodeName)).toEqual(['#text']);
    expect(item.parentElement).toBe(other);
    expect(other.textContent).toBe('one');
    expect(other.contains(item.firstChild)).toBe(true);
    expect(() => item.appendChild(other)).toThrow(DOMException);
  });

  it('dispatches events to its listeners and attaches one shadow root', () => {
    const element = ServerElement.create('div');
    const listener = vi.fn();
    element.addEventListener('ping', listener);

    element.dispatchEvent(new CustomEvent('ping', {detail: 1}));
    const root = element.attachShadow({mode: 'open'});

    expect(listener).toHaveBeenCalledOnce();
    expect(element.shadowRoot).toBe(root);
    expect(() => element.attachShadow({mode: 'open'})).toThrow(DOMException);
    expect(element.isConnected).toBe(false);
    expect(element.querySelector('*')).toBeNull();
  });
});

describe('ServerDocument', () => {
  it('owns an html/head/body tree and builds elements, text, and fragments', () => {
    const document = new ServerDocument(new URL('http://localhost/a?b=1') as unknown as Location);
    const fragment = document.createDocumentFragment();
    fragment.append(document.createElement('META'), document.createTextNode('x'));

    document.head.appendChild(fragment);
    document.title = 'Page';

    expect(document.documentElement.children.map((child) => child.localName)).toEqual(['head', 'body']);
    expect(document.head.childNodes.map((node) => node.nodeName)).toEqual(['META', '#text']);
    expect(fragment.childNodes).toEqual([]);
    expect(document.title).toBe('Page');
    expect(document.URL).toBe('http://localhost/a?b=1');
    expect(document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient').localName).toBe('linearGradient');
  });
});
