import {BaseElement, Component, DotaElementConstructor, HostListener} from "@dota/core";

describe('HostListenerDecorator', () => {
  function microtask() {
    return Promise.resolve();
  }

  function defineAndCreate<T extends DotaElementConstructor>(Ctor: T) {
    // Custom elements cannot be "undefined", so always use a unique tag per test.
    const tag = `test-component-${Math.random().toString(36).slice(2)}`;

    if (!customElements.get(tag)) {
      customElements.define(tag, Ctor);
    }

    const el = document.createElement(tag) as InstanceType<T>;
    return { tag, el };
  }

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('binds the method to the host event on connect and unbinds on disconnect', async () => {
    const mockMethod = jest.fn();
    const mockThis = jest.fn();

    @Component({
      selector: 'test-component-decorator-selector-only',
      shadow: false
    })
    class TestComponent extends BaseElement {

      constructor() {
        super();
      }

      @HostListener({ event: 'click' })
      handleClick(event: Event) {
        mockThis(this);
        mockMethod(event);
      }

      render(): string {
        return `<div>ok</div>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);

    // Before connecting: host listeners should not fire.
    el.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    expect(mockMethod).not.toHaveBeenCalled();

    // Connect to DOM => connectedCallback runs => host listener bound
    document.body.appendChild(el);
    await microtask();

    const event1 = new Event('click', { bubbles: true, composed: true });
    el.dispatchEvent(event1);

    expect(mockMethod).toHaveBeenCalledTimes(1);
    expect(mockMethod).toHaveBeenCalledWith(event1);

    // Ensure handler is called with component instance as `this`
    expect(mockThis).toHaveBeenCalledTimes(1);
    expect(mockThis).toHaveBeenCalledWith(el);

    // Disconnect => disconnectedCallback runs => listener unbound
    el.remove();
    await microtask();

    el.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    expect(mockMethod).toHaveBeenCalledTimes(1); // unchanged after disconnect
  });

  it('supports multiple events when HostListener is used with an array', async () => {
    const mockMethod = jest.fn();

    @Component({
      selector: 'test-component-decorator-selector-only-2',
      shadow: false
    })
    class TestComponent extends BaseElement {

      constructor() {
        super();
      }

      @HostListener({ event: ['click', 'mouseenter'] })
      handleAny(event: Event) {
        mockMethod(event.type);
      }

      render(): string {
        return `<div>ok</div>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    el.dispatchEvent(new Event('mouseenter', { bubbles: true, composed: true }));

    expect(mockMethod).toHaveBeenCalledTimes(2);
    expect(mockMethod).toHaveBeenNthCalledWith(1, 'click');
    expect(mockMethod).toHaveBeenNthCalledWith(2, 'mouseenter');
  });
});