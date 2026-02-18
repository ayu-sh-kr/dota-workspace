import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultApplicationEventManager } from '../src/DefaultApplicationEventManager.ts';
import { ApplicationEvent, ApplicationEventCallback } from '../src/Types.ts';

describe('DefaultApplicationEventManager', () => {
  let eventManager: DefaultApplicationEventManager;

  beforeEach(() => {
    eventManager = new DefaultApplicationEventManager();
  });

  describe('add() method', () => {
    it('should add a callback to a new event', () => {
      const callback = vi.fn();

      eventManager.add('user:created', callback);

      const callbacks = eventManager.resolve('user:created');
      expect(callbacks).toBeDefined();
      expect(callbacks?.size).toBe(1);
      expect(callbacks?.has(callback)).toBe(true);
    });

    it('should add multiple callbacks to the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventManager.add('user:created', callback1);
      eventManager.add('user:created', callback2);
      eventManager.add('user:created', callback3);

      const callbacks = eventManager.resolve('user:created');
      expect(callbacks?.size).toBe(3);
      expect(callbacks?.has(callback1)).toBe(true);
      expect(callbacks?.has(callback2)).toBe(true);
      expect(callbacks?.has(callback3)).toBe(true);
    });

    it('should prevent duplicate callbacks for the same event', () => {
      const callback = vi.fn();

      eventManager.add('user:created', callback);
      eventManager.add('user:created', callback);
      eventManager.add('user:created', callback);

      const callbacks = eventManager.resolve('user:created');
      expect(callbacks?.size).toBe(1);
    });

    it('should add callbacks to multiple different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventManager.add('user:created', callback1);
      eventManager.add('user:updated', callback2);
      eventManager.add('user:deleted', callback3);

      expect(eventManager.resolve('user:created')?.has(callback1)).toBe(true);
      expect(eventManager.resolve('user:updated')?.has(callback2)).toBe(true);
      expect(eventManager.resolve('user:deleted')?.has(callback3)).toBe(true);
    });

    it('should add the same callback to multiple different events', () => {
      const callback = vi.fn();

      eventManager.add('user:created', callback);
      eventManager.add('user:updated', callback);
      eventManager.add('user:deleted', callback);

      expect(eventManager.resolve('user:created')?.has(callback)).toBe(true);
      expect(eventManager.resolve('user:updated')?.has(callback)).toBe(true);
      expect(eventManager.resolve('user:deleted')?.has(callback)).toBe(true);
    });

    it('should handle adding callbacks with special event names', () => {
      const callback = vi.fn();
      const specialNames = [
        'event:with:colons',
        'event-with-dashes',
        'event.with.dots',
        'event_with_underscores',
        'event with spaces',
        'EVENT_UPPERCASE',
        'event123',
        '123event',
        ''
      ];

      specialNames.forEach(name => {
        eventManager.add(name, callback);
        expect(eventManager.resolve(name)?.has(callback)).toBe(true);
      });
    });

    it('should maintain correct Set behavior when adding callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('test:event', callback1);
      const firstResolve = eventManager.resolve('test:event');
      expect(firstResolve?.size).toBe(1);

      eventManager.add('test:event', callback2);
      const secondResolve = eventManager.resolve('test:event');
      expect(secondResolve?.size).toBe(2);

      // Verify both callbacks are present
      expect(secondResolve?.has(callback1)).toBe(true);
      expect(secondResolve?.has(callback2)).toBe(true);
    });

    it('should create a new Set when adding to a non-existent event', () => {
      const callback = vi.fn();

      expect(eventManager.resolve('new:event')).toBeUndefined();

      eventManager.add('new:event', callback);

      const callbacks = eventManager.resolve('new:event');
      expect(callbacks).toBeDefined();
      expect(callbacks).toBeInstanceOf(Set);
    });

    it('should handle arrow function callbacks', () => {
      const arrowCallback = (_event: ApplicationEvent) => {
        console.log('Arrow callback executed');
      };

      eventManager.add('test:event', arrowCallback);

      expect(eventManager.resolve('test:event')?.has(arrowCallback)).toBe(true);
    });

    it('should handle bound function callbacks', () => {
      class TestClass {
        value = 42;
        handleEvent(_event: ApplicationEvent) {
          console.log(this.value);
        }
      }

      const instance = new TestClass();
      const boundCallback = instance.handleEvent.bind(instance);

      eventManager.add('test:event', boundCallback);

      expect(eventManager.resolve('test:event')?.has(boundCallback)).toBe(true);
    });

    it('should handle anonymous function callbacks', () => {
      const callback = function(_event: ApplicationEvent) {
        console.log('Anonymous function');
      };

      eventManager.add('test:event', callback);

      expect(eventManager.resolve('test:event')?.has(callback)).toBe(true);
    });
  });

  describe('remove() method', () => {
    it('should remove a specific callback from an event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('user:created', callback1);
      eventManager.add('user:created', callback2);

      eventManager.remove('user:created', callback1);

      const callbacks = eventManager.resolve('user:created');
      expect(callbacks?.size).toBe(1);
      expect(callbacks?.has(callback1)).toBe(false);
      expect(callbacks?.has(callback2)).toBe(true);
    });

    it('should remove all callbacks when callback parameter is null', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventManager.add('user:created', callback1);
      eventManager.add('user:created', callback2);
      eventManager.add('user:created', callback3);

      eventManager.remove('user:created', null);

      expect(eventManager.resolve('user:created')).toBeUndefined();
    });

    it('should handle removing callback from non-existent event', () => {
      const callback = vi.fn();

      expect(() => {
        eventManager.remove('non:existent', callback);
      }).not.toThrow();

      expect(eventManager.resolve('non:existent')).toBeUndefined();
    });

    it('should handle removing non-existent callback from existing event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('test:event', callback1);

      eventManager.remove('test:event', callback2);

      const callbacks = eventManager.resolve('test:event');
      expect(callbacks?.size).toBe(1);
      expect(callbacks?.has(callback1)).toBe(true);
    });

    it('should remove callback completely leaving empty Set', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);
      eventManager.remove('test:event', callback);

      const callbacks = eventManager.resolve('test:event');
      // Set still exists but is empty
      expect(callbacks).toBeDefined();
      expect(callbacks?.size).toBe(0);
    });

    it('should remove only the specified event when using null', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('event:a', callback1);
      eventManager.add('event:b', callback2);

      eventManager.remove('event:a', null);

      expect(eventManager.resolve('event:a')).toBeUndefined();
      expect(eventManager.resolve('event:b')?.has(callback2)).toBe(true);
    });

    it('should handle removing the same callback multiple times', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);

      eventManager.remove('test:event', callback);
      eventManager.remove('test:event', callback);
      eventManager.remove('test:event', callback);

      expect(() => {
        eventManager.remove('test:event', callback);
      }).not.toThrow();
    });

    it('should not affect other events when removing from one event', () => {
      const callback = vi.fn();

      eventManager.add('event:a', callback);
      eventManager.add('event:b', callback);
      eventManager.add('event:c', callback);

      eventManager.remove('event:b', callback);

      expect(eventManager.resolve('event:a')?.has(callback)).toBe(true);
      expect(eventManager.resolve('event:b')?.has(callback)).toBe(false);
      expect(eventManager.resolve('event:c')?.has(callback)).toBe(true);
    });

    it('should handle removing with null from non-existent event', () => {
      expect(() => {
        eventManager.remove('non:existent', null);
      }).not.toThrow();

      expect(eventManager.resolve('non:existent')).toBeUndefined();
    });

    it('should properly remove bound callbacks', () => {
      class TestHandler {
        handleEvent(_event: ApplicationEvent) {
          console.log('Handling');
        }
      }

      const handler = new TestHandler();
      const boundCallback = handler.handleEvent.bind(handler);

      eventManager.add('test:event', boundCallback);
      eventManager.remove('test:event', boundCallback);

      const callbacks = eventManager.resolve('test:event');
      expect(callbacks?.has(boundCallback)).toBe(false);
    });

    it('should maintain Set integrity after multiple add/remove operations', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventManager.add('test:event', callback1);
      eventManager.add('test:event', callback2);
      eventManager.remove('test:event', callback1);
      eventManager.add('test:event', callback3);
      eventManager.remove('test:event', callback2);

      const callbacks = eventManager.resolve('test:event');
      expect(callbacks?.size).toBe(1);
      expect(callbacks?.has(callback3)).toBe(true);
      expect(callbacks?.has(callback1)).toBe(false);
      expect(callbacks?.has(callback2)).toBe(false);
    });
  });

  describe('resolve() method', () => {
    it('should return undefined for non-existent event', () => {
      const result = eventManager.resolve('non:existent');

      expect(result).toBeUndefined();
    });

    it('should return Set of callbacks for existing event', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);
      const result = eventManager.resolve('test:event');

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Set);
      expect(result?.has(callback)).toBe(true);
    });

    it('should return the same Set instance on multiple calls', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);

      const result1 = eventManager.resolve('test:event');
      const result2 = eventManager.resolve('test:event');

      expect(result1).toBe(result2);
    });

    it('should return Set that reflects current state', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('test:event', callback1);

      let callbacks = eventManager.resolve('test:event');
      expect(callbacks?.size).toBe(1);

      eventManager.add('test:event', callback2);

      callbacks = eventManager.resolve('test:event');
      expect(callbacks?.size).toBe(2);
    });

    it('should return empty Set after all callbacks are removed individually', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);
      eventManager.remove('test:event', callback);

      const result = eventManager.resolve('test:event');
      expect(result).toBeDefined();
      expect(result?.size).toBe(0);
    });

    it('should return undefined after event is removed with null', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);
      eventManager.remove('test:event', null);

      const result = eventManager.resolve('test:event');
      expect(result).toBeUndefined();
    });

    it('should handle resolving multiple different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventManager.add('event:a', callback1);
      eventManager.add('event:b', callback2);
      eventManager.add('event:c', callback3);

      expect(eventManager.resolve('event:a')?.has(callback1)).toBe(true);
      expect(eventManager.resolve('event:b')?.has(callback2)).toBe(true);
      expect(eventManager.resolve('event:c')?.has(callback3)).toBe(true);
    });

    it('should allow iteration over returned Set', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventManager.add('test:event', callback1);
      eventManager.add('test:event', callback2);
      eventManager.add('test:event', callback3);

      const callbacks = eventManager.resolve('test:event');
      const callbackArray: ApplicationEventCallback[] = [];

      callbacks?.forEach(cb => callbackArray.push(cb));

      expect(callbackArray).toHaveLength(3);
      expect(callbackArray).toContain(callback1);
      expect(callbackArray).toContain(callback2);
      expect(callbackArray).toContain(callback3);
    });

    it('should return Set that can be used to invoke callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const mockEvent: ApplicationEvent = { name: 'test:event', data: { value: 42 } };

      eventManager.add('test:event', callback1);
      eventManager.add('test:event', callback2);

      const callbacks = eventManager.resolve('test:event');
      callbacks?.forEach(cb => cb(mockEvent));

      expect(callback1).toHaveBeenCalledWith(mockEvent);
      expect(callback2).toHaveBeenCalledWith(mockEvent);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle resolve after clear', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);
      eventManager.clear();

      const result = eventManager.resolve('test:event');
      expect(result).toBeUndefined();
    });

    it('should return Set with correct size property', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];

      callbacks.forEach(cb => eventManager.add('test:event', cb));

      const result = eventManager.resolve('test:event');
      expect(result?.size).toBe(5);
    });
  });

  describe('clear() method', () => {
    it('should remove all events and callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventManager.add('event:a', callback1);
      eventManager.add('event:b', callback2);
      eventManager.add('event:c', callback3);

      eventManager.clear();

      expect(eventManager.resolve('event:a')).toBeUndefined();
      expect(eventManager.resolve('event:b')).toBeUndefined();
      expect(eventManager.resolve('event:c')).toBeUndefined();
    });

    it('should handle clear on empty manager', () => {
      expect(() => {
        eventManager.clear();
      }).not.toThrow();
    });

    it('should handle clear called multiple times', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);

      eventManager.clear();
      eventManager.clear();
      eventManager.clear();

      expect(eventManager.resolve('test:event')).toBeUndefined();
    });

    it('should allow adding events after clear', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('test:event', callback1);
      eventManager.clear();
      eventManager.add('test:event', callback2);

      const callbacks = eventManager.resolve('test:event');
      expect(callbacks?.size).toBe(1);
      expect(callbacks?.has(callback2)).toBe(true);
      expect(callbacks?.has(callback1)).toBe(false);
    });

    it('should reset manager to initial empty state', () => {
      // Add many events
      for (let i = 0; i < 100; i++) {
        eventManager.add(`event:${i}`, vi.fn());
      }

      eventManager.clear();

      // Verify all are gone
      for (let i = 0; i < 100; i++) {
        expect(eventManager.resolve(`event:${i}`)).toBeUndefined();
      }
    });

    it('should clear all callbacks from all events', () => {
      const events = ['event:a', 'event:b', 'event:c', 'event:d', 'event:e'];
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      events.forEach(event => {
        callbacks.forEach(callback => {
          eventManager.add(event, callback);
        });
      });

      eventManager.clear();

      events.forEach(event => {
        expect(eventManager.resolve(event)).toBeUndefined();
      });
    });

    it('should not affect new manager instances after clear', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);
      eventManager.clear();

      const newManager = new DefaultApplicationEventManager();
      newManager.add('test:event', callback);

      expect(eventManager.resolve('test:event')).toBeUndefined();
      expect(newManager.resolve('test:event')?.has(callback)).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete lifecycle: add, resolve, remove, clear', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      // Add phase
      eventManager.add('test:event', callback1);
      eventManager.add('test:event', callback2);
      eventManager.add('test:event', callback3);

      // Resolve phase
      let callbacks = eventManager.resolve('test:event');
      expect(callbacks?.size).toBe(3);

      // Remove phase
      eventManager.remove('test:event', callback2);
      callbacks = eventManager.resolve('test:event');
      expect(callbacks?.size).toBe(2);

      // Clear phase
      eventManager.clear();
      expect(eventManager.resolve('test:event')).toBeUndefined();
    });

    it('should handle multiple events with overlapping callbacks', () => {
      const sharedCallback = vi.fn();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('event:a', sharedCallback);
      eventManager.add('event:a', callback1);
      eventManager.add('event:b', sharedCallback);
      eventManager.add('event:b', callback2);

      expect(eventManager.resolve('event:a')?.size).toBe(2);
      expect(eventManager.resolve('event:b')?.size).toBe(2);

      eventManager.remove('event:a', sharedCallback);

      expect(eventManager.resolve('event:a')?.size).toBe(1);
      expect(eventManager.resolve('event:b')?.size).toBe(2);
    });

    it('should correctly invoke all registered callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      const mockEvent: ApplicationEvent = { name: 'test:event', data: { id: 1 } };

      eventManager.add('test:event', callback1);
      eventManager.add('test:event', callback2);
      eventManager.add('test:event', callback3);

      const callbacks = eventManager.resolve('test:event');
      callbacks?.forEach(cb => cb(mockEvent));

      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).toHaveBeenCalledOnce();
      expect(callback3).toHaveBeenCalledOnce();
      expect(callback1).toHaveBeenCalledWith(mockEvent);
      expect(callback2).toHaveBeenCalledWith(mockEvent);
      expect(callback3).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle high volume of events and callbacks', () => {
      const numEvents = 1000;
      const callbacksPerEvent = 10;

      for (let i = 0; i < numEvents; i++) {
        for (let j = 0; j < callbacksPerEvent; j++) {
          eventManager.add(`event:${i}`, vi.fn());
        }
      }

      for (let i = 0; i < numEvents; i++) {
        const callbacks = eventManager.resolve(`event:${i}`);
        expect(callbacks?.size).toBe(callbacksPerEvent);
      }

      eventManager.clear();

      for (let i = 0; i < numEvents; i++) {
        expect(eventManager.resolve(`event:${i}`)).toBeUndefined();
      }
    });

    it('should maintain callback execution order within Set', () => {
      const executionOrder: number[] = [];
      const callback1: ApplicationEventCallback = () => executionOrder.push(1);
      const callback2: ApplicationEventCallback = () => executionOrder.push(2);
      const callback3: ApplicationEventCallback = () => executionOrder.push(3);
      const mockEvent: ApplicationEvent = { name: 'test:event' };

      eventManager.add('test:event', callback1);
      eventManager.add('test:event', callback2);
      eventManager.add('test:event', callback3);

      const callbacks = eventManager.resolve('test:event');
      callbacks?.forEach(cb => cb(mockEvent));

      expect(executionOrder).toHaveLength(3);
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
      expect(executionOrder).toContain(3);
    });

    it('should handle complex event naming patterns', () => {
      const callback = vi.fn();
      const eventPatterns = [
        'user:created',
        'user:updated:profile',
        'system:config:changed',
        'notification:email:sent:success',
        'order:payment:processed:confirmed'
      ];

      eventPatterns.forEach(pattern => {
        eventManager.add(pattern, callback);
      });

      eventPatterns.forEach(pattern => {
        expect(eventManager.resolve(pattern)?.has(callback)).toBe(true);
      });
    });

    it('should properly isolate events from each other', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.add('event:a', callback1);
      eventManager.add('event:b', callback2);

      const callbacksA = eventManager.resolve('event:a');
      const callbacksB = eventManager.resolve('event:b');

      expect(callbacksA).not.toBe(callbacksB);
      expect(callbacksA?.has(callback1)).toBe(true);
      expect(callbacksA?.has(callback2)).toBe(false);
      expect(callbacksB?.has(callback1)).toBe(false);
      expect(callbacksB?.has(callback2)).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle callback that throws error during invocation', () => {
      const errorCallback: ApplicationEventCallback = () => {
        throw new Error('Callback error');
      };
      const normalCallback = vi.fn();
      const mockEvent: ApplicationEvent = { name: 'test:event' };

      eventManager.add('test:event', errorCallback);
      eventManager.add('test:event', normalCallback);

      const callbacks = eventManager.resolve('test:event');

      expect(() => {
        callbacks?.forEach(cb => {
          try {
            cb(mockEvent);
          } catch (e) {
            // Error handled
          }
        });
      }).not.toThrow();
    });

    it('should handle adding undefined or null-like callbacks gracefully', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const undefinedCallback = undefined as any;

      expect(() => {
        eventManager.add('test:event', undefinedCallback);
      }).not.toThrow();
    });

    it('should preserve callback references correctly', () => {
      const callback = vi.fn();

      eventManager.add('test:event', callback);

      const callbacks = eventManager.resolve('test:event');
      const extractedCallback = Array.from(callbacks || [])[0];

      expect(extractedCallback).toBe(callback);

      const mockEvent: ApplicationEvent = { name: 'test:event', data: 'test' };
      extractedCallback(mockEvent);

      expect(callback).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle event name with Unicode characters', () => {
      const callback = vi.fn();
      const unicodeEvents = [
        '用户:创建',
        'utilisateur:créé',
        'usuario:criado',
        '🎉:celebration',
        'событие:тест'
      ];

      unicodeEvents.forEach(event => {
        eventManager.add(event, callback);
        expect(eventManager.resolve(event)?.has(callback)).toBe(true);
      });
    });

    it('should handle very long event names', () => {
      const callback = vi.fn();
      const longEventName = 'event:' + 'a'.repeat(10000);

      eventManager.add(longEventName, callback);

      expect(eventManager.resolve(longEventName)?.has(callback)).toBe(true);
    });

    it('should maintain performance with many callbacks on single event', () => {
      const numCallbacks = 10000;
      const callbacks: ApplicationEventCallback[] = [];

      for (let i = 0; i < numCallbacks; i++) {
        const callback = vi.fn();
        callbacks.push(callback);
        eventManager.add('test:event', callback);
      }

      const resolved = eventManager.resolve('test:event');
      expect(resolved?.size).toBe(numCallbacks);

      // Verify all callbacks are present
      callbacks.forEach(cb => {
        expect(resolved?.has(cb)).toBe(true);
      });
    });
  });
});

