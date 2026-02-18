import {DefaultApplicationEventBus } from "@dota/DefaultApplicationEventBus";
import { OnEvent } from "@dota/on-event.decorator";
import {type ApplicationEvent, ApplicationEventListener } from "@dota/Types";
import { describe, it, expect, beforeEach } from 'vitest';
import {DefaultApplicationEventListener} from "@dota/DefaultApplicationEventListener.ts";
import {DefaultClassApplicationEventBindManager} from "@dota/DefaultClassApplicationEventBindManager.ts";


describe('DefaultClassApplicationEventBindManager', () => {
  let eventBus: DefaultApplicationEventBus;
  let listener: ApplicationEventListener;

  beforeEach(() => {
    eventBus = DefaultApplicationEventBus.getInstance();
    listener = new DefaultApplicationEventListener(eventBus);
  });

  describe('Duplicate Bind Prevention', () => {
    // Test class with decorated event handlers
    class TestEventHandler {
      public eventCounts: Map<string, number> = new Map();
      public receivedEvents: ApplicationEvent[] = [];

      @OnEvent('user:created')
      handleUserCreated(event: ApplicationEvent): void {
        const current = this.eventCounts.get('user:created') || 0;
        this.eventCounts.set('user:created', current + 1);
        this.receivedEvents.push(event);
      }

      @OnEvent('user:updated')
      handleUserUpdated(event: ApplicationEvent): void {
        const current = this.eventCounts.get('user:updated') || 0;
        this.eventCounts.set('user:updated', current + 1);
        this.receivedEvents.push(event);
      }

      @OnEvent('notification:send')
      handleNotification(event: ApplicationEvent): void {
        const current = this.eventCounts.get('notification:send') || 0;
        this.eventCounts.set('notification:send', current + 1);
        this.receivedEvents.push(event);
      }

      reset(): void {
        this.eventCounts.clear();
        this.receivedEvents = [];
      }
    }

    it('should bind event handlers only once when bind() is called multiple times', async () => {
      const handler = new TestEventHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Call bind multiple times
      bindManager.bind();
      bindManager.bind();
      bindManager.bind();

      // Emit an event
      await eventBus.emit({ name: 'user:created', data: { id: 1, name: 'John' } });

      // Handler should be called only once, not three times
      expect(handler.eventCounts.get('user:created')).toBe(1);
      expect(handler.receivedEvents).toHaveLength(1);
      expect(handler.receivedEvents[0].data).toEqual({ id: 1, name: 'John' });
    });

    it('should handle multiple events correctly even with repeated bind() calls', async () => {
      const handler = new TestEventHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Call bind multiple times
      bindManager.bind();
      bindManager.bind();

      // Emit multiple different events
      await eventBus.emit({ name: 'user:created', data: { id: 1 } });
      await eventBus.emit({ name: 'user:updated', data: { id: 2 } });
      await eventBus.emit({ name: 'notification:send', data: { message: 'Hello' } });

      // Each handler should be called exactly once per event
      expect(handler.eventCounts.get('user:created')).toBe(1);
      expect(handler.eventCounts.get('user:updated')).toBe(1);
      expect(handler.eventCounts.get('notification:send')).toBe(1);
      expect(handler.receivedEvents).toHaveLength(3);
    });

    it('should handle bind-unbind-bind cycles correctly', async () => {
      const handler = new TestEventHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // First bind
      bindManager.bind();
      await eventBus.emit({ name: 'user:created', data: { id: 1 } });
      expect(handler.eventCounts.get('user:created')).toBe(1);

      // Unbind
      bindManager.unbind();
      handler.reset();

      // Emit event - should not be received
      await eventBus.emit({ name: 'user:created', data: { id: 2 } });
      expect(handler.eventCounts.get('user:created')).toBeUndefined();
      expect(handler.receivedEvents).toHaveLength(0);

      // Bind again
      bindManager.bind();
      await eventBus.emit({ name: 'user:created', data: { id: 3 } });
      expect(handler.eventCounts.get('user:created')).toBe(1);
      expect(handler.receivedEvents).toHaveLength(1);
    });

    it('should not register duplicate handlers when bind is called 10 times', async () => {
      const handler = new TestEventHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Call bind many times
      for (let i = 0; i < 10; i++) {
        bindManager.bind();
      }

      // Emit event once
      await eventBus.emit({ name: 'user:created', data: { id: 1 } });

      // Should still be called only once
      expect(handler.eventCounts.get('user:created')).toBe(1);
      expect(handler.receivedEvents).toHaveLength(1);
    });

    it('should maintain separate bind managers for different instances', async () => {
      const handler1 = new TestEventHandler();
      const handler2 = new TestEventHandler();
      const bindManager1 = new DefaultClassApplicationEventBindManager(handler1, listener);
      const bindManager2 = new DefaultClassApplicationEventBindManager(handler2, listener);

      // Bind both managers multiple times
      bindManager1.bind();
      bindManager1.bind();
      bindManager2.bind();
      bindManager2.bind();

      // Emit event
      await eventBus.emit({ name: 'user:created', data: { id: 1 } });

      // Both handlers should receive the event exactly once
      expect(handler1.eventCounts.get('user:created')).toBe(1);
      expect(handler2.eventCounts.get('user:created')).toBe(1);
      expect(handler1.receivedEvents).toHaveLength(1);
      expect(handler2.receivedEvents).toHaveLength(1);
    });

    it('should properly track bindings for multiple decorated methods on same event', async () => {
      class MultiHandlerTest {
        public calls: string[] = [];

        @OnEvent('order:placed')
        handleOrder(): void {
          this.calls.push('handleOrder');
        }

        @OnEvent('order:placed')
        sendConfirmation(_event: ApplicationEvent): void {
          this.calls.push('sendConfirmation');
        }

        @OnEvent('order:placed')
        updateInventory(_event: ApplicationEvent): void {
          this.calls.push('updateInventory');
        }
      }

      const handler = new MultiHandlerTest();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Call bind multiple times
      bindManager.bind();
      bindManager.bind();
      bindManager.bind();

      // Emit event
      await eventBus.emit({ name: 'order:placed', data: { orderId: 123 } });

      // All three methods should be called exactly once
      expect(handler.calls).toEqual(['handleOrder', 'sendConfirmation', 'updateInventory']);
      expect(handler.calls).toHaveLength(3);
    });
  });

  describe('Bind and Unbind Operations', () => {
    class EventCounter {
      public count = 0;

      @OnEvent('counter:increment')
      increment(_event: ApplicationEvent): void {
        this.count++;
      }
    }

    it('should unbind all handlers correctly after multiple bind calls', async () => {
      const counter = new EventCounter();
      const bindManager = new DefaultClassApplicationEventBindManager(counter, listener);

      // Bind multiple times
      bindManager.bind();
      bindManager.bind();
      bindManager.bind();

      // Emit event - should be received
      await eventBus.emit({ name: 'counter:increment', data: {} });
      expect(counter.count).toBe(1);

      // Unbind
      bindManager.unbind();

      // Emit event - should not be received
      await eventBus.emit({ name: 'counter:increment', data: {} });
      expect(counter.count).toBe(1); // Still 1, not incremented
    });

    it('should handle unbind called multiple times safely', async () => {
      const counter = new EventCounter();
      const bindManager = new DefaultClassApplicationEventBindManager(counter, listener);

      bindManager.bind();
      await eventBus.emit({ name: 'counter:increment', data: {} });
      expect(counter.count).toBe(1);

      // Unbind multiple times
      bindManager.unbind();
      bindManager.unbind();
      bindManager.unbind();

      // Should not cause errors and handler should not receive events
      await eventBus.emit({ name: 'counter:increment', data: {} });
      expect(counter.count).toBe(1);
    });

    it('should handle bind-unbind-bind correctly with multiple handlers', async () => {
      class ComplexHandler {
        public events: string[] = [];

        @OnEvent('event:a')
        handleA(_event: ApplicationEvent): void {
          this.events.push('a');
        }

        @OnEvent('event:b')
        handleB(_event: ApplicationEvent): void {
          this.events.push('b');
        }
      }

      const handler = new ComplexHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // First cycle
      bindManager.bind();
      bindManager.bind(); // Duplicate
      await eventBus.emit({ name: 'event:a', data: {} });
      await eventBus.emit({ name: 'event:b', data: {} });
      expect(handler.events).toEqual(['a', 'b']);

      // Unbind
      bindManager.unbind();
      handler.events = [];
      await eventBus.emit({ name: 'event:a', data: {} });
      await eventBus.emit({ name: 'event:b', data: {} });
      expect(handler.events).toEqual([]);

      // Second cycle
      bindManager.bind();
      bindManager.bind(); // Duplicate
      await eventBus.emit({ name: 'event:a', data: {} });
      await eventBus.emit({ name: 'event:b', data: {} });
      expect(handler.events).toEqual(['a', 'b']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle class with no decorated methods', () => {
      class EmptyHandler {
        public value = 0;
      }

      const handler = new EmptyHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Should not throw
      expect(() => bindManager.bind()).not.toThrow();
      expect(() => bindManager.bind()).not.toThrow();
      expect(() => bindManager.unbind()).not.toThrow();
    });

    it('should handle non-function properties decorated with OnEvent', () => {
      // This is an edge case where the decorator is misused
      class InvalidHandler {
        public calls: string[] = [];

        @OnEvent('test:event')
        handleEvent(_event: ApplicationEvent): void {
          this.calls.push('handled');
        }
      }

      const handler = new InvalidHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Should work fine for valid methods
      bindManager.bind();
      bindManager.bind();

      expect(() => eventBus.emit({ name: 'test:event', data: {} })).not.toThrow();
      expect(handler.calls).toContain('handled');
    });

    it('should maintain independence between different bind managers on same instance', async () => {
      class SharedHandler {
        public count = 0;

        @OnEvent('shared:event')
        handle(_event: ApplicationEvent): void {
          this.count++;
        }
      }

      const handler = new SharedHandler();
      const listener1 = new DefaultApplicationEventListener(eventBus);
      const listener2 = new DefaultApplicationEventListener(eventBus);

      const bindManager1 = new DefaultClassApplicationEventBindManager(handler, listener1);
      const bindManager2 = new DefaultClassApplicationEventBindManager(handler, listener2);

      // Bind with first manager multiple times
      bindManager1.bind();
      bindManager1.bind();

      // Bind with second manager multiple times
      bindManager2.bind();
      bindManager2.bind();

      // Emit event
      await eventBus.emit({ name: 'shared:event', data: {} });

      // Should be called twice - once per listener
      expect(handler.count).toBe(2);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve "this" context in bound methods across multiple bind calls', async () => {
      class ContextTest {
        public name = 'TestHandler';
        public capturedContext: any = null;

        @OnEvent('context:test')
        checkContext(_event: ApplicationEvent): void {
          this.capturedContext = this.name;
        }
      }

      const handler = new ContextTest();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Bind multiple times
      bindManager.bind();
      bindManager.bind();
      bindManager.bind();

      // Emit event
      await eventBus.emit({ name: 'context:test', data: {} });

      // Context should be preserved
      expect(handler.capturedContext).toBe('TestHandler');
    });

    it('should handle method modification after binding', async () => {
      class DynamicHandler {
        public calls: number = 0;

        @OnEvent('dynamic:event')
        handleEvent(_event: ApplicationEvent): void {
          this.calls++;
        }
      }

      const handler = new DynamicHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Bind
      bindManager.bind();
      bindManager.bind();

      // Emit event
      await eventBus.emit({ name: 'dynamic:event', data: {} });
      expect(handler.calls).toBe(1);

      // The bound method should continue to work
      await eventBus.emit({ name: 'dynamic:event', data: {} });
      expect(handler.calls).toBe(2);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle a service that initializes multiple times in lifecycle', async () => {
      class NotificationService {
        public notifications: string[] = [];
        private initialized = false;

        @OnEvent('notification:send')
        sendNotification(event: ApplicationEvent): void {
          this.notifications.push(event.data.message);
        }

        @OnEvent('notification:batch')
        sendBatch(event: ApplicationEvent): void {
          event.data.messages.forEach((msg: string) => this.notifications.push(msg));
        }

        // Simulates a service that might call init multiple times
        initialize(bindManager: DefaultClassApplicationEventBindManager): void {
          if (!this.initialized) {
            this.initialized = true;
          }
          // Even if called multiple times, bind should handle it
          bindManager.bind();
        }
      }

      const service = new NotificationService();
      const bindManager = new DefaultClassApplicationEventBindManager(service, listener);

      // Simulate multiple initialization attempts
      service.initialize(bindManager);
      service.initialize(bindManager);
      service.initialize(bindManager);

      // Emit events
      await eventBus.emit({ name: 'notification:send', data: { message: 'Test 1' } });
      await eventBus.emit({ name: 'notification:batch', data: { messages: ['Test 2', 'Test 3'] } });

      // Should process events exactly once per emission
      expect(service.notifications).toEqual(['Test 1', 'Test 2', 'Test 3']);
      expect(service.notifications).toHaveLength(3);
    });

    it('should handle hot-reload scenario where bind is called repeatedly', async () => {
      class HotReloadableHandler {
        public processedEvents: number = 0;

        @OnEvent('data:update')
        processUpdate(_event: ApplicationEvent): void {
          this.processedEvents++;
        }

        @OnEvent('data:sync')
        syncData(_event: ApplicationEvent): void {
          this.processedEvents++;
        }
      }

      const handler = new HotReloadableHandler();
      const bindManager = new DefaultClassApplicationEventBindManager(handler, listener);

      // Simulate hot-reload cycles
      for (let i = 0; i < 5; i++) {
        bindManager.bind(); // Simulating repeated hot-reload bind calls
      }

      // Emit events
      await eventBus.emit({ name: 'data:update', data: {} });
      await eventBus.emit({ name: 'data:sync', data: {} });

      // Should only process each event once despite multiple bind calls
      expect(handler.processedEvents).toBe(2);
    });
  });
});








