import {BaseElement, Component, DotaElementConstructor} from "@dota/core";
import {DocumentListener} from "@dota/core/decorators/document-listener.decorator.ts";
import {defineAndCreate, microtask} from "../../Utils.ts";

describe('DocumentListenerDecorator', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('binds the method to the document event on connect and unbinds on disconnect', async () => {
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

      @DocumentListener({ event: 'click' })
      handleDocumentClick(event: Event) {
        mockThis(this);
        mockMethod(event);
      }

      render(): string {
        return `<div>ok</div>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);

    // Before connecting: document listeners should not fire
    const event0 = new Event('click', { bubbles: true, composed: true });
    document.dispatchEvent(event0);
    expect(mockMethod).not.toHaveBeenCalled();

    // Connect to DOM => connectedCallback runs => document listener bound
    document.body.appendChild(el);
    await microtask();

    const event1 = new Event('click', { bubbles: true, composed: true });
    document.dispatchEvent(event1);

    expect(mockMethod).toHaveBeenCalledTimes(1);
    expect(mockMethod).toHaveBeenCalledWith(event1);

    // Ensure handler is called with component instance as `this`
    expect(mockThis).toHaveBeenCalledTimes(1);
    expect(mockThis).toHaveBeenCalledWith(el);

    // Disconnect => disconnectedCallback runs => listener unbound
    el.remove();
    await microtask();

    const event2 = new Event('click', { bubbles: true, composed: true });
    document.dispatchEvent(event2);

    expect(mockMethod).toHaveBeenCalledTimes(1); // unchanged after disconnect
  });

  it('supports multiple events when DocumentListener is used with an array', async () => {
    const calls: string[] = [];

    @Component({
      selector: 'test-component-decorator-selector-only-2',
      shadow: false
    })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @DocumentListener({ event: ['click', 'keydown'] })
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

    document.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    document.dispatchEvent(new Event('keydown', { bubbles: true, composed: true }));

    expect(calls).toEqual(['click', 'keydown']);

    el.remove();
    await microtask();

    document.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    document.dispatchEvent(new Event('keydown', { bubbles: true, composed: true }));

    // still only the initial two calls
    expect(calls).toEqual(['click', 'keydown']);
  });
});