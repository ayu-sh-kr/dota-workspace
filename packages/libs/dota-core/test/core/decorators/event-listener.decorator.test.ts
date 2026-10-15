import 'reflect-metadata';
import { BaseElement, Component, EventListener, EventType } from '@dota/core';
import { defineAndCreate, microtask } from '../../Utils.ts';

describe('@EventListener', () => {

  it('stops receiving window events after the element disconnects', async () => {
    const spy = vi.fn();

    @Component({ selector: 'event-listener-window-unbind', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @EventListener({ name: 'event-listener-ping', type: EventType.WINDOW })
      onPing() { spy(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    window.dispatchEvent(new Event('event-listener-ping'));
    expect(spy).toHaveBeenCalledTimes(1);

    el.remove();
    window.dispatchEvent(new Event('event-listener-ping'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('stops receiving host events after the element disconnects', async () => {
    const spy = vi.fn();

    @Component({ selector: 'event-listener-root-unbind', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @EventListener({ name: 'click', type: EventType.ROOT })
      onClick() { spy(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();
    el.remove();
    document.body.appendChild(el);
    await microtask();

    el.click();
    expect(spy).toHaveBeenCalledTimes(1);
    el.remove();
  });
});
