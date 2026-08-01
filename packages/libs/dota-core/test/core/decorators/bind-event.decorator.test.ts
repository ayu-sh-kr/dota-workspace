import 'reflect-metadata';
import { BaseElement, Component, BindEvent, HelperUtils } from '@dota/core';
import { BindConfig } from '@dota/core/types';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getBindMetadata(target: any): Map<string, BindConfig> {
  return HelperUtils.fetchOrCreate<BindConfig>(target, 'Bind');
}

describe('@BindEvent decorator – metadata registration', () => {

  it('stores the event name, selector and method key in metadata', () => {
    class Host {
      @BindEvent({ event: 'click', id: '#submit-btn' })
      onSubmit(_e: Event) {}
    }

    const meta = getBindMetadata(new Host());
    const record = meta.get('onSubmit');

    expect(record).toBeDefined();
    expect(record?.event).toBe('click');
    expect(record?.id).toBe('#submit-btn');
  });

  it('stores optional params when provided', () => {
    class Host {
      @BindEvent({ event: 'click', id: '#btn', params: ['a', 'b'] })
      handle(_e: Event) {}
    }

    const record = getBindMetadata(new Host()).get('handle');
    expect(record?.params).toEqual(['a', 'b']);
  });

  it('leaves params undefined when not provided', () => {
    class Host {
      @BindEvent({ event: 'input', id: '#input-field' })
      onInput(_e: Event) {}
    }

    const record = getBindMetadata(new Host()).get('onInput');
    expect(record?.params).toBeUndefined();
  });

  it('stores multiple bindings independently under their own method keys', () => {
    class Host {
      @BindEvent({ event: 'click', id: '#save' })
      onSave(_e: Event) {}

      @BindEvent({ event: 'click', id: '#cancel' })
      onCancel(_e: Event) {}

      @BindEvent({ event: 'input', id: '#search-box' })
      onSearch(_e: Event) {}
    }

    const meta = getBindMetadata(new Host());

    expect(meta.size).toBe(3);
    expect(meta.get('onSave')?.id).toBe('#save');
    expect(meta.get('onCancel')?.id).toBe('#cancel');
    expect(meta.get('onSearch')?.id).toBe('#search-box');
  });

  it('does not share metadata between two sibling classes', () => {
    class HostA {
      @BindEvent({ event: 'click', id: '#a' })
      doA(_e: Event) {}
    }

    class HostB {
      @BindEvent({ event: 'click', id: '#b' })
      doB(_e: Event) {}
    }

    const metaA = getBindMetadata(new HostA());
    const metaB = getBindMetadata(new HostB());

    expect(metaA.has('doA')).toBe(true);
    expect(metaA.has('doB')).toBe(false);
    expect(metaB.has('doB')).toBe(true);
    expect(metaB.has('doA')).toBe(false);
  });

  it('overwrites the previous binding when the same method is decorated twice', () => {
    class Host {
      @BindEvent({ event: 'click', id: '#first' })
      @BindEvent({ event: 'mousedown', id: '#second' })
      handle(_e: Event) {}
    }

    const meta = getBindMetadata(new Host());
    expect(meta.size).toBe(1);
  });

  it('supports class-based selectors as well as id-based ones', () => {
    class Host {
      @BindEvent({ event: 'click', id: '.action-btn' })
      onAction(_e: Event) {}
    }

    const record = getBindMetadata(new Host()).get('onAction');
    expect(record?.id).toBe('.action-btn');
  });

  it('supports tag-based selectors', () => {
    class Host {
      @BindEvent({ event: 'submit', id: 'form' })
      onFormSubmit(_e: Event) {}
    }

    const record = getBindMetadata(new Host()).get('onFormSubmit');
    expect(record?.id).toBe('form');
  });
});

describe('@BindEvent decorator – DOM event binding on connectedCallback', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('invokes the method when the bound element is clicked', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-basic-click', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#action' })
      onAction(e: Event) {
        handler(e);
      }

      render() {
        return `<button id="action">click me</button>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.querySelector<HTMLButtonElement>('#action')!.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('passes the original Event object to the handler', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-passes-event', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#btn' })
      onClick(e: Event) {
        handler(e);
      }

      render() {
        return `<button id="btn">go</button>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const btn = el.querySelector<HTMLButtonElement>('#btn')!;
    const event = new MouseEvent('click', { bubbles: true });
    btn.dispatchEvent(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('invokes the method with the correct `this` reference pointing to the component', async () => {
    let capturedThis: any = undefined;

    @Component({ selector: 'bind-correct-this', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      public componentId = 'my-component';

      @BindEvent({ event: 'click', id: '#inner' })
      onInnerClick(_e: Event) {
        capturedThis = this;
      }

      render() {
        return `<span id="inner">text</span>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.querySelector<HTMLElement>('#inner')!.click();

    expect(capturedThis).toBe(el);
    expect(capturedThis.componentId).toBe('my-component');
  });

  it('does not fire the handler before the component is connected to the DOM', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-not-before-connect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#btn' })
      onClick(e: Event) {
        handler(e);
      }

      render() {
        return `<button id="btn">go</button>`;
      }
    }

    // create but do NOT append to DOM
    defineAndCreate(TestComponent);
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire the handler after the component is disconnected', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-stops-after-disconnect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#btn' })
      onClick(e: Event) {
        handler(e);
      }

      render() {
        return `<button id="btn">go</button>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const btn = el.querySelector<HTMLButtonElement>('#btn')!;
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);

    el.remove();
    await microtask();

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('binds multiple methods to separate child elements independently', async () => {
    const saveHandler = vi.fn();
    const cancelHandler = vi.fn();

    @Component({ selector: 'bind-multiple-methods', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#save' })
      onSave(_e: Event) { saveHandler(); }

      @BindEvent({ event: 'click', id: '#cancel' })
      onCancel(_e: Event) { cancelHandler(); }

      render() {
        return `
          <button id="save">Save</button>
          <button id="cancel">Cancel</button>
        `;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.querySelector<HTMLButtonElement>('#save')!.click();
    expect(saveHandler).toHaveBeenCalledTimes(1);
    expect(cancelHandler).not.toHaveBeenCalled();

    el.querySelector<HTMLButtonElement>('#cancel')!.click();
    expect(cancelHandler).toHaveBeenCalledTimes(1);
    expect(saveHandler).toHaveBeenCalledTimes(1);
  });

  it('binds to a class-selector and fires when a matching child is clicked', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-class-selector', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '.item' })
      onItemClick(e: Event) { handler(e); }

      render() {
        return `
          <li class="item">first</li>
          <li class="item">second</li>
        `;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const items = el.querySelectorAll<HTMLElement>('.item');
    items[0].click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('binds to a tag selector and fires when the matching element triggers the event', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-tag-selector', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'submit', id: 'form' })
      onSubmit(e: Event) {
        e.preventDefault();
        handler();
      }

      render() {
        return `<form><button type="submit">send</button></form>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('binds different event types to the same element', async () => {
    const clickHandler = vi.fn();
    const mouseoverHandler = vi.fn();

    @Component({ selector: 'bind-different-events-same-element', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#card' })
      onClick(_e: Event) { clickHandler(); }

      @BindEvent({ event: 'mouseover', id: '#card' })
      onMouseOver(_e: Event) { mouseoverHandler(); }

      render() {
        return `<div id="card">card</div>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const card = el.querySelector<HTMLElement>('#card')!;
    card.click();
    card.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(clickHandler).toHaveBeenCalledTimes(1);
    expect(mouseoverHandler).toHaveBeenCalledTimes(1);
  });

  it('does not invoke the handler when a different element inside the component is clicked', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-no-cross-fire', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#target' })
      onTargetClick(_e: Event) { handler(); }

      render() {
        return `
          <button id="target">target</button>
          <button id="other">other</button>
        `;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.querySelector<HTMLButtonElement>('#other')!.click();

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not register a duplicate listener when the component re-renders', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-no-duplicate-on-rerender', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'click', id: '#btn' })
      onClick(_e: Event) { handler(); }

      render() {
        return `<button id="btn">go</button>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).updateHTML();
    await microtask();

    el.querySelector<HTMLButtonElement>('#btn')!.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires an input event handler when the bound input value changes', async () => {
    const handler = vi.fn();

    @Component({ selector: 'bind-input-event', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BindEvent({ event: 'input', id: '#username' })
      onUsernameInput(e: Event) {
        handler((e.target as HTMLInputElement).value);
      }

      render() {
        return `<input id="username" type="text" />`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const input = el.querySelector<HTMLInputElement>('#username')!;
    input.value = 'alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(handler).toHaveBeenCalledWith('alice');
  });
});

