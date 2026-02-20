import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultClassScopedApplicationEventBindManager } from '../src/DefaultClassScopedApplicationEventBindManager.ts';
import { DefaultApplicationEventBus } from '../src/DefaultApplicationEventBus.ts';
import { DefaultApplicationEventListener } from '../src/DefaultApplicationEventListener.ts';
import { DefaultApplicationEventPublisher } from '../src/DefaultApplicationEventPublisher.ts';
import { EventChannel } from '../src/EventChannel.ts';
import { OnEvent } from '../src/on-event.decorator.ts';
import { type ApplicationEvent } from '../src/Types.ts';

// ─── helpers ────────────────────────────────────────────────────────────────

function createChannel(prefix: string) {
  (DefaultApplicationEventBus as any).instance = null;
  const bus = DefaultApplicationEventBus.getInstance();
  const listener = new DefaultApplicationEventListener(bus);
  const publisher = new DefaultApplicationEventPublisher(bus);
  const channel = new EventChannel(prefix, listener, publisher);
  return { bus, listener, publisher, channel };
}

// ─── test suite ─────────────────────────────────────────────────────────────

describe('DefaultClassScopedApplicationEventBindManager', () => {

  // shared bus / channel reset for every test
  let bus: DefaultApplicationEventBus;
  let channel: EventChannel;
  let publisher: DefaultApplicationEventPublisher;

  beforeEach(() => {
    ({ bus, channel, publisher } = createChannel('widget'));
  });

  // ── Core: only scoped methods are bound ────────────────────────────────────

  describe('Core – scoped-only binding', () => {

    it('should bind a method decorated with @OnEvent(name, true) to the channel', async () => {
      class Target {
        public calls = 0;
        @OnEvent('opened', true)
        onOpened(_e: ApplicationEvent) { this.calls++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      channel.emit({ name: 'opened' });

      expect(t.calls).toBe(1);
    });

    it('should NOT bind a method decorated with @OnEvent(name) — non-scoped', async () => {
      class Target {
        public calls = 0;
        @OnEvent('opened')
        onOpened(_e: ApplicationEvent) { this.calls++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      channel.emit({ name: 'opened' });

      expect(t.calls).toBe(0);
    });

    it('should bind scoped methods and ignore non-scoped ones in the same class', async () => {
      class Target {
        public log: string[] = [];

        @OnEvent('global:event')
        onGlobal(_e: ApplicationEvent) { this.log.push('global'); }

        @OnEvent('opened', true)
        onOpened(_e: ApplicationEvent) { this.log.push('opened'); }

        @OnEvent('closed', true)
        onClosed(_e: ApplicationEvent) { this.log.push('closed'); }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      channel.emit({ name: 'opened' });
      channel.emit({ name: 'closed' });
      // emit the raw global event – scoped manager must not care
      publisher.publish({ name: 'global:event' });

      expect(t.log).toContain('opened');
      expect(t.log).toContain('closed');
      expect(t.log).not.toContain('global');
    });

    it('should deliver the full event object (including data) to the handler', async () => {
      class Target {
        public received: ApplicationEvent[] = [];
        @OnEvent('submitted', true)
        onSubmitted(e: ApplicationEvent) { this.received.push(e); }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);
      await mgr.bind();

      channel.emit({ name: 'submitted', data: { form: 'login', userId: 42 } });

      expect(t.received).toHaveLength(1);
      expect(t.received[0].data).toEqual({ form: 'login', userId: 42 });
    });

    it('should preserve the prefixed event name in the received event', async () => {
      class Target {
        public receivedName = '';
        @OnEvent('clicked', true)
        onClick(e: ApplicationEvent) { this.receivedName = e.name; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);
      await mgr.bind();

      channel.emit({ name: 'clicked' });

      expect(t.receivedName).toBe('widget:clicked');
    });
  });

  // ── Duplicate bind prevention ──────────────────────────────────────────────

  describe('Duplicate bind prevention', () => {

    it('should register the handler only once even if bind() is called multiple times', async () => {
      class Target {
        public count = 0;
        @OnEvent('tick', true)
        onTick(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      await mgr.bind();
      await mgr.bind();

      channel.emit({ name: 'tick' });

      expect(t.count).toBe(1);
    });

    it('should not register duplicate handlers after 10 bind() calls', async () => {
      class Target {
        public count = 0;
        @OnEvent('ping', true)
        onPing(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      for (let i = 0; i < 10; i++) await mgr.bind();

      channel.emit({ name: 'ping' });

      expect(t.count).toBe(1);
    });

    it('should handle multiple scoped methods on the same class without duplicates', async () => {
      class Target {
        public log: string[] = [];

        @OnEvent('start', true)
        onStart(_e: ApplicationEvent) { this.log.push('start'); }

        @OnEvent('stop', true)
        onStop(_e: ApplicationEvent) { this.log.push('stop'); }

        @OnEvent('reset', true)
        onReset(_e: ApplicationEvent) { this.log.push('reset'); }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      await mgr.bind();

      channel.emit({ name: 'start' });
      channel.emit({ name: 'stop' });
      channel.emit({ name: 'reset' });

      expect(t.log).toEqual(['start', 'stop', 'reset']);
    });

    it('should handle multiple methods bound to the same scoped event without duplicates', async () => {
      class Target {
        public calls: string[] = [];

        @OnEvent('update', true)
        handlerA(_e: ApplicationEvent) { this.calls.push('A'); }

        @OnEvent('update', true)
        handlerB(_e: ApplicationEvent) { this.calls.push('B'); }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      await mgr.bind();

      channel.emit({ name: 'update' });

      expect(t.calls).toContain('A');
      expect(t.calls).toContain('B');
      expect(t.calls.filter(c => c === 'A')).toHaveLength(1);
      expect(t.calls.filter(c => c === 'B')).toHaveLength(1);
    });
  });

  // ── Unbind ─────────────────────────────────────────────────────────────────

  describe('unbind()', () => {

    it('should stop delivering events after unbind()', async () => {
      class Target {
        public count = 0;
        @OnEvent('tick', true)
        onTick(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      channel.emit({ name: 'tick' });
      expect(t.count).toBe(1);

      await mgr.unbind();
      channel.emit({ name: 'tick' });
      expect(t.count).toBe(1); // no extra increment
    });

    it('should be idempotent — multiple unbind() calls must not throw', async () => {
      class Target {
        @OnEvent('tick', true)
        onTick(_e: ApplicationEvent) {}
      }

      const mgr = new DefaultClassScopedApplicationEventBindManager(new Target(), channel);
      await mgr.bind();

      await expect(mgr.unbind()).resolves.not.toThrow();
      await expect(mgr.unbind()).resolves.not.toThrow();
      await expect(mgr.unbind()).resolves.not.toThrow();
    });

    it('should allow unbind() before any bind() without throwing', async () => {
      class Target {
        @OnEvent('tick', true)
        onTick(_e: ApplicationEvent) {}
      }

      const mgr = new DefaultClassScopedApplicationEventBindManager(new Target(), channel);
      await expect(mgr.unbind()).resolves.not.toThrow();
    });

    it('should remove all scoped handlers while leaving non-scoped ones untouched', async () => {
      // Non-scoped method registered manually on the bus to verify isolation
      const { bus: bus2, channel: ch2 } = createChannel('widget');
      const sharedBus = bus2;

      class Target {
        public scopedCalls = 0;
        @OnEvent('resize', true)
        onResize(_e: ApplicationEvent) { this.scopedCalls++; }
      }

      const externalCallCount = { value: 0 };
      await sharedBus.on('widget:resize', () => externalCallCount.value++);

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, ch2);

      await mgr.bind();
      ch2.emit({ name: 'resize' });
      expect(t.scopedCalls).toBe(1);
      expect(externalCallCount.value).toBe(1);

      await mgr.unbind();
      ch2.emit({ name: 'resize' });

      // target handler is gone; external listener still receives
      expect(t.scopedCalls).toBe(1);
      expect(externalCallCount.value).toBe(2);
    });
  });

  // ── bind → unbind → bind lifecycle ────────────────────────────────────────

  describe('bind → unbind → bind lifecycle', () => {

    it('should re-bind correctly after unbind', async () => {
      class Target {
        public count = 0;
        @OnEvent('tick', true)
        onTick(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      // first lifecycle
      await mgr.bind();
      channel.emit({ name: 'tick' });
      expect(t.count).toBe(1);

      // disconnect
      await mgr.unbind();
      channel.emit({ name: 'tick' });
      expect(t.count).toBe(1);

      // reconnect
      await mgr.bind();
      channel.emit({ name: 'tick' });
      expect(t.count).toBe(2);
    });

    it('should handle multiple full lifecycle cycles without accumulating handlers', async () => {
      class Target {
        public count = 0;
        @OnEvent('pulse', true)
        onPulse(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      for (let cycle = 0; cycle < 5; cycle++) {
        await mgr.bind();
        await mgr.bind(); // duplicate guard
        channel.emit({ name: 'pulse' });
        await mgr.unbind();
      }

      // Each cycle's single emit should have incremented exactly once → 5 total
      expect(t.count).toBe(5);
    });

    it('should allow multiple bind calls after re-bind without triggering duplicates', async () => {
      class Target {
        public count = 0;
        @OnEvent('save', true)
        onSave(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      await mgr.unbind();

      await mgr.bind();
      await mgr.bind(); // should still only bind once

      channel.emit({ name: 'save' });
      expect(t.count).toBe(1);
    });
  });

  // ── Namespace isolation ────────────────────────────────────────────────────

  describe('Channel namespace isolation', () => {

    it('should NOT fire when the same event is emitted on a different channel', async () => {
      const { channel: otherChannel } = createChannel('other-widget');

      class Target {
        public count = 0;
        @OnEvent('opened', true)
        onOpened(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);
      await mgr.bind();

      // emit on the OTHER channel — should not reach our handler
      otherChannel.emit({ name: 'opened' });

      expect(t.count).toBe(0);
    });

    it('should NOT fire when the raw prefixed event is published without the channel', async () => {
      class Target {
        public count = 0;
        @OnEvent('loaded', true)
        onLoaded(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);
      await mgr.bind();

      // Publish the bare name — not through the channel
      publisher.publish({ name: 'loaded' });

      expect(t.count).toBe(0);
    });

    it('should isolate two managers on different channels sharing the same bus', async () => {
      (DefaultApplicationEventBus as any).instance = null;
      const sharedBus = DefaultApplicationEventBus.getInstance();
      const sharedListener = new DefaultApplicationEventListener(sharedBus);
      const sharedPublisher = new DefaultApplicationEventPublisher(sharedBus);

      const channelA = new EventChannel('comp-a', sharedListener, sharedPublisher);
      const channelB = new EventChannel('comp-b', sharedListener, sharedPublisher);

      class TargetA {
        public count = 0;
        @OnEvent('update', true)
        onUpdate(_e: ApplicationEvent) { this.count++; }
      }
      class TargetB {
        public count = 0;
        @OnEvent('update', true)
        onUpdate(_e: ApplicationEvent) { this.count++; }
      }

      const a = new TargetA();
      const b = new TargetB();
      const mgrA = new DefaultClassScopedApplicationEventBindManager(a, channelA);
      const mgrB = new DefaultClassScopedApplicationEventBindManager(b, channelB);

      await mgrA.bind();
      await mgrB.bind();

      channelA.emit({ name: 'update' });

      expect(a.count).toBe(1);
      expect(b.count).toBe(0); // B's channel was NOT emitted on
    });
  });

  // ── Context preservation ───────────────────────────────────────────────────

  describe('Context (this) preservation', () => {

    it('should preserve the instance `this` reference inside the handler', async () => {
      class Target {
        public name = 'myComponent';
        public capturedName = '';

        @OnEvent('init', true)
        onInit(_e: ApplicationEvent) {
          this.capturedName = this.name; // relies on correct `this`
        }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);
      await mgr.bind();

      channel.emit({ name: 'init' });

      expect(t.capturedName).toBe('myComponent');
    });

    it('should preserve context across multiple bind/unbind cycles', async () => {
      class Target {
        public id = 99;
        public capturedIds: number[] = [];

        @OnEvent('ping', true)
        onPing(_e: ApplicationEvent) { this.capturedIds.push(this.id); }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      for (let i = 0; i < 3; i++) {
        await mgr.bind();
        channel.emit({ name: 'ping' });
        await mgr.unbind();
      }

      expect(t.capturedIds).toEqual([99, 99, 99]);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('Edge cases', () => {

    it('should do nothing when the target has no decorated methods', async () => {
      class Empty { public x = 0; }
      const mgr = new DefaultClassScopedApplicationEventBindManager(new Empty(), channel);

      await expect(mgr.bind()).resolves.not.toThrow();
      await expect(mgr.unbind()).resolves.not.toThrow();
    });

    it('should do nothing when the target has only non-scoped decorators', async () => {
      class NonScopedOnly {
        public count = 0;
        @OnEvent('event:a')
        onA(_e: ApplicationEvent) { this.count++; }
      }

      const t = new NonScopedOnly();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);
      await mgr.bind();

      channel.emit({ name: 'event:a' });

      expect(t.count).toBe(0);
    });

    it('should maintain independent stores for two managers on the same instance', async () => {
      (DefaultApplicationEventBus as any).instance = null;
      const sharedBus = DefaultApplicationEventBus.getInstance();
      const sharedListener = new DefaultApplicationEventListener(sharedBus);
      const sharedPublisher = new DefaultApplicationEventPublisher(sharedBus);

      const ch1 = new EventChannel('ch1', sharedListener, sharedPublisher);
      const ch2 = new EventChannel('ch2', sharedListener, sharedPublisher);

      class Target {
        public count = 0;
        @OnEvent('tick', true)
        onTick(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr1 = new DefaultClassScopedApplicationEventBindManager(t, ch1);
      const mgr2 = new DefaultClassScopedApplicationEventBindManager(t, ch2);

      await mgr1.bind();
      await mgr2.bind();

      ch1.emit({ name: 'tick' });
      ch2.emit({ name: 'tick' });

      // each channel fires its own bound callback
      expect(t.count).toBe(2);
    });

    it('should not call handlers for events emitted before bind()', async () => {
      class Target {
        public count = 0;
        @OnEvent('early', true)
        onEarly(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      // emit BEFORE bind
      channel.emit({ name: 'early' });
      await mgr.bind();

      expect(t.count).toBe(0);
    });

    it('should not call handlers for events emitted after unbind()', async () => {
      class Target {
        public count = 0;
        @OnEvent('late', true)
        onLate(_e: ApplicationEvent) { this.count++; }
      }

      const t = new Target();
      const mgr = new DefaultClassScopedApplicationEventBindManager(t, channel);

      await mgr.bind();
      await mgr.unbind();

      // emit AFTER unbind
      channel.emit({ name: 'late' });

      expect(t.count).toBe(0);
    });
  });

  // ── Real-world component simulation ───────────────────────────────────────

  describe('Real-world component lifecycle simulation', () => {

    it('should simulate connectedCallback / disconnectedCallback pattern', async () => {
      class PopoverComponent {
        public openCount = 0;
        public closeCount = 0;

        @OnEvent('open', true)
        onOpen(_e: ApplicationEvent) { this.openCount++; }

        @OnEvent('close', true)
        onClose(_e: ApplicationEvent) { this.closeCount++; }
      }

      const comp = new PopoverComponent();
      const mgr = new DefaultClassScopedApplicationEventBindManager(comp, channel);

      // Mount → interact → unmount → remount → interact
      await mgr.bind();                         // connectedCallback
      channel.emit({ name: 'open' });
      channel.emit({ name: 'close' });
      expect(comp.openCount).toBe(1);
      expect(comp.closeCount).toBe(1);

      await mgr.unbind();                       // disconnectedCallback
      channel.emit({ name: 'open' });
      channel.emit({ name: 'close' });
      expect(comp.openCount).toBe(1);
      expect(comp.closeCount).toBe(1);

      await mgr.bind();                         // reconnectedCallback
      channel.emit({ name: 'open' });
      channel.emit({ name: 'close' });
      expect(comp.openCount).toBe(2);
      expect(comp.closeCount).toBe(2);
    });

    it('should simulate a component that calls bind() in connectedCallback twice (hot-reload)', async () => {
      class TooltipComponent {
        public shown = 0;

        @OnEvent('show', true)
        onShow(_e: ApplicationEvent) { this.shown++; }
      }

      const comp = new TooltipComponent();
      const mgr = new DefaultClassScopedApplicationEventBindManager(comp, channel);

      // Hot-reload scenario: connectedCallback fires twice without disconnectedCallback
      await mgr.bind();
      await mgr.bind();

      channel.emit({ name: 'show' });

      expect(comp.shown).toBe(1);
    });

    it('should handle a component with mixed scoped and global handlers correctly', async () => {
      (DefaultApplicationEventBus as any).instance = null;
      const globalBus = DefaultApplicationEventBus.getInstance();
      const globalListener = new DefaultApplicationEventListener(globalBus);
      const globalPublisher = new DefaultApplicationEventPublisher(globalBus);
      const localChannel = new EventChannel('modal', globalListener, globalPublisher);

      class ModalComponent {
        public localEvents: string[] = [];
        public globalEvents: string[] = [];

        // scoped — only fires through the channel
        @OnEvent('opened', true)
        onOpened(_e: ApplicationEvent) { this.localEvents.push('opened'); }

        @OnEvent('closed', true)
        onClosed(_e: ApplicationEvent) { this.localEvents.push('closed'); }

        // non-scoped — would be registered via DefaultClassApplicationEventBindManager
        @OnEvent('app:theme-changed')
        onThemeChanged(_e: ApplicationEvent) { this.globalEvents.push('theme'); }
      }

      const comp = new ModalComponent();
      const scopedMgr = new DefaultClassScopedApplicationEventBindManager(comp, localChannel);
      await scopedMgr.bind();

      // fire scoped events through channel
      localChannel.emit({ name: 'opened' });
      localChannel.emit({ name: 'closed' });

      // fire global event directly — scoped manager must NOT have registered it
      globalPublisher.publish({ name: 'app:theme-changed' });

      expect(comp.localEvents).toEqual(['opened', 'closed']);
      expect(comp.globalEvents).toHaveLength(0); // scoped manager never binds non-scoped
    });
  });
});

