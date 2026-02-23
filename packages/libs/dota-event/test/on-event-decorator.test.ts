import { describe, it, expect, beforeEach } from 'vitest';
import {bindInstanceEventHandlers, getOnEventMetadata, OnEvent} from "@dota/listener/on-event.decorator.ts";
import {DefaultApplicationEventBus} from "@dota/bus/DefaultApplicationEventBus.ts";
import {DefaultApplicationEventPublisher} from "@dota/publisher/DefaultApplicationEventPublisher.ts";
import {DefaultApplicationEventListener} from "@dota/listener/DefaultApplicationEventListener.ts";
import {type ApplicationEvent} from "../src/Types.ts";

// Test subscriber classes using @OnEvent decorator
class UserEventSubscriber {
  public receivedEvents: Array<ApplicationEvent> = [];

  @OnEvent('user:created')
  handleUserCreated(event: ApplicationEvent): void {
    console.log('UserEventSubscriber: User created', event);
    this.receivedEvents.push(event);
  }

  @OnEvent('user:updated')
  handleUserUpdated(event: ApplicationEvent): void {
    console.log('UserEventSubscriber: User updated', event);
    this.receivedEvents.push(event);
  }

  @OnEvent('user:deleted')
  handleUserDeleted(event: ApplicationEvent): void {
    console.log('UserEventSubscriber: User deleted', event);
    this.receivedEvents.push(event);
  }

  @OnEvent('user:created')
  sendWelcomeEmail(event: ApplicationEvent): void {
    console.log('UserEventSubscriber: Sending welcome email', event);
    this.receivedEvents.push(event);
  }
}

class NotificationEventSubscriber {
  public notifications: string[] = [];
  public count = 0;

  @OnEvent('notification:send')
  handleNotification(data: any): void {
    const message = `Notification: ${JSON.stringify(data)}`;
    console.log(message);
    this.notifications.push(message);
    this.count++;
  }

  @OnEvent('notification:broadcast')
  handleBroadcast(data: any): void {
    const message = `Broadcast: ${JSON.stringify(data)}`;
    console.log(message);
    this.notifications.push(message);
    this.count++;
  }

  @OnEvent('notification:send')
  logNotification(data: any): void {
    console.log('Logging notification:', data);
    this.count++;
  }
}

class OrderEventSubscriber {
  public orders: any[] = [];
  public emails: any[] = [];
  public analytics: any[] = [];

  @OnEvent('order:placed')
  handleOrderPlaced(event: ApplicationEvent): void {
    console.log('Order placed:', event.data);
    this.orders.push(event.data);
  }

  @OnEvent('order:placed')
  sendOrderConfirmation(event: ApplicationEvent): void {
    const email = {
      to: event.data.customerEmail,
      subject: 'Order Confirmation',
      body: `Your order #${event.data.orderId} has been placed`,
    };
    console.log('Sending order confirmation:', email);
    this.emails.push(email);
  }

  @OnEvent('order:placed')
  trackOrderAnalytics(event: ApplicationEvent): void {
    const analyticsData = {
      orderId: event.data.orderId,
      timestamp: new Date().toISOString(),
      amount: event.data.amount,
    };
    console.log('Tracking analytics:', analyticsData);
    this.analytics.push(analyticsData);
  }

  @OnEvent('order:cancelled')
  handleOrderCancelled(event: ApplicationEvent): void {
    console.log('Order cancelled:', event.data);
    this.orders.push({ ...event.data, status: 'cancelled' });
  }
}

class MultiEventSubscriber {
  public events: Array<ApplicationEvent> = [];

  @OnEvent('event:a')
  handleEventA(event: ApplicationEvent): void {
    this.events.push(event);
  }

  @OnEvent('event:b')
  handleEventB(event: ApplicationEvent): void {
    this.events.push(event);
  }

  @OnEvent('event:c')
  handleEventC(event: ApplicationEvent): void {
    this.events.push(event);
  }

  @OnEvent('event:d')
  handleEventD(event: ApplicationEvent): void {
    this.events.push(event);
  }

  @OnEvent('event:e')
  handleEventE(event: ApplicationEvent): void {
    this.events.push(event);
  }
}

class EmptySubscriber {
  // No decorated methods
}

describe('OnEvent Decorator Tests', () => {
  describe('Decorator Metadata Storage', () => {
    it('should store metadata for decorated methods', () => {
      const metadata = getOnEventMetadata(UserEventSubscriber);

      expect(metadata).toHaveLength(4);

      expect(metadata).toContainEqual({name: 'user:created', method: 'handleUserCreated', scoped: false});
      expect(metadata).toContainEqual({name: 'user:updated', method: 'handleUserUpdated', scoped: false});
      expect(metadata).toContainEqual({name: 'user:deleted', method: 'handleUserDeleted', scoped: false});
      expect(metadata).toContainEqual({name: 'user:created', method: 'sendWelcomeEmail', scoped: false});
    });

    it('should support multiple handlers for same event', () => {
      const metadata = getOnEventMetadata(UserEventSubscriber);
      const userCreatedHandlers = metadata.filter(m => m.name === 'user:created');

      expect(userCreatedHandlers).toHaveLength(2);
      expect(userCreatedHandlers[0].method).toBe('handleUserCreated');
      expect(userCreatedHandlers[0].scoped).toBe(false);
      expect(userCreatedHandlers[1].method).toBe('sendWelcomeEmail');
      expect(userCreatedHandlers[1].scoped).toBe(false);
    });

    it('should store metadata for NotificationEventSubscriber', () => {
      const metadata = getOnEventMetadata(NotificationEventSubscriber);

      expect(metadata).toHaveLength(3);
      expect(metadata).toContainEqual({name: 'notification:send', method: 'handleNotification', scoped: false});
      expect(metadata).toContainEqual({name: 'notification:broadcast', method: 'handleBroadcast', scoped: false});
      expect(metadata).toContainEqual({name: 'notification:send', method: 'logNotification', scoped: false});
    });

    it('should store metadata for OrderEventSubscriber', () => {
      const metadata = getOnEventMetadata(OrderEventSubscriber);

      expect(metadata).toHaveLength(4);
      const orderPlacedHandlers = metadata.filter(m => m.name === 'order:placed');
      expect(orderPlacedHandlers).toHaveLength(3);
    });

    it('should return empty array for class without decorators', () => {
      const metadata = getOnEventMetadata(EmptySubscriber);
      expect(metadata).toHaveLength(0);
    });

    it('should get metadata from instance', () => {
      const instance = new UserEventSubscriber();
      const metadata = getOnEventMetadata(instance);

      expect(metadata).toHaveLength(4);
      expect(metadata[0].name).toBe('user:created');
    });
  });

  describe('bindInstanceEventHandlers Integration', () => {
    let eventBus: DefaultApplicationEventBus;
    let publisher: DefaultApplicationEventPublisher;
    let listener: DefaultApplicationEventListener;

    beforeEach(() => {
      // Reset singleton instance for clean tests
      (DefaultApplicationEventBus as any).instance = null;

      eventBus = DefaultApplicationEventBus.getInstance();
      publisher = new DefaultApplicationEventPublisher(eventBus);
      listener = new DefaultApplicationEventListener(eventBus);
    });

    it('should bind all decorated methods to event listener', async () => {
      const subscriber = new UserEventSubscriber();

      await bindInstanceEventHandlers(subscriber, listener);

      const userData = { id: 1, name: 'John Doe', email: 'john@example.com' };
      publisher.publish({ name: 'user:created', data: userData });

      // Should trigger both handleUserCreated and sendWelcomeEmail
      expect(subscriber.receivedEvents).toHaveLength(2);
      expect(subscriber.receivedEvents[0]).toEqual({ name: 'user:created', data: userData });
      expect(subscriber.receivedEvents[1]).toEqual({ name: 'user:created', data: userData });
    });

    it('should bind NotificationEventSubscriber handlers', async () => {
      const subscriber = new NotificationEventSubscriber();

      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'notification:send', data: { message: 'Test notification' } });

      // Should trigger both handleNotification and logNotification
      expect(subscriber.notifications).toHaveLength(1);
      expect(subscriber.count).toBe(2); // Both methods should increment count
    });

    it('should bind multiple handlers for order events', async () => {
      const subscriber = new OrderEventSubscriber();

      await bindInstanceEventHandlers(subscriber, listener);

      const orderData = {
        orderId: 'ORD-123',
        customerEmail: 'customer@example.com',
        amount: 99.99,
      };

      publisher.publish({ name: 'order:placed', data: orderData });

      // All three handlers should be triggered
      expect(subscriber.orders).toHaveLength(1);
      expect(subscriber.emails).toHaveLength(1);
      expect(subscriber.analytics).toHaveLength(1);

      expect(subscriber.orders[0]).toEqual(orderData);
      expect(subscriber.emails[0].to).toBe('customer@example.com');
      expect(subscriber.analytics[0].orderId).toBe('ORD-123');
    });

    it('should handle empty subscriber gracefully', async () => {
      const subscriber = new EmptySubscriber();

      // Should not throw
      await expect(bindInstanceEventHandlers(subscriber, listener)).resolves.toBeUndefined();
    });

    it('should bind multiple different events', async () => {
      const subscriber = new MultiEventSubscriber();

      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'event:a', data: 'data-a' });
      publisher.publish({ name: 'event:b', data: 'data-b' });
      publisher.publish({ name: 'event:c', data: 'data-c' });

      expect(subscriber.events).toHaveLength(3);
      expect(subscriber.events[0]).toEqual({ name: 'event:a', data: 'data-a' });
      expect(subscriber.events[1]).toEqual({ name: 'event:b', data: 'data-b' });
      expect(subscriber.events[2]).toEqual({ name: 'event:c', data: 'data-c' });
    });
  });

  describe('Multiple Subscribers with @OnEvent', () => {
    let eventBus: DefaultApplicationEventBus;
    let publisher: DefaultApplicationEventPublisher;
    let listener: DefaultApplicationEventListener;

    beforeEach(() => {
      (DefaultApplicationEventBus as any).instance = null;
      eventBus = DefaultApplicationEventBus.getInstance();
      publisher = new DefaultApplicationEventPublisher(eventBus);
      listener = new DefaultApplicationEventListener(eventBus);
    });

    it('should handle multiple subscriber instances', async () => {
      const userSubscriber = new UserEventSubscriber();
      const notificationSubscriber = new NotificationEventSubscriber();
      const orderSubscriber = new OrderEventSubscriber();

      await bindInstanceEventHandlers(userSubscriber, listener);
      await bindInstanceEventHandlers(notificationSubscriber, listener);
      await bindInstanceEventHandlers(orderSubscriber, listener);

      // Emit various events
      publisher.publish({ name: 'user:created', data: { id: 1, name: 'Alice' } });
      publisher.publish({ name: 'notification:send', data: { message: 'Hello' } });
      publisher.publish({ name: 'order:placed', data: { orderId: 'ORD-1', amount: 50 } });

      expect(userSubscriber.receivedEvents).toHaveLength(2); // 2 handlers for user:created
      expect(notificationSubscriber.count).toBe(2); // 2 handlers for notification:send
      expect(orderSubscriber.orders).toHaveLength(1);
      expect(orderSubscriber.emails).toHaveLength(1);
      expect(orderSubscriber.analytics).toHaveLength(1);
    });

    it('should handle batch events across multiple subscribers', async () => {
      const userSubscriber = new UserEventSubscriber();
      const orderSubscriber = new OrderEventSubscriber();

      await bindInstanceEventHandlers(userSubscriber, listener);
      await bindInstanceEventHandlers(orderSubscriber, listener);

      // Emit batch of events
      const events: ApplicationEvent[] = [
        { name: 'user:created', data: { id: 1, name: 'User 1' } },
        { name: 'user:updated', data: { id: 1, name: 'User 1 Updated' } },
        { name: 'order:placed', data: { orderId: 'ORD-1', amount: 100 } },
        { name: 'user:deleted', data: { id: 1 } },
        { name: 'order:cancelled', data: { orderId: 'ORD-1' } },
      ];

      for (const event of events) {
        publisher.publish(event);
      }

      expect(userSubscriber.receivedEvents).toHaveLength(4); // 2 for created, 1 for updated, 1 for deleted
      expect(orderSubscriber.orders).toHaveLength(2); // 1 for placed + 1 for cancelled
    });

    it('should maintain separate state for each subscriber instance', async () => {
      const subscriber1 = new UserEventSubscriber();
      const subscriber2 = new UserEventSubscriber();

      await bindInstanceEventHandlers(subscriber1, listener);
      await bindInstanceEventHandlers(subscriber2, listener);

      publisher.publish({ name: 'user:created', data: { id: 1, name: 'Test' } });

      // Both instances should receive the event
      expect(subscriber1.receivedEvents).toHaveLength(2);
      expect(subscriber2.receivedEvents).toHaveLength(2);

      // But they should be separate arrays
      expect(subscriber1.receivedEvents).not.toBe(subscriber2.receivedEvents);
    });
  });

  describe('Event Flow with @OnEvent', () => {
    let eventBus: DefaultApplicationEventBus;
    let publisher: DefaultApplicationEventPublisher;
    let listener: DefaultApplicationEventListener;

    beforeEach(() => {
      (DefaultApplicationEventBus as any).instance = null;
      eventBus = DefaultApplicationEventBus.getInstance();
      publisher = new DefaultApplicationEventPublisher(eventBus);
      listener = new DefaultApplicationEventListener(eventBus);
    });

    it('should handle sequential event emissions', async () => {
      const subscriber = new UserEventSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'user:created', data: { id: 1 } });
      expect(subscriber.receivedEvents).toHaveLength(2);

      publisher.publish({ name: 'user:updated', data: { id: 1 } });
      expect(subscriber.receivedEvents).toHaveLength(3);

      publisher.publish({ name: 'user:deleted', data: { id: 1 } });
      expect(subscriber.receivedEvents).toHaveLength(4);
    });

    it('should handle async event publishing', async () => {
      const subscriber = new OrderEventSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      await publisher.publishAsync({
        name: 'order:placed',
        data: { orderId: 'ORD-ASYNC', amount: 200 }
      });

      expect(subscriber.orders).toHaveLength(1);
      expect(subscriber.emails).toHaveLength(1);
      expect(subscriber.analytics).toHaveLength(1);
    });

    it('should handle rapid fire events', async () => {
      const subscriber = new NotificationEventSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      for (let i = 0; i < 50; i++) {
        publisher.publish({
          name: 'notification:send',
          data: { message: `Notification ${i}` }
        });
      }

      expect(subscriber.notifications).toHaveLength(50);
      expect(subscriber.count).toBe(100); // 2 handlers per event * 50 events
    });

    it('should handle events with null/undefined data', async () => {
      const subscriber = new UserEventSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'user:created', data: null });
      publisher.publish({ name: 'user:updated', data: undefined });

      expect(subscriber.receivedEvents).toHaveLength(3); // 2 for created, 1 for updated
      expect(subscriber.receivedEvents[0].data).toBeNull();
      expect(subscriber.receivedEvents[2].data).toBeUndefined();
    });

    it('should not throw for unhandled events', async () => {
      const subscriber = new UserEventSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      // Emit event that no subscriber handles
      expect(() => publisher.publish({ name: 'unknown:event', data: {} })).not.toThrow();

      expect(subscriber.receivedEvents).toHaveLength(0);
    });
  });

  describe('Context Binding', () => {
    let eventBus: DefaultApplicationEventBus;
    let publisher: DefaultApplicationEventPublisher;
    let listener: DefaultApplicationEventListener;

    beforeEach(() => {
      (DefaultApplicationEventBus as any).instance = null;
      eventBus = DefaultApplicationEventBus.getInstance();
      publisher = new DefaultApplicationEventPublisher(eventBus);
      listener = new DefaultApplicationEventListener(eventBus);
    });

    it('should bind methods with correct context', async () => {
      class ContextSubscriber {
        public value = 'initial';
        public receivedValues: string[] = [];

        @OnEvent('context:test')
        updateValue(event: ApplicationEvent): void {
          this.value = event.data.value
          this.receivedValues.push(this.value);
        }
      }

      const subscriber = new ContextSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'context:test', data: { value: 'updated' } });

      expect(subscriber.value).toBe('updated');
      expect(subscriber.receivedValues).toHaveLength(1);
      expect(subscriber.receivedValues[0]).toBe('updated');
    });

    it('should access instance properties correctly', async () => {
      class CounterSubscriber {
        public count = 0;

        @OnEvent('increment')
        increment(): void {
          this.count++;
        }

        @OnEvent('increment')
        logCount(): void {
          console.log('Current count:', this.count);
        }

        @OnEvent('decrement')
        decrement(): void {
          this.count--;
        }
      }

      const subscriber = new CounterSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'increment', data: {} });
      expect(subscriber.count).toBe(1);

      publisher.publish({ name: 'increment', data: {} });
      expect(subscriber.count).toBe(2);

      publisher.publish({ name: 'decrement', data: {} });
      expect(subscriber.count).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    let eventBus: DefaultApplicationEventBus;
    let publisher: DefaultApplicationEventPublisher;
    let listener: DefaultApplicationEventListener;

    beforeEach(() => {
      (DefaultApplicationEventBus as any).instance = null;
      eventBus = DefaultApplicationEventBus.getInstance();
      publisher = new DefaultApplicationEventPublisher(eventBus);
      listener = new DefaultApplicationEventListener(eventBus);
    });

    it('should handle subscriber with many handlers', async () => {
      class ManyHandlersSubscriber {
        public callCount = 0;

        @OnEvent('multi:event')
        handler1() { this.callCount++; }

        @OnEvent('multi:event')
        handler2() { this.callCount++; }

        @OnEvent('multi:event')
        handler3() { this.callCount++; }

        @OnEvent('multi:event')
        handler4() { this.callCount++; }

        @OnEvent('multi:event')
        handler5() { this.callCount++; }
      }

      const subscriber = new ManyHandlersSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'multi:event', data: {} });

      expect(subscriber.callCount).toBe(5);
    });

    it('should handle event names with special characters', async () => {
      class SpecialEventSubscriber {
        public received = false;

        @OnEvent('event:with:colons')
        handleColons() {
          this.received = true;
        }
      }

      const subscriber = new SpecialEventSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      publisher.publish({ name: 'event:with:colons', data: {} });

      expect(subscriber.received).toBe(true);
    });

    it('should handle complex data structures', async () => {
      class ComplexDataSubscriber {
        public receivedData: any = null;

        @OnEvent('complex:data')
        handleComplexData(event: ApplicationEvent) {
          this.receivedData = event.data;
        }
      }

      const subscriber = new ComplexDataSubscriber();
      await bindInstanceEventHandlers(subscriber, listener);

      const complexData = {
        nested: {
          deeply: {
            value: 'test'
          }
        },
        array: [1, 2, 3],
        date: new Date(),
      };

      publisher.publish({ name: 'complex:data', data: complexData });

      expect(subscriber.receivedData).toEqual(complexData);
    });
  });
});

