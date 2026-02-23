import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventChannel } from '@dota/channel/EventChannel.ts';
import { DefaultApplicationEventListener } from '@dota/listener/DefaultApplicationEventListener.ts';
import { DefaultApplicationEventPublisher } from '@dota/publisher/DefaultApplicationEventPublisher.ts';
import { ApplicationEvent } from '../src/Types.ts';
import { DefaultApplicationEventBus } from '@dota/bus/DefaultApplicationEventBus.ts';

describe('EventChannel', () => {
  let listener: DefaultApplicationEventListener;
  let publisher: DefaultApplicationEventPublisher;
  let channel: EventChannel;
  const PREFIX = 'dota-popover';

  beforeEach(() => {
    (DefaultApplicationEventBus as any).instance = null;
    const bus = DefaultApplicationEventBus.getInstance();
    listener = new DefaultApplicationEventListener(bus);
    publisher = new DefaultApplicationEventPublisher(bus);
    channel = new EventChannel(PREFIX, listener, publisher);
  });

  describe('on() method', () => {
    it('should register a callback using the prefixed event name', () => {
      const callback = vi.fn();

      channel.on('opened', callback);

      // Emit the raw prefixed event directly via the listener/publisher to verify it is bound
      publisher.publish({ name: `${PREFIX}:opened` });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass the full event object to the callback', () => {
      const callback = vi.fn();
      const eventData = { id: 42, label: 'test' };

      channel.on('opened', callback);
      publisher.publish({ name: `${PREFIX}:opened`, data: eventData });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${PREFIX}:opened`, data: eventData })
      );
    });

    it('should register multiple callbacks for the same event', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const cb3 = vi.fn();

      channel.on('opened', cb1);
      channel.on('opened', cb2);
      channel.on('opened', cb3);

      publisher.publish({ name: `${PREFIX}:opened` });

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(cb3).toHaveBeenCalledTimes(1);
    });

    it('should register callbacks for different events independently', () => {
      const openedCb = vi.fn();
      const closedCb = vi.fn();

      channel.on('opened', openedCb);
      channel.on('closed', closedCb);

      publisher.publish({ name: `${PREFIX}:opened` });

      expect(openedCb).toHaveBeenCalledTimes(1);
      expect(closedCb).not.toHaveBeenCalled();
    });
  });

  describe('off() method', () => {
    it('should unregister a callback so it no longer receives events', () => {
      const callback = vi.fn();

      channel.on('opened', callback);
      channel.off('opened', callback);

      publisher.publish({ name: `${PREFIX}:opened` });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should silently do nothing when null is passed as callback', () => {
      expect(() => channel.off('opened', null)).not.toThrow();
    });

    it('should only remove the specific callback, leaving others intact', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      channel.on('opened', cb1);
      channel.on('opened', cb2);

      channel.off('opened', cb1);

      publisher.publish({ name: `${PREFIX}:opened` });

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('should silently do nothing when removing a callback that was never registered', () => {
      const neverRegistered = vi.fn();
      expect(() => channel.off('opened', neverRegistered)).not.toThrow();
    });
  });

  describe('emit() method', () => {
    it('should emit an event with the prefixed name', () => {
      const callback = vi.fn();

      listener.on(`${PREFIX}:opened`, callback);
      channel.emit({ name: 'opened' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${PREFIX}:opened` })
      );
    });

    it('should forward event data unchanged', () => {
      const callback = vi.fn();
      const eventData = { userId: 7, action: 'open' };

      listener.on(`${PREFIX}:closed`, callback);
      channel.emit({ name: 'closed', data: eventData });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ data: eventData })
      );
    });

    it('should overwrite the event name with the prefixed version', () => {
      const callback = vi.fn();

      listener.on(`${PREFIX}:opened`, callback);
      channel.emit({ name: 'opened', data: null });

      const received: ApplicationEvent = callback.mock.calls[0][0];
      expect(received.name).toBe(`${PREFIX}:opened`);
    });

    it('should not mutate the original event object', () => {
      const original: ApplicationEvent = { name: 'opened', data: { x: 1 } };

      listener.on(`${PREFIX}:opened`, vi.fn());
      channel.emit(original);

      expect(original.name).toBe('opened');
    });
  });

  describe('namespace isolation', () => {
    it('should not trigger callbacks registered on a different channel prefix', () => {
      const bus = DefaultApplicationEventBus.getInstance();
      const sharedListener = new DefaultApplicationEventListener(bus);
      const sharedPublisher = new DefaultApplicationEventPublisher(bus);

      const channelA = new EventChannel('channel-a', sharedListener, sharedPublisher);
      const channelB = new EventChannel('channel-b', sharedListener, sharedPublisher);

      const cbA = vi.fn();
      const cbB = vi.fn();

      channelA.on('event', cbA);
      channelB.on('event', cbB);

      channelA.emit({ name: 'event' });

      expect(cbA).toHaveBeenCalledTimes(1);
      expect(cbB).not.toHaveBeenCalled();
    });

    it('should not trigger channel callbacks when the same unprefixed event is published without a prefix', () => {
      const callback = vi.fn();

      channel.on('opened', callback);

      // Publish the bare event name — no prefix
      publisher.publish({ name: 'opened' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should isolate events across multiple independent channels on the same bus', () => {
      const bus = DefaultApplicationEventBus.getInstance();
      const sharedListener = new DefaultApplicationEventListener(bus);
      const sharedPublisher = new DefaultApplicationEventPublisher(bus);

      const channels = ['widget-a', 'widget-b', 'widget-c'].map(
        prefix => new EventChannel(prefix, sharedListener, sharedPublisher)
      );

      const callbacks = channels.map(() => vi.fn());
      channels.forEach((ch, i) => ch.on('update', callbacks[i]));

      // Emit only on the second channel
      channels[1].emit({ name: 'update', data: { value: 99 } });

      expect(callbacks[0]).not.toHaveBeenCalled();
      expect(callbacks[1]).toHaveBeenCalledTimes(1);
      expect(callbacks[2]).not.toHaveBeenCalled();
    });

    it('channel on() callback should not fire when a raw prefixed event is published on the wrong prefix', () => {
      const callback = vi.fn();

      channel.on('click', callback);

      // Wrong prefix
      publisher.publish({ name: 'dota-tooltip:click' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('round-trip (on + emit)', () => {
    it('should deliver the event back to its own listener via emit', () => {
      const callback = vi.fn();

      channel.on('submit', callback);
      channel.emit({ name: 'submit', data: { form: 'login' } });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `${PREFIX}:submit`,
          data: { form: 'login' }
        })
      );
    });

    it('should support subscribe → emit → unsubscribe → emit lifecycle', () => {
      const callback = vi.fn();

      channel.on('tick', callback);
      channel.emit({ name: 'tick' });
      channel.off('tick', callback);
      channel.emit({ name: 'tick' });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});


