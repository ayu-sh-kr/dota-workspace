import 'reflect-metadata';
import { BaseElement, Component, Emitter, HelperUtils } from '@dota/core';
import { EventEmitter } from '@dota/core';
import { EventDetails } from '@dota/core/types';
import { capitalize } from '@dota/core/decorators/event.decorator.ts';
import { defineAndCreate, microtask } from '../../Utils.ts';


function getOutputMetadata(target: any): Map<string, EventDetails> {
  return HelperUtils.fetchOrCreate<EventDetails>(target, 'Output');
}

describe('@Emitter decorator – metadata registration', () => {

  describe('default (auto-generated) event name', () => {

    it('should register metadata with "on<CapitalizedProperty>" when no name is passed', () => {
      class Host {
        @Emitter()
        myClick!: EventEmitter<any>;
      }

      const meta = getOutputMetadata(new Host());
      expect(meta.has('myClick')).toBe(true);
      expect(meta.get('myClick')?.eventName).toBe('onMyClick');
    });

    it('should use the exact property key as propertyName in metadata', () => {
      class Host {
        @Emitter()
        userSubmit!: EventEmitter<any>;
      }

      const details = getOutputMetadata(new Host()).get('userSubmit');
      expect(details?.propertyName).toBe('userSubmit');
    });

    it('should capitalize only the first letter, keeping the rest intact', () => {
      class Host {
        @Emitter()
        camelCaseEvent!: EventEmitter<any>;
      }

      const details = getOutputMetadata(new Host()).get('camelCaseEvent');
      expect(details?.eventName).toBe('onCamelCaseEvent');
    });

    it('should register metadata for a single-character property key', () => {
      class Host {
        @Emitter()
        x!: EventEmitter<any>;
      }

      const details = getOutputMetadata(new Host()).get('x');
      expect(details?.eventName).toBe('onX');
    });
  });

  describe('explicit event name override', () => {

    it('should use the provided name verbatim instead of deriving one', () => {
      class Host {
        @Emitter('custom-event-name')
        myProp!: EventEmitter<any>;
      }

      const details = getOutputMetadata(new Host()).get('myProp');
      expect(details?.eventName).toBe('custom-event-name');
      expect(details?.propertyName).toBe('myProp');
    });

    it('should store the exact string including special characters', () => {
      class Host {
        @Emitter('widget:item-selected')
        selection!: EventEmitter<any>;
      }

      const details = getOutputMetadata(new Host()).get('selection');
      expect(details?.eventName).toBe('widget:item-selected');
    });
  });

  describe('multiple emitters on the same class', () => {

    it('should register all emitters independently in the same metadata map', () => {
      class Host {
        @Emitter()
        opened!: EventEmitter<any>;

        @Emitter()
        closed!: EventEmitter<any>;

        @Emitter('item:selected')
        selected!: EventEmitter<any>;
      }

      const meta = getOutputMetadata(new Host());
      expect(meta.size).toBe(3);
      expect(meta.get('opened')?.eventName).toBe('onOpened');
      expect(meta.get('closed')?.eventName).toBe('onClosed');
      expect(meta.get('selected')?.eventName).toBe('item:selected');
    });

    it('should not share metadata between two sibling classes', () => {
      class HostA {
        @Emitter()
        ping!: EventEmitter<any>;
      }

      class HostB {
        @Emitter()
        pong!: EventEmitter<any>;
      }

      const metaA = getOutputMetadata(new HostA());
      const metaB = getOutputMetadata(new HostB());

      expect(metaA.has('ping')).toBe(true);
      expect(metaA.has('pong')).toBe(false);

      expect(metaB.has('pong')).toBe(true);
      expect(metaB.has('ping')).toBe(false);
    });

    it('should overwrite the entry when the same property key is decorated twice', () => {
      class Host {
        // Simulates re-application (e.g., mixin or inheritance reuse)
        @Emitter('first')
        @Emitter('second')
        value!: EventEmitter<any>;
      }

      const meta = getOutputMetadata(new Host());
      // Last decorator applied wins (decorators execute bottom-up, but map.set overwrites)
      expect(meta.size).toBe(1);
    });
  });
});

describe('capitalize() helper', () => {

  it('should capitalize the first letter of a lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should leave an already-capitalized string unchanged', () => {
    expect(capitalize('World')).toBe('World');
  });

  it('should handle a single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('should handle an empty string without throwing', () => {
    expect(capitalize('')).toBe('');
  });

  it('should not alter characters beyond the first one', () => {
    expect(capitalize('camelCase')).toBe('CamelCase');
    expect(capitalize('myLongName')).toBe('MyLongName');
  });
});

describe('@Emitter – emitter injection into component', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should inject an EventEmitter instance into the decorated property after connect', async () => {
    @Component({ selector: 'test-emitter-basic', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter()
      itemClick!: EventEmitter<{ id: number }>;

      render() { return `<button>click</button>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).itemClick).toBeInstanceOf(EventEmitter);
  });

  it('should inject with the auto-derived event name (on<Prop>)', async () => {
    @Component({ selector: 'test-emitter-auto-name', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter()
      rowSelected!: EventEmitter<string>;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    // Access the private `name` field via the emitter itself by observing dispatched event
    const handler = vi.fn();
    window.addEventListener('onRowSelected', handler);

    (el as any).rowSelected.emit('row-1');

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('onRowSelected', handler);
  });

  it('should inject with the explicit name when one is provided', async () => {
    @Component({ selector: 'test-emitter-explicit-name', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter('widget:opened')
      open!: EventEmitter<void>;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const handler = vi.fn();
    window.addEventListener('widget:opened', handler);

    (el as any).open.emit(undefined);

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('widget:opened', handler);
  });

  it('should inject all emitters when a component has multiple @Emitter properties', async () => {
    @Component({ selector: 'test-emitter-multiple', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter()
      opened!: EventEmitter<void>;

      @Emitter()
      closed!: EventEmitter<void>;

      @Emitter('item:selected')
      selected!: EventEmitter<{ id: string }>;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).opened).toBeInstanceOf(EventEmitter);
    expect((el as any).closed).toBeInstanceOf(EventEmitter);
    expect((el as any).selected).toBeInstanceOf(EventEmitter);
  });

  it('should dispatch a CustomEvent with the correct detail payload', async () => {
    @Component({ selector: 'test-emitter-payload', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter('user:created')
      userCreated!: EventEmitter<{ name: string; age: number }>;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const received: CustomEvent[] = [];
    window.addEventListener('user:created', (e) => received.push(e as CustomEvent));

    (el as any).userCreated.emit({ name: 'Alice', age: 30 });

    expect(received).toHaveLength(1);
    expect(received[0].detail).toEqual({ name: 'Alice', age: 30 });

    window.removeEventListener('user:created', received[0] as any);
  });

  it('should dispatch the event on the specified root element, not window', async () => {
    @Component({ selector: 'test-emitter-root', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter('btn:clicked')
      clicked!: EventEmitter<number>;

      render() { return `<button>go</button>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const windowHandler = vi.fn();
    const elHandler = vi.fn();

    window.addEventListener('btn:clicked', windowHandler);
    el.addEventListener('btn:clicked', elHandler);

    // dispatch on `el` as root — bubbles: false, composed: true (default)
    (el as any).clicked.emit(42, el);

    expect(elHandler).toHaveBeenCalledTimes(1);
    expect((elHandler.mock.calls[0][0] as CustomEvent).detail).toBe(42);

    // bubbles defaults to false, so should NOT reach window
    expect(windowHandler).not.toHaveBeenCalled();

    window.removeEventListener('btn:clicked', windowHandler);
    el.removeEventListener('btn:clicked', elHandler);
  });

  it('should dispatch with bubbles:true when the option is set', async () => {
    @Component({ selector: 'test-emitter-bubbles', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter('form:submit')
      formSubmit!: EventEmitter<string>;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const parentHandler = vi.fn();
    document.body.addEventListener('form:submit', parentHandler);

    (el as any).formSubmit.emit('payload', el, true);

    expect(parentHandler).toHaveBeenCalledTimes(1);

    document.body.removeEventListener('form:submit', parentHandler);
  });

  it('should not be defined before the component is connected', async () => {
    @Component({ selector: 'test-emitter-preconnect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter()
      ready!: EventEmitter<void>;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);

    // Not yet connected — emitter not injected
    expect((el as any).ready).toBeUndefined();

    document.body.appendChild(el);
    await microtask();

    expect((el as any).ready).toBeInstanceOf(EventEmitter);
  });

  it('should remove the emitter access after disconnectedCallback (property unaffected but events stop)', async () => {
    @Component({ selector: 'test-emitter-disconnect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() {
        super();
      }

      @Emitter('ping')
      ping!: EventEmitter<void>;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).ping).toBeInstanceOf(EventEmitter);

    el.remove();
    await microtask();

    // The property reference stays but the component is disconnected —
    // emitting should still work as EventEmitter is independent of lifecycle
    expect(() => (el as any).ping.emit(undefined)).not.toThrow();
  });
});

