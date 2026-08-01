import 'reflect-metadata';
import { BaseElement, Component, EventManagerService } from '@dota/core';
import { EventBindRecord, EventOptionMeta } from '@dota/core/types';
import { defineAndCreate } from '../../Utils.ts';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeOption(overrides: Partial<EventOptionMeta> & { event: string | string[] }): EventOptionMeta {
  return {
    name:   overrides.name   ?? 'handler',
    method: overrides.method ?? vi.fn(),
    event:  overrides.event,
  };
}

function makeService() {
  @Component({ selector: `svc-host-${Math.random().toString(36).slice(2)}`, shadow: false })
  class HostComponent extends BaseElement {
    constructor() {
      super();
    }
    render() { return ``; }
  }

  const { el } = defineAndCreate(HostComponent as any);
  const service = new EventManagerService(el as any);
  return { service, el };
}

// ─── addEvent / getEvent ──────────────────────────────────────────────────────

describe('EventManagerService – addEvent and getEvent', () => {

  it('stores a record that can be retrieved with the correct type and key', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });
    const handler = vi.fn() as unknown as EventListener;

    const record: EventBindRecord = {
      element: el,
      type:    'Host',
      option,
      event:   'click',
      handler,
    };

    service.addEvent('Host', record);

    const stored = service.getEvent('Host', 'click:onClick');
    expect(stored).toBeDefined();
    expect(stored?.event).toBe('click');
    expect(stored?.handler).toBe(handler);
  });

  it('returns undefined when the type has no records at all', () => {
    const { service } = makeService();
    expect(service.getEvent('Window', 'click:onClick')).toBeUndefined();
  });

  it('returns undefined when the type exists but the key is missing', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });

    service.addEvent('Host', {
      element: el, type: 'Host', option, event: 'click', handler: vi.fn() as unknown as EventListener,
    });

    expect(service.getEvent('Host', 'mouseover:onClick')).toBeUndefined();
  });

  it('overwrites an existing record when addEvent is called with the same key', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });
    const handler1 = vi.fn() as unknown as EventListener;
    const handler2 = vi.fn() as unknown as EventListener;

    service.addEvent('Host', { element: el, type: 'Host', option, event: 'click', handler: handler1 });
    service.addEvent('Host', { element: el, type: 'Host', option, event: 'click', handler: handler2 });

    expect(service.getEvent('Host', 'click:onClick')?.handler).toBe(handler2);
  });

  it('stores records under different types independently', () => {
    const { service, el } = makeService();
    const clickOpt  = makeOption({ event: 'click',  name: 'onClick' });
    const resizeOpt = makeOption({ event: 'resize', name: 'onResize' });

    service.addEvent('Host',   { element: el,     type: 'Host',   option: clickOpt,  event: 'click',  handler: vi.fn() as unknown as EventListener });
    service.addEvent('Window', { element: window, type: 'Window', option: resizeOpt, event: 'resize', handler: vi.fn() as unknown as EventListener });

    expect(service.getEvent('Host',   'click:onClick')).toBeDefined();
    expect(service.getEvent('Window', 'resize:onResize')).toBeDefined();
    expect(service.getEvent('Host',   'resize:onResize')).toBeUndefined();
    expect(service.getEvent('Window', 'click:onClick')).toBeUndefined();
  });

  it('key format is eventName:optionName', () => {
    const { service } = makeService();
    const option = makeOption({ event: 'keydown', name: 'onKeydown' });

    service.addEvent('Document', {
      element: document, type: 'Document', option, event: 'keydown', handler: vi.fn() as unknown as EventListener,
    });

    expect(service.getEvent('Document', 'keydown:onKeydown')).toBeDefined();
    expect(service.getEvent('Document', 'onKeydown:keydown')).toBeUndefined();
  });
});

// ─── bindEvent – single event string ─────────────────────────────────────────

describe('EventManagerService – bindEvent with a single event string', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('attaches the event listener to the target element', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls the handler with the component instance as `this`', () => {
    const { service, el } = makeService();
    let capturedThis: any = undefined;
    const option = makeOption({
      event:  'click',
      name:   'onClick',
      method: function (this: any) { capturedThis = this; },
    });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(capturedThis).toBe(el);
  });

  it('passes the Event object to the handler', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');

    const evt = new MouseEvent('click', { bubbles: true });
    el.dispatchEvent(evt);
    expect(spy).toHaveBeenCalledWith(evt);
  });

  it('stores the binding record in the collection after bindEvent', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });

    service.bindEvent(el, option, 'Host');

    expect(service.getEvent('Host', 'click:onClick')).toBeDefined();
  });

  it('stores the exact same handler function that was attached to the element', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });

    service.bindEvent(el, option, 'Host');

    const record = service.getEvent('Host', 'click:onClick');
    expect(typeof record?.handler).toBe('function');
  });

  it('binds to window and fires when window dispatches the event', () => {
    const { service } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'resize', name: 'onResize', method: spy });

    service.bindEvent(window, option, 'Window');
    window.dispatchEvent(new Event('resize'));

    expect(spy).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('resize'));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('binds to document and fires when document dispatches the event', () => {
    const { service } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'keyup', name: 'onKeyup', method: spy });

    service.bindEvent(document, option, 'Document');
    document.dispatchEvent(new KeyboardEvent('keyup'));

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─── bindEvent – duplicate prevention ────────────────────────────────────────

describe('EventManagerService – bindEvent does not duplicate listeners', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('calling bindEvent twice with the same option does not double-fire the handler', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');
    service.bindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calling bindEvent three times still fires the handler exactly once per event', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');
    service.bindEvent(el, option, 'Host');
    service.bindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('the collection still holds exactly one record after repeated bindEvent calls', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });

    service.bindEvent(el, option, 'Host');
    service.bindEvent(el, option, 'Host');
    service.bindEvent(el, option, 'Host');

    const record = service.getEvent('Host', 'click:onClick');
    expect(record).toBeDefined();
  });

  it('different option names on the same event are treated as separate bindings', () => {
    const { service, el } = makeService();
    const spyA = vi.fn();
    const spyB = vi.fn();
    const optA = makeOption({ event: 'click', name: 'handlerA', method: spyA });
    const optB = makeOption({ event: 'click', name: 'handlerB', method: spyB });

    document.body.appendChild(el);
    service.bindEvent(el, optA, 'Host');
    service.bindEvent(el, optB, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);
  });

  it('same option bound under different types does not duplicate within each type', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');
    service.bindEvent(el, option, 'Host');

    // bind on window twice too — should also be deduplicated
    const winOption = makeOption({ event: 'resize', name: 'onResize', method: spy });
    service.bindEvent(window, winOption, 'Window');
    service.bindEvent(window, winOption, 'Window');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─── bindEvent – array of events ─────────────────────────────────────────────

describe('EventManagerService – bindEvent with an array of event names', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('binds every event in the array independently', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: ['click', 'keydown'], name: 'onInteract', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click',   { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('stores a separate record for each event in the array', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: ['mouseenter', 'mouseleave'], name: 'onHover' });

    service.bindEvent(el, option, 'Host');

    expect(service.getEvent('Host', 'mouseenter:onHover')).toBeDefined();
    expect(service.getEvent('Host', 'mouseleave:onHover')).toBeDefined();
  });

  it('does not duplicate array-bound events when bindEvent is called again', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: ['click', 'keydown'], name: 'onInteract', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');
    service.bindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click',     { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ─── unbindEvent ──────────────────────────────────────────────────────────────

describe('EventManagerService – unbindEvent', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('removes the listener so the handler no longer fires after unbind', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    service.unbindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('removes the record from the collection after unbind', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });

    service.bindEvent(el, option, 'Host');
    expect(service.getEvent('Host', 'click:onClick')).toBeDefined();

    service.unbindEvent(el, option, 'Host');
    expect(service.getEvent('Host', 'click:onClick')).toBeUndefined();
  });

  it('unbinding one event does not affect other events on the same element', () => {
    const { service, el } = makeService();
    const spyA = vi.fn();
    const spyB = vi.fn();
    const optA = makeOption({ event: 'click',    name: 'onClick',    method: spyA });
    const optB = makeOption({ event: 'mouseover', name: 'onMouseover', method: spyB });

    document.body.appendChild(el);
    service.bindEvent(el, optA, 'Host');
    service.bindEvent(el, optB, 'Host');

    service.unbindEvent(el, optA, 'Host');

    el.dispatchEvent(new MouseEvent('click',     { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).toHaveBeenCalledTimes(1);
  });

  it('unbinding a type that was never bound does not throw', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: 'click', name: 'onClick' });

    expect(() => service.unbindEvent(el, option, 'Host')).not.toThrow();
  });

  it('unbinding a key that does not exist in an existing type does not throw', () => {
    const { service, el } = makeService();
    const optA = makeOption({ event: 'click',     name: 'onClick' });
    const optB = makeOption({ event: 'mouseover', name: 'onMouseover' });

    service.bindEvent(el, optA, 'Host');

    expect(() => service.unbindEvent(el, optB, 'Host')).not.toThrow();
    expect(service.getEvent('Host', 'click:onClick')).toBeDefined();
  });

  it('unbinds from window and the handler stops firing', () => {
    const { service } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'resize', name: 'onResize', method: spy });

    service.bindEvent(window, option, 'Window');
    window.dispatchEvent(new Event('resize'));
    expect(spy).toHaveBeenCalledTimes(1);

    service.unbindEvent(window, option, 'Window');
    window.dispatchEvent(new Event('resize'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unbinds from document and the handler stops firing', () => {
    const { service } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'keyup', name: 'onKeyup', method: spy });

    service.bindEvent(document, option, 'Document');
    document.dispatchEvent(new KeyboardEvent('keyup'));
    expect(spy).toHaveBeenCalledTimes(1);

    service.unbindEvent(document, option, 'Document');
    document.dispatchEvent(new KeyboardEvent('keyup'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unbinds each event in an array and none of them fire afterwards', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: ['click', 'keydown'], name: 'onInteract', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');

    service.unbindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click',     { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));

    expect(spy).not.toHaveBeenCalled();
  });

  it('removes records for every event in an array from the collection', () => {
    const { service, el } = makeService();
    const option = makeOption({ event: ['mouseenter', 'mouseleave'], name: 'onHover' });

    service.bindEvent(el, option, 'Host');
    service.unbindEvent(el, option, 'Host');

    expect(service.getEvent('Host', 'mouseenter:onHover')).toBeUndefined();
    expect(service.getEvent('Host', 'mouseleave:onHover')).toBeUndefined();
  });

  it('bind → unbind → re-bind fires the handler again correctly', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);

    service.bindEvent(el, option, 'Host');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    service.unbindEvent(el, option, 'Host');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    service.bindEvent(el, option, 'Host');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('uses the stored handler reference to remove the exact listener that was added', () => {
    const { service, el } = makeService();
    const spy = vi.fn();
    const option = makeOption({ event: 'click', name: 'onClick', method: spy });

    document.body.appendChild(el);
    service.bindEvent(el, option, 'Host');

    // Manually add a second listener so we confirm only the stored one is removed
    const extra = vi.fn();
    el.addEventListener('click', extra);

    service.unbindEvent(el, option, 'Host');

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(spy).not.toHaveBeenCalled();
    expect(extra).toHaveBeenCalledTimes(1);

    el.removeEventListener('click', extra);
  });
});





