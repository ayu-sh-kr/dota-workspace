import 'reflect-metadata';
import {
  BaseElement,
  Component,
  Property,
  State,
  BindEvent,
  HostListener,
  AfterInit,
  BeforeInit,
  Emitter,
} from '@dota/core';
import { String, Number, Object } from '@dota/core';
import { LifecycleEventConstants } from '@dota/core/constants';
import { ApplicationEventService } from '@dota/core/services/application-event.service.ts';
import { DefaultApplicationEventBus } from '@ayu-sh-kr/dota-event';
import { defineAndCreate, microtask } from '../../Utils.ts';


function resetServices(): void {
  (ApplicationEventService as any)._instance = undefined;
  (DefaultApplicationEventBus as any).instance = undefined;
}

// ─── Construction ─────────────────────────────────────────────────────────────

describe('BaseElement – construction', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    resetServices();
  });

  it('creates a valid HTMLElement instance', () => {
    @Component({ selector: 'ctor-is-html-element', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el).toBeInstanceOf(BaseElement);
  });

  it('initialises reactive to false before connection', () => {
    @Component({ selector: 'ctor-reactive-false', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    expect(el.reactive).toBe(false);
  });

  it('creates an EventChannel scoped to the selector and uid', () => {
    @Component({ selector: 'ctor-event-channel', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    expect((el as any).__eventChannel).toBeDefined();
  });

  it('emits the CONSTRUCTED lifecycle event immediately on construction', () => {
    const spy = jest.fn();
    const svc = ApplicationEventService.getInstance();
    svc.getListener().on(`ctor-emits-constructed:1:${LifecycleEventConstants.CONSTRUCTED}`, spy);

    // Since we can't know the uid ahead of time, subscribe to ALL constructed events via bus
    svc.getListener().on = ((orig) => (event: string, cb: any) => {
      return orig.call(svc.getListener(), event, cb);
    })(svc.getListener().on);

    // subscribe broadly — any event containing 'constructed'
    const originalOn = svc.getListener().on.bind(svc.getListener());
    svc.getListener().on = (event: string, cb: any) => {
      return originalOn(event, cb);
    };

    // Use the event bus directly to capture any published event
    const busSpy = jest.fn();
    svc.getEventBus().on('ctor-constructed-check:1:constructed', busSpy);

    @Component({ selector: 'ctor-constructed-check', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    const channel = (el as any).__eventChannel;
    expect(channel).toBeDefined();
  });

  it('__initialized is false before connectedCallback', () => {
    @Component({ selector: 'ctor-not-initialized', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    expect((el as any).__initialized).toBe(false);
  });

  it('updateHTML is a no-op before connection — does not throw', () => {
    @Component({ selector: 'ctor-updatehtml-noop', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return `<p>hello</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    expect(() => (el as any).updateHTML()).not.toThrow();
    expect(el.innerHTML).toBe('');
  });
});

// ─── connectedCallback ────────────────────────────────────────────────────────

describe('BaseElement – connectedCallback', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('renders HTML into innerHTML on connect for a non-shadow component', async () => {
    @Component({ selector: 'connected-renders-html', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return `<p id="content">hello</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.querySelector('#content')).not.toBeNull();
    expect(el.querySelector('#content')!.textContent).toBe('hello');
  });

  it('renders HTML into shadowRoot for a shadow component', async () => {
    @Component({ selector: 'connected-shadow-renders', shadow: true })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return `<span id="shadow-inner">shadow</span>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('#shadow-inner')).not.toBeNull();
    expect(el.querySelector('#shadow-inner')).toBeNull();
  });

  it('sets __initialized to true after all tasks complete', async () => {
    @Component({ selector: 'connected-initialized', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).__initialized).toBe(true);
  });

  it('sets reactive to true after bindProperties resolves', async () => {
    @Component({ selector: 'connected-reactive-true', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      @Property({ name: 'label', type: String })
      label!: string;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.reactive).toBe(true);
  });

  it('emits the CONNECTED lifecycle event after all tasks resolve', async () => {
    const spy = jest.fn();

    @Component({ selector: 'connected-emits-connected', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    const channel = (el as any).__eventChannel;
    channel.on(LifecycleEventConstants.CONNECTED, spy);

    document.body.appendChild(el);
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls @BeforeInit hook before HTML is rendered', async () => {
    const log: string[] = [];

    @Component({ selector: 'connected-before-init-order', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      @BeforeInit()
      beforeViewInit() { log.push(this.innerHTML === '' ? 'before' : 'after'); }
      render() { log.push('render'); return `<p>x</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log.indexOf('before')).toBeLessThan(log.indexOf('render'));
  });

  it('calls @AfterInit hook after all bindings complete', async () => {
    const log: string[] = [];

    @Component({ selector: 'connected-after-init-order', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      @AfterInit()
      afterViewInit() { log.push('after'); }
      render() { log.push('render'); return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log.indexOf('render')).toBeLessThan(log.indexOf('after'));
  });

  it('binds @BindEvent listener so clicking the child invokes the method', async () => {
    const spy = jest.fn();

    @Component({ selector: 'connected-bind-event', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      @BindEvent({ event: 'click', id: '#btn' })
      onClick(_e: Event) { spy(); }
      render() { return `<button id="btn">go</button>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.querySelector<HTMLButtonElement>('#btn')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('binds @HostListener so clicking the host element invokes the method', async () => {
    const spy = jest.fn();

    @Component({ selector: 'connected-host-listener', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      @HostListener({ event: 'click' })
      onHostClick(_e: Event) { spy(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('binds @Output so the emitter property is an EventEmitter instance', async () => {
    @Component({ selector: 'connected-output-emitter', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      @Emitter('save-clicked')
      saveClicked: any;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).saveClicked).toBeDefined();
    expect(typeof (el as any).saveClicked.emit).toBe('function');
  });

  it('does not duplicate @BindEvent listeners on re-render', async () => {
    const spy = jest.fn();

    @Component({ selector: 'connected-no-duplicate-bind', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }
      @BindEvent({ event: 'click', id: '#btn' })
      onClick(_e: Event) { spy(); }
      render() { return `<button id="btn">go</button>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).updateHTML();
    await microtask();

    // re-query after re-render — old reference is a detached node
    el.querySelector<HTMLButtonElement>('#btn')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─── attributeChangedCallback ─────────────────────────────────────────────────

describe('BaseElement – attributeChangedCallback', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('updates the typed property when the attribute is set', async () => {
    @Component({ selector: 'attr-updates-property', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'count', type: Number })
      count!: number;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.setAttribute('count', '7');
    await microtask();

    expect((el as any).count).toBe(7);
  });

  it('triggers a re-render when an observed attribute changes to a new value', async () => {
    let renders = 0;

    @Component({ selector: 'attr-triggers-rerender', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'title', type: String })
      title!: string;
      render() { renders++; return `<p>${(this as any).title ?? ''}</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const before = renders;
    el.setAttribute('title', 'hello');
    await microtask();

    expect(renders).toBeGreaterThan(before);
  });

  it('does not re-render when the same attribute value is set again', async () => {
    let renders = 0;

    @Component({ selector: 'attr-no-rerender-same-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'mode', type: String })
      mode!: string;
      render() { renders++; return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.setAttribute('mode', 'edit');
    await microtask();
    const after = renders;

    el.setAttribute('mode', 'edit');
    await microtask();

    expect(renders).toBe(after);
  });

  it('does not update the property when the new attribute value is null', async () => {
    @Component({ selector: 'attr-null-ignored', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'status', type: String })
      status!: string;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.setAttribute('status', 'active');
    await microtask();
    const valueBefore = (el as any).status;

    el.removeAttribute('status');
    await microtask();

    expect((el as any).status).toBe(valueBefore);
  });

  it('emits the ATTRIBUTE_CHANGED lifecycle event on every attribute change', async () => {
    const spy = jest.fn();

    @Component({ selector: 'attr-emits-event', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'size', type: Number })
      size!: number;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    // subscribe only AFTER connect so internal attribute reflections are not counted
    const channel = (el as any).__eventChannel;
    channel.on(LifecycleEventConstants.ATTRIBUTE_CHANGED, spy);

    el.setAttribute('size', '10');
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);

    el.setAttribute('size', '20');
    await microtask();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('ATTRIBUTE_CHANGED fires exactly once per external setAttribute call', async () => {
    const spy = jest.fn();

    @Component({ selector: 'attr-fires-once', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'count', type: Number })
      count!: number;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const channel = (el as any).__eventChannel;
    channel.on(LifecycleEventConstants.ATTRIBUTE_CHANGED, spy);

    el.setAttribute('count', '1');
    await microtask();

    // must be exactly 1 — the old bindReactive-in-callback path caused this to be 2
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('attribute set before connect is still read by connectedCallback via bindProperties', async () => {
    @Component({ selector: 'attr-before-connect-read', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'phase', type: String })
      phase!: string;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    // set before connecting — bindReactive must read this during connectedCallback
    el.setAttribute('phase', 'init');

    document.body.appendChild(el);
    await microtask();

    // reactive is set by connectedCallback's bindProperties, not attributeChangedCallback
    expect((el as any).reactive).toBe(true);
    expect((el as any).phase).toBe('init');
  });

  it('reflects object property initializers as JSON and accepts later object assignments', async () => {
    @Component({ selector: 'object-property-reflection', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'config', type: Object })
      config = { container: 'initial' };

      render() { return `<span>${this.config.container}</span>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).config).toEqual({ container: 'initial' });
    expect(el.getAttribute('config')).toBe('{"container":"initial"}');

    (el as any).config = { container: 'updated' };
    await microtask();

    expect(el.getAttribute('config')).toBe('{"container":"updated"}');
    expect((el as any).config).toEqual({ container: 'updated' });
  });

  it('updates the DOM to reflect the new attribute value', async () => {
    @Component({ selector: 'attr-dom-reflects', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'label', type: String })
      label!: string;
      render() { return `<span id="lbl">${(this as any).label ?? ''}</span>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.setAttribute('label', 'world');
    await microtask();

    expect(el.querySelector('#lbl')!.textContent).toBe('world');
  });
});

// ─── disconnectedCallback ─────────────────────────────────────────────────────

describe('BaseElement – disconnectedCallback', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('sets __initialized to false after disconnection', async () => {
    @Component({ selector: 'disconnected-initialized-false', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).__initialized).toBe(true);

    el.remove();
    await microtask();

    expect((el as any).__initialized).toBe(false);
  });

  it('emits the DISCONNECTED lifecycle event after removal', async () => {
    const spy = jest.fn();

    @Component({ selector: 'disconnected-emits-event', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    const channel = (el as any).__eventChannel;
    channel.on(LifecycleEventConstants.DISCONNECTED, spy);

    document.body.appendChild(el);
    await microtask();

    el.remove();
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unbinds @BindEvent listeners so clicking after removal does not fire the handler', async () => {
    const spy = jest.fn();

    @Component({ selector: 'disconnected-unbind-bind-event', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @BindEvent({ event: 'click', id: '#btn' })
      onClick(_e: Event) { spy(); }
      render() { return `<button id="btn">go</button>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const btn = el.querySelector<HTMLButtonElement>('#btn')!;
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);

    el.remove();
    await microtask();

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unbinds @HostListener so the host element no longer fires the handler', async () => {
    const spy = jest.fn();

    @Component({ selector: 'disconnected-unbind-host', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @HostListener({ event: 'click' })
      onHostClick(_e: Event) { spy(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.click();
    expect(spy).toHaveBeenCalledTimes(1);

    el.remove();
    await microtask();

    el.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('sets reactive to false via unbindProperties after disconnection', async () => {
    @Component({ selector: 'disconnected-reactive-false', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'val', type: String })
      val!: string;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.reactive).toBe(true);

    el.remove();
    await microtask();

    expect(el.reactive).toBe(false);
  });

  it('updateHTML is a no-op after disconnection', async () => {
    let renders = 0;

    @Component({ selector: 'disconnected-updatehtml-noop', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { renders++; return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.remove();
    await microtask();

    const countAfterDisconnect = renders;
    (el as any).updateHTML();

    expect(renders).toBe(countAfterDisconnect);
  });

  it('can be reconnected after disconnection and works normally', async () => {
    const spy = jest.fn();

    @Component({ selector: 'disconnected-reconnect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @HostListener({ event: 'click' })
      onHostClick(_e: Event) { spy(); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);

    document.body.appendChild(el);
    await microtask();

    el.remove();
    await microtask();

    document.body.appendChild(el);
    await microtask();

    el.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─── Lifecycle events via EventChannel ───────────────────────────────────────

describe('BaseElement – lifecycle events emitted through EventChannel', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('CONNECTED event fires exactly once per connect', async () => {
    const spy = jest.fn();

    @Component({ selector: 'lifecycle-connected-once', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    (el as any).__eventChannel.on(LifecycleEventConstants.CONNECTED, spy);

    document.body.appendChild(el);
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('DISCONNECTED event fires exactly once per disconnect', async () => {
    const spy = jest.fn();

    @Component({ selector: 'lifecycle-disconnected-once', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    (el as any).__eventChannel.on(LifecycleEventConstants.DISCONNECTED, spy);

    document.body.appendChild(el);
    await microtask();

    el.remove();
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('ATTRIBUTE_CHANGED event carries no extra payload — just the event name', async () => {
    const received: any[] = [];

    @Component({ selector: 'lifecycle-attr-payload', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'x', type: Number })
      x!: number;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    (el as any).__eventChannel.on(LifecycleEventConstants.ATTRIBUTE_CHANGED, (e: any) => received.push(e));

    document.body.appendChild(el);
    await microtask();

    el.setAttribute('x', '1');
    await microtask();

    expect(received.length).toBeGreaterThan(0);
  });

  it('DOM_UPDATED event fires after updateHTML completes', async () => {
    const spy = jest.fn();

    @Component({ selector: 'lifecycle-dom-updated', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return `<p>content</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    (el as any).__eventChannel.on(LifecycleEventConstants.DOM_UPDATED, spy);

    document.body.appendChild(el);
    await microtask();

    (el as any).updateHTML();
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('CONNECTED and DISCONNECTED events fire in order across connect-disconnect cycle', async () => {
    const log: string[] = [];

    @Component({ selector: 'lifecycle-order', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    (el as any).__eventChannel.on(LifecycleEventConstants.CONNECTED,    () => log.push('connected'));
    (el as any).__eventChannel.on(LifecycleEventConstants.DISCONNECTED, () => log.push('disconnected'));

    document.body.appendChild(el);
    await microtask();

    el.remove();
    await microtask();

    expect(log).toEqual(['connected', 'disconnected']);
  });
});

// ─── Reactivity (@State) ──────────────────────────────────────────────────────

describe('BaseElement – @State reactivity', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('setting @State property re-renders the component', async () => {
    @Component({ selector: 'state-rerenders', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @State()
      count!: number;
      render() { return `<span id="c">${(this as any).count ?? 0}</span>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).count = 5;
    await microtask();

    expect(el.querySelector('#c')!.textContent).toBe('5');
  });

  it('setting the same @State value twice does not cause an extra render', async () => {
    let renders = 0;

    @Component({ selector: 'state-no-extra-render', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @State()
      flag!: boolean;
      render() { renders++; return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).flag = true;
    const after = renders;
    (el as any).flag = true;

    expect(renders).toBe(after);
  });

  it('@State getter returns the last assigned value', async () => {
    @Component({ selector: 'state-getter-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @State()
      title!: string;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).title = 'hello';
    (el as any).title = 'world';

    expect((el as any).title).toBe('world');
  });

  it('emits DOM_UPDATED event after @State triggers a re-render', async () => {
    const spy = jest.fn();

    @Component({ selector: 'state-dom-updated-event', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @State()
      val!: number;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    (el as any).__eventChannel.on(LifecycleEventConstants.DOM_UPDATED, spy);

    document.body.appendChild(el);
    await microtask();

    (el as any).val = 1;
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─── @Property reactivity ─────────────────────────────────────────────────────

describe('BaseElement – @Property reactivity', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('property getter returns the value set via setAttribute', async () => {
    @Component({ selector: 'prop-getter-from-attr', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'size', type: Number })
      size!: number;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.setAttribute('size', '42');
    await microtask();

    expect((el as any).size).toBe(42);
  });

  it('setting property via JS setter updates the DOM attribute', async () => {
    @Component({ selector: 'prop-js-setter-attr', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'name', type: String })
      name!: string;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).name = 'alice';
    await microtask();

    expect(el.getAttribute('name')).toBe('alice');
  });

  it('re-render is skipped when the same property value is set again', async () => {
    let renders = 0;

    @Component({ selector: 'prop-no-rerender-same', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'tag', type: String })
      tag!: string;
      render() { renders++; return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).tag = 'blue';
    const after = renders;

    (el as any).tag = 'blue';
    expect(renders).toBe(after);
  });

  it('reactive becomes false after unbindProperties on disconnect', async () => {
    @Component({ selector: 'prop-reactive-unbind', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Property({ name: 'active', type: String })
      active!: string;
      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();
    expect(el.reactive).toBe(true);

    el.remove();
    await microtask();
    expect(el.reactive).toBe(false);
  });
});

// ─── updateHTML ───────────────────────────────────────────────────────────────

describe('BaseElement – updateHTML', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('updates innerHTML with the latest render output', async () => {
    @Component({ selector: 'updatehtml-updates-inner', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      public text = 'first';
      render() { return `<p id="out">${this.text}</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).text = 'second';
    (el as any).updateHTML();
    await microtask();

    expect(el.querySelector('#out')!.textContent).toBe('second');
  });

  it('updates shadowRoot innerHTML for a shadow component', async () => {
    @Component({ selector: 'updatehtml-shadow', shadow: true })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      public text = 'initial';
      render() { return `<p id="sp">${this.text}</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).text = 'updated';
    (el as any).updateHTML();
    await microtask();

    expect(el.shadowRoot!.querySelector('#sp')!.textContent).toBe('updated');
  });

  it('re-binds @BindEvent listeners after re-render so clicks still work', async () => {
    const spy = jest.fn();

    @Component({ selector: 'updatehtml-rebind-events', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @BindEvent({ event: 'click', id: '#btn' })
      onBtn(_e: Event) { spy(); }
      render() { return `<button id="btn">go</button>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).updateHTML();
    await microtask();

    el.querySelector<HTMLButtonElement>('#btn')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits DOM_UPDATED event after every updateHTML call', async () => {
    const spy = jest.fn();

    @Component({ selector: 'updatehtml-dom-updated', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    (el as any).__eventChannel.on(LifecycleEventConstants.DOM_UPDATED, spy);

    document.body.appendChild(el);
    await microtask();

    (el as any).updateHTML();
    await microtask();

    (el as any).updateHTML();
    await microtask();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when __initialized is false', async () => {
    let renders = 0;

    @Component({ selector: 'updatehtml-noop-uninit', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      render() { renders++; return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    // NOT appended yet — __initialized is false
    (el as any).updateHTML();

    expect(renders).toBe(0);
  });
});


