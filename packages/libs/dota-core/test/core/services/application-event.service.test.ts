import 'reflect-metadata';
import { ApplicationEventService } from '@dota/core/services/application-event.service.ts';
import {
  DefaultApplicationEventBus,
  EventChannel,
} from '@ayu-sh-kr/dota-event';


/**
 * Resets both the ApplicationEventService singleton and the underlying
 * DefaultApplicationEventBus singleton so every test starts with a completely
 * clean event system — no lingering subscriptions from previous tests.
 */
function resetSingleton(): void {
  (ApplicationEventService as any)._instance = undefined;
  (DefaultApplicationEventBus as any).instance = undefined;
}

describe('ApplicationEventService – singleton pattern', () => {

  beforeEach(() => resetSingleton());

  it('getInstance returns an ApplicationEventService instance', () => {
    const svc = ApplicationEventService.getInstance();
    expect(svc).toBeInstanceOf(ApplicationEventService);
  });

  it('getInstance always returns the same reference', () => {
    const first  = ApplicationEventService.getInstance();
    const second = ApplicationEventService.getInstance();
    expect(first).toBe(second);
  });

  it('returns the same instance across many successive calls', () => {
    const refs = Array.from({ length: 10 }, () => ApplicationEventService.getInstance());
    refs.forEach(ref => expect(ref).toBe(refs[0]));
  });

  it('creates a new instance after the singleton is reset', () => {
    const first = ApplicationEventService.getInstance();
    resetSingleton();
    const second = ApplicationEventService.getInstance();
    expect(first).not.toBe(second);
  });
});

describe('ApplicationEventService – getListener', () => {

  beforeEach(() => resetSingleton());

  it('returns an ApplicationEventListener', () => {
    const svc = ApplicationEventService.getInstance();
    const listener = svc.getListener();
    expect(listener).toBeDefined();
    expect(typeof listener.on).toBe('function');
    expect(typeof listener.off).toBe('function');
  });

  it('returns the same listener reference on every call', () => {
    const svc = ApplicationEventService.getInstance();
    expect(svc.getListener()).toBe(svc.getListener());
  });

  it('the listener returned from two getInstance calls is the same object', () => {
    const a = ApplicationEventService.getInstance();
    const b = ApplicationEventService.getInstance();
    expect(a.getListener()).toBe(b.getListener());
  });

  it('listener can subscribe to an event without throwing', () => {
    const listener = ApplicationEventService.getInstance().getListener();
    expect(() => listener.on('test-event', () => {})).not.toThrow();
  });

  it('listener can unsubscribe from an event without throwing', () => {
    const listener = ApplicationEventService.getInstance().getListener();
    const cb = () => {};
    listener.on('test-event', cb);
    expect(() => listener.off('test-event', cb)).not.toThrow();
  });
});

describe('ApplicationEventService – getPublisher', () => {

  beforeEach(() => resetSingleton());

  it('returns an ApplicationEventPublisher', () => {
    const svc = ApplicationEventService.getInstance();
    const publisher = svc.getPublisher();
    expect(publisher).toBeDefined();
    expect(typeof publisher.publish).toBe('function');
    expect(typeof publisher.publishAsync).toBe('function');
  });

  it('returns the same publisher reference on every call', () => {
    const svc = ApplicationEventService.getInstance();
    expect(svc.getPublisher()).toBe(svc.getPublisher());
  });

  it('the publisher returned from two getInstance calls is the same object', () => {
    const a = ApplicationEventService.getInstance();
    const b = ApplicationEventService.getInstance();
    expect(a.getPublisher()).toBe(b.getPublisher());
  });

  it('publisher.publish does not throw when no listeners are registered', () => {
    const publisher = ApplicationEventService.getInstance().getPublisher();
    expect(() => publisher.publish({ name: 'orphan-event' })).not.toThrow();
  });

  it('publisher.publishAsync resolves without throwing when no listeners are registered', async () => {
    const publisher = ApplicationEventService.getInstance().getPublisher();
    await expect(publisher.publishAsync({ name: 'orphan-async' })).resolves.not.toThrow();
  });
});

describe('ApplicationEventService – getEventBus', () => {

  beforeEach(() => resetSingleton());

  it('returns a defined ApplicationEventBus', () => {
    const svc = ApplicationEventService.getInstance();
    const bus = svc.getEventBus();
    expect(bus).toBeDefined();
    expect(bus).not.toBeNull();
  });

  it('returns an object that has on, off and emit methods', () => {
    const bus = ApplicationEventService.getInstance().getEventBus();
    expect(typeof bus.on).toBe('function');
    expect(typeof bus.off).toBe('function');
    expect(typeof bus.emit).toBe('function');
  });

  it('returns the same bus reference on every call', () => {
    const svc = ApplicationEventService.getInstance();
    expect(svc.getEventBus()).toBe(svc.getEventBus());
  });

  it('returns the same bus reference across two getInstance calls', () => {
    const a = ApplicationEventService.getInstance();
    const b = ApplicationEventService.getInstance();
    expect(a.getEventBus()).toBe(b.getEventBus());
  });

  it('the bus returned is the DefaultApplicationEventBus singleton', () => {
    const svc = ApplicationEventService.getInstance();
    const bus = svc.getEventBus();
    expect(bus).toBe(DefaultApplicationEventBus.getInstance());
  });

  it('a callback registered directly on the bus fires when the bus emits the event', async () => {
    const svc = ApplicationEventService.getInstance();
    const bus = svc.getEventBus();
    const spy = vi.fn();

    bus.on('bus:ping', spy);
    bus.emit({name: 'bus:ping', data: 'hello'});

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ name: 'bus:ping', data: 'hello' });
  });

  it('a callback removed directly from the bus no longer fires', async () => {
    const svc = ApplicationEventService.getInstance();
    const bus = svc.getEventBus();
    const spy = vi.fn();

    bus.on('bus:pong', spy);
    bus.emit({name: 'bus:pong'});
    expect(spy).toHaveBeenCalledTimes(1);

    bus.off('bus:pong', spy);
    bus.emit({name: 'bus:pong'});
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('ApplicationEventService – bus, listener and publisher share one DefaultApplicationEventBus', () => {

  beforeEach(() => resetSingleton());
  afterEach(() => vi.clearAllMocks());

  it('the event bus is the exact DefaultApplicationEventBus singleton', () => {
    const svc = ApplicationEventService.getInstance();
    expect(svc.getEventBus()).toBe(DefaultApplicationEventBus.getInstance());
  });

  it('a listener subscription is visible from the bus — bus.emit fires the listener callback', async () => {
    const svc = ApplicationEventService.getInstance();
    const spy = vi.fn();

    svc.getListener().on('shared:event', spy);
    svc.getEventBus().emit({name: 'shared:event', data: 42});

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ name: 'shared:event', data: 42 });
  });

  it('a publisher.publish reaches a listener subscribed directly on the bus', async () => {
    const svc = ApplicationEventService.getInstance();
    const spy = vi.fn();

    svc.getEventBus().on('bus:direct', spy);
    svc.getPublisher().publish({ name: 'bus:direct' });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('bus, listener and publisher all use the same underlying event manager — one subscription covers all paths', () => {
    const svc = ApplicationEventService.getInstance();
    const spy = vi.fn();

    svc.getListener().on('unified:event', spy);

    // publish via publisher — should reach the listener subscription
    svc.getPublisher().publish({ name: 'unified:event' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('after singleton reset the new service creates a fresh bus that has no old subscriptions', () => {
    const first = ApplicationEventService.getInstance();
    const spy   = vi.fn();
    first.getListener().on('stale:event', spy);

    resetSingleton();

    const second = ApplicationEventService.getInstance();
    second.getPublisher().publish({ name: 'stale:event' });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('ApplicationEventService – listener and publisher share the same event bus', () => {

  beforeEach(() => resetSingleton());
  afterEach(() => vi.clearAllMocks());

  it('a callback registered on the listener fires when the publisher publishes the event', () => {
    const svc      = ApplicationEventService.getInstance();
    const listener = svc.getListener();
    const publisher = svc.getPublisher();

    const spy = vi.fn();
    listener.on('user:login', spy);
    publisher.publish({ name: 'user:login', data: { userId: 42 } });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ name: 'user:login', data: { userId: 42 } });
  });

  it('a callback registered via publishAsync fires when awaited', async () => {
    const svc      = ApplicationEventService.getInstance();
    const listener = svc.getListener();
    const publisher = svc.getPublisher();

    const spy = vi.fn();
    listener.on('user:logout', spy);
    await publisher.publishAsync({ name: 'user:logout', data: { userId: 1 } });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ name: 'user:logout', data: { userId: 1 } });
  });

  it('multiple subscribers all receive the same published event', () => {
    const svc       = ApplicationEventService.getInstance();
    const listener  = svc.getListener();
    const publisher = svc.getPublisher();

    const spyA = vi.fn();
    const spyB = vi.fn();
    const spyC = vi.fn();

    listener.on('page:load', spyA);
    listener.on('page:load', spyB);
    listener.on('page:load', spyC);

    publisher.publish({ name: 'page:load' });

    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);
    expect(spyC).toHaveBeenCalledTimes(1);
  });

  it('unsubscribed callback does not fire after listener.off is called', () => {
    const svc       = ApplicationEventService.getInstance();
    const listener  = svc.getListener();
    const publisher = svc.getPublisher();

    const spy = vi.fn();
    listener.on('item:removed', spy);
    publisher.publish({ name: 'item:removed' });
    expect(spy).toHaveBeenCalledTimes(1);

    listener.off('item:removed', spy);
    publisher.publish({ name: 'item:removed' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing one callback leaves other callbacks for the same event intact', () => {
    const svc       = ApplicationEventService.getInstance();
    const listener  = svc.getListener();
    const publisher = svc.getPublisher();

    const spyA = vi.fn();
    const spyB = vi.fn();

    listener.on('data:ready', spyA);
    listener.on('data:ready', spyB);

    listener.off('data:ready', spyA);
    publisher.publish({ name: 'data:ready' });

    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).toHaveBeenCalledTimes(1);
  });

  it('events with different names do not cross-fire', () => {
    const svc       = ApplicationEventService.getInstance();
    const listener  = svc.getListener();
    const publisher = svc.getPublisher();

    const loginSpy  = vi.fn();
    const logoutSpy = vi.fn();

    listener.on('auth:login',  loginSpy);
    listener.on('auth:logout', logoutSpy);

    publisher.publish({ name: 'auth:login' });

    expect(loginSpy).toHaveBeenCalledTimes(1);
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('event payload data is forwarded intact to all subscribers', () => {
    const svc       = ApplicationEventService.getInstance();
    const listener  = svc.getListener();
    const publisher = svc.getPublisher();

    const received: any[] = [];
    listener.on('order:placed', e => received.push(e.data));
    listener.on('order:placed', e => received.push(e.data));

    publisher.publish({ name: 'order:placed', data: { orderId: 'ORD-001', total: 99.9 } });

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ orderId: 'ORD-001', total: 99.9 });
    expect(received[1]).toEqual({ orderId: 'ORD-001', total: 99.9 });
  });

  it('publishing an event with no data does not throw and payload is undefined', () => {
    const svc       = ApplicationEventService.getInstance();
    const listener  = svc.getListener();
    const publisher = svc.getPublisher();

    const spy = vi.fn();
    listener.on('ping', spy);

    expect(() => publisher.publish({ name: 'ping' })).not.toThrow();
    expect(spy).toHaveBeenCalledWith({ name: 'ping' });
    expect(spy.mock.calls[0][0].data).toBeUndefined();
  });
});

describe('ApplicationEventService – createEventChannel', () => {

  beforeEach(() => resetSingleton());
  afterEach(() => vi.clearAllMocks());

  it('returns an EventChannel instance', () => {
    const svc = ApplicationEventService.getInstance();
    const channel = svc.createEventChannel('my-component:1');
    expect(channel).toBeInstanceOf(EventChannel);
  });

  it('each call with the same prefix returns a distinct EventChannel instance', () => {
    const svc = ApplicationEventService.getInstance();
    const a = svc.createEventChannel('comp:1');
    const b = svc.createEventChannel('comp:1');
    expect(a).not.toBe(b);
  });

  it('each call with a different prefix returns a distinct EventChannel instance', () => {
    const svc = ApplicationEventService.getInstance();
    const a = svc.createEventChannel('comp:1');
    const b = svc.createEventChannel('comp:2');
    expect(a).not.toBe(b);
  });

  it('channel.on subscribes to a namespaced event on the shared listener', () => {
    const svc     = ApplicationEventService.getInstance();
    const channel = svc.createEventChannel('my-comp:42');
    const spy     = vi.fn();

    channel.on('connected', spy);
    svc.getPublisher().publish({ name: 'my-comp:42:connected' });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('channel.emit publishes a namespaced event received by a channel subscriber', () => {
    const svc     = ApplicationEventService.getInstance();
    const channel = svc.createEventChannel('widget:7');
    const spy     = vi.fn();

    channel.on('ready', spy);
    channel.emit({ name: 'ready' });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('channel event does not fire a raw (non-namespaced) subscriber for the same base name', () => {
    const svc     = ApplicationEventService.getInstance();
    const channel = svc.createEventChannel('ns:1');
    const rawSpy  = vi.fn();
    const nsSpy   = vi.fn();

    svc.getListener().on('ready', rawSpy);
    channel.on('ready', nsSpy);

    channel.emit({ name: 'ready' });

    expect(nsSpy).toHaveBeenCalledTimes(1);
    expect(rawSpy).not.toHaveBeenCalled();
  });

  it('two channels with different prefixes are isolated from each other', () => {
    const svc      = ApplicationEventService.getInstance();
    const channelA = svc.createEventChannel('comp-a:1');
    const channelB = svc.createEventChannel('comp-b:1');

    const spyA = vi.fn();
    const spyB = vi.fn();

    channelA.on('init', spyA);
    channelB.on('init', spyB);

    channelA.emit({ name: 'init' });

    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).not.toHaveBeenCalled();
  });

  it('two channels with the same prefix share events through the common bus', () => {
    const svc      = ApplicationEventService.getInstance();
    const channelA = svc.createEventChannel('shared:1');
    const channelB = svc.createEventChannel('shared:1');

    const spyA = vi.fn();
    const spyB = vi.fn();

    channelA.on('tick', spyA);
    channelB.on('tick', spyB);

    channelA.emit({ name: 'tick' });

    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);
  });

  it('channel forwards event payload data intact to subscribers', () => {
    const svc     = ApplicationEventService.getInstance();
    const channel = svc.createEventChannel('store:1');
    const spy     = vi.fn();

    channel.on('updated', spy);
    channel.emit({ name: 'updated', data: { key: 'theme', value: 'dark' } });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ data: { key: 'theme', value: 'dark' } })
    );
  });
});


