import 'reflect-metadata';
import { BaseElement, Component, HelperUtils } from '@dota/core';
import { Element } from '@dota/core/decorators/element.decorator.ts';
import { ElementConfigInternal } from '@dota/core/types';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getElementMetadata(target: any): Map<string, ElementConfigInternal> {
  return HelperUtils.fetchOrCreate<ElementConfigInternal>(target, 'Element');
}

describe('@Element decorator – metadata registration', () => {

  it('stores the selector, by strategy and property key for an id-based binding', () => {
    class Host {
      @Element({ selector: 'submit-btn', by: 'id' })
      submitBtn!: HTMLButtonElement;
    }

    const record = getElementMetadata(new Host()).get('submitBtn');

    expect(record).toBeDefined();
    expect(record?.selector).toBe('submit-btn');
    expect(record?.by).toBe('id');
    expect(record?.property).toBe('submitBtn');
  });

  it('stores the selector, by strategy and property key for a class-based binding', () => {
    class Host {
      @Element({ selector: 'action-btn', by: 'class' })
      actionBtn!: HTMLButtonElement;
    }

    const record = getElementMetadata(new Host()).get('actionBtn');

    expect(record?.selector).toBe('action-btn');
    expect(record?.by).toBe('class');
    expect(record?.property).toBe('actionBtn');
  });

  it('stores the selector, by strategy and property key for a tag-based binding', () => {
    class Host {
      @Element({ selector: 'form', by: 'tag' })
      formEl!: HTMLFormElement;
    }

    const record = getElementMetadata(new Host()).get('formEl');

    expect(record?.selector).toBe('form');
    expect(record?.by).toBe('tag');
    expect(record?.property).toBe('formEl');
  });

  it('uses the property key as the map entry key, not the selector', () => {
    class Host {
      @Element({ selector: 'my-input', by: 'id' })
      usernameField!: HTMLInputElement;
    }

    const meta = getElementMetadata(new Host());

    expect(meta.has('usernameField')).toBe(true);
    expect(meta.has('my-input')).toBe(false);
  });

  it('registers multiple element bindings independently', () => {
    class Host {
      @Element({ selector: 'header', by: 'tag' })
      headerEl!: HTMLElement;

      @Element({ selector: 'main-title', by: 'id' })
      titleEl!: HTMLHeadingElement;

      @Element({ selector: 'card', by: 'class' })
      cardEl!: HTMLDivElement;
    }

    const meta = getElementMetadata(new Host());

    expect(meta.size).toBe(3);
    expect(meta.get('headerEl')?.by).toBe('tag');
    expect(meta.get('titleEl')?.by).toBe('id');
    expect(meta.get('cardEl')?.by).toBe('class');
  });

  it('does not share metadata between two sibling classes', () => {
    class HostA {
      @Element({ selector: 'btn-a', by: 'id' })
      btnA!: HTMLButtonElement;
    }

    class HostB {
      @Element({ selector: 'btn-b', by: 'id' })
      btnB!: HTMLButtonElement;
    }

    const metaA = getElementMetadata(new HostA());
    const metaB = getElementMetadata(new HostB());

    expect(metaA.has('btnA')).toBe(true);
    expect(metaA.has('btnB')).toBe(false);
    expect(metaB.has('btnB')).toBe(true);
    expect(metaB.has('btnA')).toBe(false);
  });
});

describe('@Element decorator – DOM binding on connectedCallback', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('assigns the element queried by id to the component property', async () => {
    @Component({ selector: 'element-by-id', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'action-btn', by: 'id' })
      actionBtn!: HTMLButtonElement;

      render() {
        return `<button id="action-btn">click</button>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const bound = (el as any).actionBtn as HTMLButtonElement;

    expect(bound).not.toBeNull();
    expect(bound).toBeInstanceOf(HTMLButtonElement);
    expect(bound.id).toBe('action-btn');
  });

  it('assigns the element queried by class to the component property', async () => {
    @Component({ selector: 'element-by-class', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'highlight', by: 'class' })
      highlightEl!: HTMLSpanElement;

      render() {
        return `<span class="highlight">text</span>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const bound = (el as any).highlightEl as HTMLSpanElement;

    expect(bound).not.toBeNull();
    expect(bound).toBeInstanceOf(HTMLSpanElement);
    expect(bound.classList.contains('highlight')).toBe(true);
  });

  it('assigns the element queried by tag name to the component property', async () => {
    @Component({ selector: 'element-by-tag', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'input', by: 'tag' })
      inputEl!: HTMLInputElement;

      render() {
        return `<input type="text" placeholder="enter text" />`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const bound = (el as any).inputEl as HTMLInputElement;

    expect(bound).not.toBeNull();
    expect(bound).toBeInstanceOf(HTMLInputElement);
  });

  it('assigns null to the property when the selector matches nothing in the DOM', async () => {
    @Component({ selector: 'element-not-found', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'ghost', by: 'id' })
      ghostEl!: HTMLElement | null;

      render() {
        return `<div>no ghost here</div>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).ghostEl).toBeNull();
  });

  it('assigns all multiple element properties independently', async () => {
    @Component({ selector: 'element-multiple', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'save-btn', by: 'id' })
      saveBtn!: HTMLButtonElement;

      @Element({ selector: 'cancel-btn', by: 'id' })
      cancelBtn!: HTMLButtonElement;

      @Element({ selector: 'status-msg', by: 'class' })
      statusMsg!: HTMLParagraphElement;

      render() {
        return `
          <button id="save-btn">Save</button>
          <button id="cancel-btn">Cancel</button>
          <p class="status-msg">Ready</p>
        `;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).saveBtn?.id).toBe('save-btn');
    expect((el as any).cancelBtn?.id).toBe('cancel-btn');
    expect((el as any).statusMsg?.classList.contains('status-msg')).toBe(true);
  });

  it('bound element reference is the actual live DOM node inside the component', async () => {
    @Component({ selector: 'element-live-ref', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'counter', by: 'id' })
      counterEl!: HTMLSpanElement;

      render() {
        return `<span id="counter">0</span>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const bound = (el as any).counterEl as HTMLSpanElement;
    const direct = el.querySelector<HTMLSpanElement>('#counter')!;

    expect(bound).toBe(direct);
  });

  it('property is undefined before the component is connected', async () => {
    @Component({ selector: 'element-before-connect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'title', by: 'id' })
      titleEl!: HTMLHeadingElement;

      render() {
        return `<h1 id="title">Hello</h1>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);

    // not yet appended to DOM
    expect((el as any).titleEl).toBeUndefined();

    document.body.appendChild(el);
    await microtask();

    expect((el as any).titleEl).not.toBeUndefined();
  });

  it('re-assigns the property to the updated DOM node after updateHTML', async () => {
    @Component({ selector: 'element-after-rerender', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'msg', by: 'id' })
      msgEl!: HTMLParagraphElement;

      public text = 'initial';

      render() {
        return `<p id="msg">${this.text}</p>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const firstRef = (el as any).msgEl as HTMLParagraphElement;
    expect(firstRef.textContent).toBe('initial');

    (el as any).text = 'updated';
    (el as any).updateHTML();
    await microtask();

    const secondRef = (el as any).msgEl as HTMLParagraphElement;
    expect(secondRef.textContent).toBe('updated');
  });

  it('when multiple elements share the same class, binds the first matching one', async () => {
    @Component({ selector: 'element-first-match', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'item', by: 'class' })
      firstItem!: HTMLLIElement;

      render() {
        return `
          <ul>
            <li class="item">first</li>
            <li class="item">second</li>
            <li class="item">third</li>
          </ul>
        `;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const bound = (el as any).firstItem as HTMLLIElement;

    expect(bound).not.toBeNull();
    expect(bound.textContent).toBe('first');
  });

  it('bound input element is interactive — setting value is reflected correctly', async () => {
    @Component({ selector: 'element-interactive', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Element({ selector: 'search', by: 'id' })
      searchInput!: HTMLInputElement;

      render() {
        return `<input id="search" type="text" />`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const input = (el as any).searchInput as HTMLInputElement;
    input.value = 'hello';

    expect(el.querySelector<HTMLInputElement>('#search')!.value).toBe('hello');
  });
});

