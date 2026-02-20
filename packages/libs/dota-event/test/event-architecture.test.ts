import { describe, it, expect, beforeEach, vi } from 'vitest';
import {DefaultApplicationEventListener} from "../src/DefaultApplicationEventListener.ts";
import {type ApplicationEvent} from "../src/Types.ts";
import {DefaultApplicationEventBus} from "../src/DefaultApplicationEventBus.ts";
import {DefaultApplicationEventPublisher} from "../src/DefaultApplicationEventPublisher.ts";

// Mock subscriber classes to test event architecture
class UserService {
  private listener: DefaultApplicationEventListener;
  public receivedEvents: ApplicationEvent[] = [];

  constructor(listener: DefaultApplicationEventListener) {
    this.listener = listener;
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    this.listener.on('user:created', this.onUserCreated.bind(this));
    this.listener.on('user:updated', this.onUserUpdated.bind(this));
    this.listener.on('user:deleted', this.onUserDeleted.bind(this));
  }

  private onUserCreated(event: ApplicationEvent): void {
    console.log('UserService: User created', event.data);
    this.receivedEvents.push(event);
  }

  private onUserUpdated(event: ApplicationEvent): void {
    console.log('UserService: User updated', event.data);
    this.receivedEvents.push(event);
  }

  private onUserDeleted(event: ApplicationEvent): void {
    console.log('UserService: User deleted', event.data);
    this.receivedEvents.push(event);
  }

  cleanup(): void {
    this.listener.off('user:created', this.onUserCreated.bind(this));
    this.listener.off('user:updated', this.onUserUpdated.bind(this));
    this.listener.off('user:deleted', this.onUserDeleted.bind(this));
  }
}

class NotificationService {
  private listener: DefaultApplicationEventListener;
  public notifications: string[] = [];

  constructor(listener: DefaultApplicationEventListener) {
    this.listener = listener;
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    this.listener.on('user:created', this.sendNotification.bind(this));
    this.listener.on('user:updated', this.sendNotification.bind(this));
    this.listener.on('notification:send', this.sendNotification.bind(this));
  }

  private sendNotification(data: any): void {
    const message = `Notification: ${JSON.stringify(data)}`;
    console.log(message);
    this.notifications.push(message);
  }

  cleanup(): void {
    this.listener.off('user:created', this.sendNotification.bind(this));
    this.listener.off('user:updated', this.sendNotification.bind(this));
    this.listener.off('notification:send', this.sendNotification.bind(this));
  }
}

class EmailService {
  private listener: DefaultApplicationEventListener;
  public emails: Array<{ to: string; subject: string; body: string }> = [];

  constructor(listener: DefaultApplicationEventListener) {
    this.listener = listener;
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    this.listener.on('email:send', this.sendEmail.bind(this));
    this.listener.on('user:created', this.sendWelcomeEmail.bind(this));
  }

  private sendEmail(event: ApplicationEvent): void {
    console.log('EmailService: Sending email', event.data);
    this.emails.push(event.data);
  }

  private sendWelcomeEmail(event: ApplicationEvent): void {
    if (event.data?.email) {
      const email = {
        to: event.data.email,
        subject: 'Welcome!',
        body: `Welcome ${event.data.name || 'User'}!`,
      };
      console.log('EmailService: Sending welcome email', email);
      this.emails.push(email);
    }
  }

  cleanup(): void {
    this.listener.off('email:send', this.sendEmail.bind(this));
    this.listener.off('user:created', this.sendWelcomeEmail.bind(this));
  }
}

describe('Event Architecture Integration Tests', () => {
  let eventBus: DefaultApplicationEventBus;
  let publisher: DefaultApplicationEventPublisher;
  let listener: DefaultApplicationEventListener;
  let userService: UserService;
  let notificationService: NotificationService;
  let emailService: EmailService;

  beforeEach(() => {
    // Reset singleton instance for clean tests
    (DefaultApplicationEventBus as any).instance = null;

    // Initialize event architecture
    eventBus = DefaultApplicationEventBus.getInstance();
    publisher = new DefaultApplicationEventPublisher(eventBus);
    listener = new DefaultApplicationEventListener(eventBus);

    // Initialize services with subscriptions
    userService = new UserService(listener);
    notificationService = new NotificationService(listener);
    emailService = new EmailService(listener);
  });

  describe('Single Event Emission', () => {
    it('should emit user:created event and notify all subscribers', async () => {
      const userData = { id: 1, name: 'John Doe', email: 'john@example.com' };
      const event: ApplicationEvent = {
        name: 'user:created',
        data: userData,
      };

      await publisher.publishAsync(event);

      // Verify UserService received the event
      expect(userService.receivedEvents).toHaveLength(1);
      expect(userService.receivedEvents[0].name).toBe('user:created');
      expect(userService.receivedEvents[0].data).toEqual(userData);

      // Verify NotificationService received the event
      expect(notificationService.notifications).toHaveLength(1);
      expect(notificationService.notifications[0]).toContain('John Doe');

      // Verify EmailService received the event and sent welcome email
      expect(emailService.emails).toHaveLength(1);
      expect(emailService.emails[0].to).toBe('john@example.com');
      expect(emailService.emails[0].subject).toBe('Welcome!');
    });

    it('should emit user:updated event', async () => {
      const userData = { id: 1, name: 'Jane Doe', email: 'jane@example.com' };
      const event: ApplicationEvent = {
        name: 'user:updated',
        data: userData,
      };

      await publisher.publishAsync(event);

      expect(userService.receivedEvents).toHaveLength(1);
      expect(userService.receivedEvents[0].name).toBe('user:updated');
      expect(notificationService.notifications).toHaveLength(1);
    });

    it('should emit user:deleted event', async () => {
      const userData = { id: 1 };
      const event: ApplicationEvent = {
        name: 'user:deleted',
        data: userData,
      };

      publisher.publish(event);

      expect(userService.receivedEvents).toHaveLength(1);
      expect(userService.receivedEvents[0].name).toBe('user:deleted');
    });
  });

  describe('Multiple Event Emissions', () => {
    it('should emit multiple events in sequence', async () => {
      const events: ApplicationEvent[] = [
        { name: 'user:created', data: { id: 1, name: 'User 1', email: 'user1@example.com' } },
        { name: 'user:created', data: { id: 2, name: 'User 2', email: 'user2@example.com' } },
        { name: 'user:updated', data: { id: 1, name: 'User 1 Updated' } },
        { name: 'user:deleted', data: { id: 2 } },
      ];

      for (const event of events) {
        await publisher.publishAsync(event);
      }

      expect(userService.receivedEvents).toHaveLength(4);
      expect(userService.receivedEvents[0].name).toBe('user:created');
      expect(userService.receivedEvents[1].name).toBe('user:created');
      expect(userService.receivedEvents[2].name).toBe('user:updated');
      expect(userService.receivedEvents[3].name).toBe('user:deleted');

      // NotificationService should have received 3 events (2 created + 1 updated)
      expect(notificationService.notifications).toHaveLength(3);

      // EmailService should have sent 2 welcome emails
      expect(emailService.emails).toHaveLength(2);
    });

    it('should emit a batch of notification events', async () => {
      const notifications = [
        { message: 'System maintenance scheduled' },
        { message: 'New feature available' },
        { message: 'Security update required' },
      ];

      for (const notification of notifications) {
        publisher.publish({
          name: 'notification:send',
          data: notification,
        });
      }

      expect(notificationService.notifications).toHaveLength(3);
    });

    it('should emit a batch of email events', async () => {
      const emails = [
        { to: 'user1@example.com', subject: 'Test 1', body: 'Body 1' },
        { to: 'user2@example.com', subject: 'Test 2', body: 'Body 2' },
        { to: 'user3@example.com', subject: 'Test 3', body: 'Body 3' },
      ];

      for (const email of emails) {
        await publisher.publishAsync({
          name: 'email:send',
          data: email,
        });
      }

      expect(emailService.emails).toHaveLength(3);
      expect(emailService.emails[0].to).toBe('user1@example.com');
      expect(emailService.emails[1].to).toBe('user2@example.com');
      expect(emailService.emails[2].to).toBe('user3@example.com');
    });
  });

  describe('Complex Event Scenarios', () => {
    it('should handle mixed event types', async () => {
      const events: ApplicationEvent[] = [
        { name: 'user:created', data: { id: 1, name: 'Alice', email: 'alice@example.com' } },
        { name: 'email:send', data: { to: 'bob@example.com', subject: 'Hello', body: 'World' } },
        { name: 'notification:send', data: { message: 'System update' } },
        { name: 'user:updated', data: { id: 1, name: 'Alice Updated' } },
        { name: 'user:deleted', data: { id: 1 } },
      ];

      for (const event of events) {
        publisher.publish(event);
      }

      expect(userService.receivedEvents).toHaveLength(3);
      expect(notificationService.notifications).toHaveLength(3); // 2 user events + 1 notification
      expect(emailService.emails).toHaveLength(2); // 1 welcome + 1 direct email
    });

    it('should handle rapid fire events', async () => {
      const rapidEvents: ApplicationEvent[] = [];
      for (let i = 0; i < 100; i++) {
        rapidEvents.push({
          name: 'user:created',
          data: { id: i, name: `User ${i}`, email: `user${i}@example.com` },
        });
      }

      for (const event of rapidEvents) {
        publisher.publish(event);
      }

      expect(userService.receivedEvents).toHaveLength(100);
      expect(notificationService.notifications).toHaveLength(100);
      expect(emailService.emails).toHaveLength(100);
    });

    it('should handle events with no subscribers', async () => {
      const event: ApplicationEvent = {
        name: 'unknown:event',
        data: { test: 'data' },
      };

      // Should not throw error
      expect(() => publisher.publish(event)).not.toThrow();
    });

    it('should handle events with null/undefined data', async () => {
      publisher.publish({ name: 'user:created', data: null });
      publisher.publish({ name: 'user:updated', data: undefined });

      expect(userService.receivedEvents).toHaveLength(2);
      expect(userService.receivedEvents[0].data).toBeNull();
      expect(userService.receivedEvents[1].data).toBeUndefined();
    });
  });

  describe('Separate Subscription Management', () => {
    it('should allow subscribing to events separately', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      listener.on('custom:event1', callback1);
      listener.on('custom:event2', callback2);

      publisher.publish({ name: 'custom:event1', data: 'test1' });
      publisher.publish({ name: 'custom:event2', data: 'test2' });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback1).toHaveBeenCalledWith({ name: 'custom:event1', data: 'test1' });
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledWith({ name: 'custom:event2', data: 'test2' });
    });

    it('should allow multiple callbacks for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      listener.on('multi:callback', callback1);
      listener.on('multi:callback', callback2);
      listener.on('multi:callback', callback3);

      const event = { name: 'multi:callback', data: 'test' };
      publisher.publish(event);

      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
      expect(callback3).toHaveBeenCalledWith(event);
    });

    it('should allow unsubscribing from events', () => {
      const callback = vi.fn();

      listener.on('unsub:test', callback);
      publisher.publish({ name: 'unsub:test', data: 'first' });

      expect(callback).toHaveBeenCalledTimes(1);

      listener.off('unsub:test', callback);
      publisher.publish({ name: 'unsub:test', data: 'second' });

      // Should still be 1, not 2
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Async Event Publishing', () => {
    it('should handle async event publishing', async () => {
      const callback = vi.fn(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return data;
      });

      listener.on('async:test', callback);
      const eventPayload = { name: 'async:test', data: 'async data' };
      await publisher.publishAsync(eventPayload);

      expect(callback).toHaveBeenCalledWith(eventPayload);
    });

    it('should publish multiple async events', async () => {
      const events = [
        { name: 'async:event1', data: 'data1' },
        { name: 'async:event2', data: 'data2' },
        { name: 'async:event3', data: 'data3' },
      ];

      const promises = events.map((event) => publisher.publishAsync(event));
      await Promise.all(promises);

      // Verify all events were processed
      expect(userService.receivedEvents).toHaveLength(0); // No matching events
    });
  });

  describe('Event Bus Singleton Pattern', () => {
    it('should use same event bus instance across services', () => {
      const bus1 = DefaultApplicationEventBus.getInstance();
      const bus2 = DefaultApplicationEventBus.getInstance();

      expect(bus1).toBe(bus2);
      expect(bus1).toBe(eventBus);
    });

    it('should share subscriptions across different listener instances', () => {
      const listener2 = new DefaultApplicationEventListener(eventBus);
      const callback = vi.fn();

      listener2.on('shared:event', callback);
      publisher.publish({ name: 'shared:event', data: 'shared' });

      expect(callback).toHaveBeenCalledWith({ name: 'shared:event', data: 'shared' });
    });
  });

  describe('Event Bus New Instance', () => {
    it('should create a new independent event bus instance', () => {
      const newBus = DefaultApplicationEventBus.getNewInstance();
      expect(newBus).not.toBe(eventBus);

      const newListener = new DefaultApplicationEventListener(newBus);
      const callback = vi.fn();

      newListener.on('new:event', callback);
      publisher.publish({ name: 'new:event', data: 'test' });

      // Should not be called since it's a different bus
      expect(callback).not.toHaveBeenCalled();

      // Publish on the new bus
      new DefaultApplicationEventPublisher(newBus)
        .publishAsync({ name: 'new:event', data: 'test' });
      expect(callback).toHaveBeenCalledWith({ name: 'new:event', data: 'test' });
    });
  })
});

