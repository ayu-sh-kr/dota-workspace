import {defineAndCreate, microtask} from "../../Utils.ts";
import {BaseElement, Component, DocumentListener, WindowListener} from "@dota/core";


describe('WindowListenerDecorator', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('binds the method to the window event on connect and unbinds on disconnect', async () => {
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

      @WindowListener({event: 'resize'})
      handleWindowResize(event: Event) {
        mockThis(this);
        mockMethod(event);
      }

      render(): string {
        return `<div>ok</div>`;
      }
    }

    const {el} = defineAndCreate(TestComponent);

    // Before connecting: window listeners should not fire
    const event0 = new Event('resize');
    window.dispatchEvent(event0);
    expect(mockMethod).not.toHaveBeenCalled();

    // Connect to DOM => connectedCallback runs => window listener bound
    document.body.appendChild(el);
    await microtask();

    const event1 = new Event('resize');
    window.dispatchEvent(event1);

    expect(mockMethod).toHaveBeenCalledTimes(1);
    expect(mockMethod).toHaveBeenCalledWith(event1);

    // Ensure handler is called with component instance as `this`
    expect(mockThis).toHaveBeenCalledTimes(1);
    expect(mockThis).toHaveBeenCalledWith(el);

    // Disconnect => disconnectedCallback runs => listener unbound
    el.remove();
    await microtask();

    const event2 = new Event('resize');
    window.dispatchEvent(event2);
    expect(mockMethod).toHaveBeenCalledTimes(1); // unchanged after disconnect

    expect(mockThis).toHaveBeenCalledTimes(1); // unchanged after disconnect
  });

  it('supports multiple events when WindowListener is used with an array', async () => {
    const calls: string[] = [];

    @Component({
      selector: 'test-component-decorator-selector-only-2',
      shadow: false
    })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @WindowListener({ event: ['click', 'keydown'] })
      handleDocumentEvent(event: Event) {
        calls.push(event.type);
      }

      render(): string {
        return `<div>ok</div>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    window.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    window.dispatchEvent(new Event('keydown', { bubbles: true, composed: true }));

    expect(calls).toEqual(['click', 'keydown']);

    el.remove();
    await microtask();

    window.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    window.dispatchEvent(new Event('keydown', { bubbles: true, composed: true }));

    // still only the initial two calls
    expect(calls).toEqual(['click', 'keydown']);
  });

})