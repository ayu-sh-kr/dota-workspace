import { describe, it, expect, beforeEach } from 'vitest';
import { type ApplicationEvent } from '../src/Types.ts';
import { OnEvent } from '@dota/listener/on-event.decorator.ts';
import { AutoBind } from '@dota/listener/auto-bind.decorator.ts';
import { DefaultApplicationEventBus } from '@dota/bus/DefaultApplicationEventBus.ts';
import { DefaultApplicationEventListener } from '@dota/listener/DefaultApplicationEventListener.ts';
import { DefaultApplicationEventListenerRegistry } from '@dota/listener/DefaultApplicationEventListenerRegistry.ts';
import { DefaultApplicationEventPublisher } from '@dota/publisher/DefaultApplicationEventPublisher.ts';
import { DefaultClassApplicationEventBindManager } from '@dota/manager/DefaultClassApplicationEventBindManager.ts';

// ─── Shared infrastructure ────────────────────────────────────────────────────

/**
 * Returns a fresh, isolated event bus + listener pair and seeds the global
 * registry so that @AutoBind() can resolve the listener on instantiation.
 */
function createInfrastructure() {
  const bus = DefaultApplicationEventBus.getNewInstance();
  const listener = new DefaultApplicationEventListener(bus);
  const publisher = new DefaultApplicationEventPublisher(bus);
  DefaultApplicationEventListenerRegistry.setListener(listener);
  return { bus, listener, publisher };
}

// ─── Test fixture classes ─────────────────────────────────────────────────────

/**
 * Simple service with two non-scoped event handlers.
 * Decorated with @AutoBind() so handlers bind automatically on `new`.
 */
@AutoBind()
class UserService {
  public receivedEvents: ApplicationEvent[] = [];

  @OnEvent('user:created')
  onUserCreated(event: ApplicationEvent<'user:created'>): void {
    this.receivedEvents.push(event);
  }

  @OnEvent('user:updated')
  onUserUpdated(event: ApplicationEvent<'user:updated'>): void {
    this.receivedEvents.push(event);
  }
}

/**
 * Service that has both scoped and non-scoped handlers.
 * Only non-scoped handlers should be registered by @AutoBind().
 */
@AutoBind()
class MixedService {
  public nonScopedCalls: ApplicationEvent[] = [];
  public scopedCalls: ApplicationEvent[] = [];

  @OnEvent('notification:send')
  onNotification(event: ApplicationEvent<'notification:send'>): void {
    this.nonScopedCalls.push(event);
  }

  @OnEvent('notification:broadcast', true)
  onBroadcast(event: ApplicationEvent<'notification:broadcast'>): void {
    this.scopedCalls.push(event);
  }
}

/**
 * Service with no @OnEvent decorators — @AutoBind() should be a no-op for it.
 */
@AutoBind()
class EmptyService {
  public value = 42;
}

/**
 * Verifies that constructor arguments are forwarded correctly.
 */
@AutoBind()
class ServiceWithArgs {
  public receivedEvents: ApplicationEvent[] = [];

  constructor(
    public readonly id: number,
    public readonly label: string
  ) {}

  @OnEvent('order:placed')
  onOrderPlaced(event: ApplicationEvent<'order:placed'>): void {
    this.receivedEvents.push(event);
  }
}

/**
 * Two independent instances — each should have its own bound callback so
 * an event reaches both.
 */
@AutoBind()
class CounterService {
  public count = 0;

  @OnEvent('counter:increment')
  onIncrement(_event: ApplicationEvent<'counter:increment'>): void {
    this.count++;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('@AutoBind() decorator', () => {

  let bus: DefaultApplicationEventBus;
  let publisher: DefaultApplicationEventPublisher;

  beforeEach(() => {
    ({ bus, publisher } = createInfrastructure());
  });

  // Each test gets a clean bus, so events don't bleed between cases.

  // ── Core binding behaviour ──────────────────────────────────────────────────

  describe('Core binding behaviour', () => {

    it('registers @OnEvent handlers automatically when the instance is created', () => {
      const service = new UserService();

      // The bind happened inside the constructor. Verify by checking that
      // publishing the event actually reaches the instance's handler.
      publisher.publish({ name: 'user:created', data: { id: 1, name: 'Alice' } });

      expect(service.receivedEvents).toHaveLength(1);
      expect(service.receivedEvents[0].name).toBe('user:created');
    });

    it('invokes the handler with the correct event payload', () => {
      const service = new UserService();

      publisher.publish({ name: 'user:created', data: { id: 7, name: 'Bob' } });

      expect(service.receivedEvents).toHaveLength(1);
      expect(service.receivedEvents[0].name).toBe('user:created');
      expect((service.receivedEvents[0] as ApplicationEvent<'user:created'>).data).toEqual({ id: 7, name: 'Bob' });
    });

    it('invokes the correct handler for each distinct event', () => {
      const service = new UserService();

      publisher.publish({ name: 'user:created', data: { id: 1, name: 'Alice' } });
      publisher.publish({ name: 'user:updated', data: { id: 1, name: 'Alice Updated' } });

      expect(service.receivedEvents).toHaveLength(2);
      expect(service.receivedEvents[0].name).toBe('user:created');
      expect(service.receivedEvents[1].name).toBe('user:updated');
    });

    it('handler receives multiple successive events in order', () => {
      const service = new UserService();

      publisher.publish({ name: 'user:created', data: { id: 1, name: 'First' } });
      publisher.publish({ name: 'user:created', data: { id: 2, name: 'Second' } });
      publisher.publish({ name: 'user:created', data: { id: 3, name: 'Third' } });

      expect(service.receivedEvents).toHaveLength(3);
      expect((service.receivedEvents[0] as ApplicationEvent<'user:created'>).data.id).toBe(1);
      expect((service.receivedEvents[1] as ApplicationEvent<'user:created'>).data.id).toBe(2);
      expect((service.receivedEvents[2] as ApplicationEvent<'user:created'>).data.id).toBe(3);
    });

  });

  // ── Scoped handler exclusion ────────────────────────────────────────────────

  describe('Scoped handler exclusion', () => {

    it('registers non-scoped handlers but NOT scoped ones', () => {
      const service = new MixedService();

      publisher.publish({ name: 'notification:send', data: { message: 'hello' } });
      publisher.publish({ name: 'notification:broadcast', data: { message: 'world' } });

      // Non-scoped handler should have fired.
      expect(service.nonScopedCalls).toHaveLength(1);

      // Scoped handler must NOT have fired — @AutoBind skips scoped methods.
      expect(service.scopedCalls).toHaveLength(0);
    });

  });

  // ── Class identity preservation ─────────────────────────────────────────────

  describe('Class identity preservation', () => {

    it('preserves instanceof relationship after decoration', () => {
      const service = new UserService();
      expect(service).toBeInstanceOf(UserService);
    });

    it('preserves the class name', () => {
      expect(UserService.name).toBe('UserService');
    });

    it('preserves instance properties from the original constructor', () => {
      const service = new EmptyService();
      expect(service.value).toBe(42);
    });

    it('forwards constructor arguments correctly', () => {
      const service = new ServiceWithArgs(99, 'alpha');
      expect(service.id).toBe(99);
      expect(service.label).toBe('alpha');
    });

    it('prototype methods remain callable on the instance', () => {
      const service = new UserService();
      // onUserCreated is on the prototype — calling it directly should work.
      expect(typeof service.onUserCreated).toBe('function');
    });

  });

  // ── this-binding correctness ────────────────────────────────────────────────

  describe('this-binding correctness', () => {

    it('handler has correct this context — mutates own instance state', () => {
      const service = new ServiceWithArgs(1, 'test');

      publisher.publish({ name: 'order:placed', data: { orderId: 42 } });

      expect(service.receivedEvents).toHaveLength(1);
    });

    it('two independent instances each receive the event separately', () => {
      const a = new CounterService();
      const b = new CounterService();

      publisher.publish({ name: 'counter:increment', data: {} });

      // Both instances should have incremented their own counter.
      expect(a.count).toBe(1);
      expect(b.count).toBe(1);
    });

    it('each instance only mutates its own state, not the sibling\'s', () => {
      const a = new CounterService();
      const b = new CounterService();

      publisher.publish({ name: 'counter:increment', data: {} });
      publisher.publish({ name: 'counter:increment', data: {} });

      expect(a.count).toBe(2);
      expect(b.count).toBe(2);
    });

  });

  // ── Empty / no-op class ─────────────────────────────────────────────────────

  describe('Class with no @OnEvent handlers', () => {

    it('does not throw when a class has no decorated methods', () => {
      expect(() => new EmptyService()).not.toThrow();
    });

    it('instance is still functional after decoration', () => {
      const service = new EmptyService();
      expect(service.value).toBe(42);
    });

  });

  // ── No duplicate bindings ───────────────────────────────────────────────────

  describe('No duplicate bindings across multiple instances', () => {

    it('each new instance binds its own handler independently', () => {
      const s1 = new UserService();
      const s2 = new UserService();

      publisher.publish({ name: 'user:created', data: { id: 1, name: 'Alice' } });

      // Both should each receive exactly one event, not two.
      expect(s1.receivedEvents).toHaveLength(1);
      expect(s2.receivedEvents).toHaveLength(1);
    });

  });

  // ── Registry not seeded ─────────────────────────────────────────────────────

  describe('Registry contract violation', () => {

    it('throws at instantiation time if the registry was never seeded', () => {
      // Reset the registry to a clean null state by setting a null-like value.
      // We rely on the registry throwing when listener is null.
      (DefaultApplicationEventListenerRegistry as any)['listener'] = null;

      expect(() => new UserService()).toThrow(
        'ApplicationEventListener has not been set in DefaultApplicationEventRegistry.'
      );
    });

  });

  // ── Manual unbind ───────────────────────────────────────────────────────────

  describe('Manual unbind via DefaultClassApplicationEventBindManager', () => {

    it('stops receiving events after explicit unbind()', async () => {
      // Use a fresh isolated infrastructure so bus state from other tests
      // does not interfere.
      const { bus: isolatedBus, listener: isolatedListener } = createInfrastructure();
      const isolatedPublisher = new DefaultApplicationEventPublisher(isolatedBus);

      // Plain class — no @AutoBind so we fully control the lifecycle ourselves.
      class PlainService {
        public receivedEvents: ApplicationEvent[] = [];

        @OnEvent('user:created')
        onUserCreated(event: ApplicationEvent<'user:created'>): void {
          this.receivedEvents.push(event);
        }
      }

      const service = new PlainService();
      const manager = new DefaultClassApplicationEventBindManager(service, isolatedListener);

      // Bind and confirm the handler fires.
      await manager.bind();
      isolatedPublisher.publish({ name: 'user:created', data: { id: 1, name: 'Before' } });
      expect(service.receivedEvents).toHaveLength(1);

      // Unbind and confirm the handler is silent afterwards.
      await manager.unbind();
      isolatedPublisher.publish({ name: 'user:created', data: { id: 2, name: 'After' } });
      expect(service.receivedEvents).toHaveLength(1);
    });

  });

});




