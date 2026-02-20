import 'reflect-metadata';
import { BaseElement, Component, Property, State, Watcher, HelperUtils } from '@dota/core';
import { Number, String } from '@dota/core';
import { defineAndCreate, microtask } from '../../Utils.ts';

describe('@Watcher decorator – metadata registration', () => {

  it('stores watcher metadata under the correct property key', () => {
    class Host {
      @Property({ name: 'size', type: Number })
      size!: number;

      @Watcher('size')
      onSizeChange() {}
    }

    const meta = HelperUtils.fetchOrCreate<any>(new Host(), 'Watcher:size');
    expect(meta.has('onSizeChange')).toBe(true);
  });

  it('stores the method name and prototype reference', () => {
    class Host {
      @Property({ name: 'title', type: String })
      title!: string;

      @Watcher('title')
      onTitleChange() {}
    }

    const meta = HelperUtils.fetchOrCreate<any>(new Host(), 'Watcher:title');
    const record = meta.get('onTitleChange');

    expect(record?.name).toBe('onTitleChange');
    expect(typeof record?.method).toBe('function');
    expect(record?.value).toBe('title');
  });

  it('registers multiple watchers for the same property', () => {
    class Host {
      @Property({ name: 'count', type: Number })
      count!: number;

      @Watcher('count')
      logChange() {}

      @Watcher('count')
      analyticsChange() {}
    }

    const meta = HelperUtils.fetchOrCreate<any>(new Host(), 'Watcher:count');
    expect(meta.has('logChange')).toBe(true);
    expect(meta.has('analyticsChange')).toBe(true);
  });

  it('registers a watcher that watches multiple properties at once', () => {
    class Host {
      @Property({ name: 'width', type: Number })
      width!: number;

      @Property({ name: 'height', type: Number })
      height!: number;

      @Watcher(['width', 'height'])
      onDimensionsChange() {}
    }

    const widthMeta = HelperUtils.fetchOrCreate<any>(new Host(), 'Watcher:width');
    const heightMeta = HelperUtils.fetchOrCreate<any>(new Host(), 'Watcher:height');

    expect(widthMeta.has('onDimensionsChange')).toBe(true);
    expect(heightMeta.has('onDimensionsChange')).toBe(true);
  });
});

describe('@Watcher – invoked when @Property value changes', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('calls the watcher method when the watched property changes', async () => {
    const watcherSpy = jest.fn();

    @Component({ selector: 'watcher-property-change', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'qty', type: Number })
      qty!: number;

      @Watcher('qty')
      onQtyChange() {
        watcherSpy((this as any).qty);
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).qty = 5;

    expect(watcherSpy).toHaveBeenCalledTimes(1);
    expect(watcherSpy).toHaveBeenCalledWith(5);
  });

  it('calls the watcher with the correct updated value on each change', async () => {
    const received: number[] = [];

    @Component({ selector: 'watcher-tracks-all-changes', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'step', type: Number })
      step!: number;

      @Watcher('step')
      onStepChange() {
        received.push((this as any).step);
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).step = 1;
    (el as any).step = 2;
    (el as any).step = 3;

    expect(received).toEqual([1, 2, 3]);
  });

  it('does not call the watcher when the same value is assigned again', async () => {
    const watcherSpy = jest.fn();

    @Component({ selector: 'watcher-no-call-same-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'status', type: String })
      status!: string;

      @Watcher('status')
      onStatusChange() {
        watcherSpy();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).status = 'active';
    const callsAfterFirst = watcherSpy.mock.calls.length;

    (el as any).status = 'active';

    expect(watcherSpy.mock.calls.length).toBe(callsAfterFirst);
  });

  it('preserves the correct `this` context inside the watcher method', async () => {
    let capturedThis: any = undefined;

    @Component({ selector: 'watcher-correct-this', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      public id = 'my-component';

      @Property({ name: 'name', type: String })
      name!: string;

      @Watcher('name')
      onNameChange() {
        capturedThis = this;
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).name = 'Alice';

    expect(capturedThis).toBe(el);
    expect(capturedThis.id).toBe('my-component');
  });

  it('invokes all registered watchers for the same property', async () => {
    const spyA = jest.fn();
    const spyB = jest.fn();

    @Component({ selector: 'watcher-multiple-same-property', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'token', type: String })
      token!: string;

      @Watcher('token')
      watcherA() { spyA(); }

      @Watcher('token')
      watcherB() { spyB(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).token = 'abc123';

    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);
  });

  it('fires the watcher when the property is updated via setAttribute', async () => {
    const watcherSpy = jest.fn();

    @Component({ selector: 'watcher-via-set-attribute', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'color', type: String })
      color!: string;

      @Watcher('color')
      onColorChange() {
        watcherSpy((this as any).color);
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.setAttribute('color', 'red');
    await microtask();

    expect(watcherSpy).toHaveBeenCalledWith('red');
  });

  it('fires the watcher for each of its watched properties independently', async () => {
    const log: string[] = [];

    @Component({ selector: 'watcher-multi-property', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'width', type: Number })
      width!: number;

      @Property({ name: 'height', type: Number })
      height!: number;

      @Watcher(['width', 'height'])
      onDimensionChange() {
        log.push(`${(this as any).width}x${(this as any).height}`);
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).width = 100;
    (el as any).height = 200;

    expect(log).toHaveLength(2);
  });
});

describe('@Watcher – invoked when @State value changes', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('calls the watcher when the watched state property changes', async () => {
    const watcherSpy = jest.fn();

    @Component({ selector: 'watcher-on-state-change', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      items!: string[];

      @Watcher('items')
      onItemsChange() {
        watcherSpy((this as any).items);
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).items = ['a', 'b'];

    expect(watcherSpy).toHaveBeenCalledTimes(1);
    expect(watcherSpy).toHaveBeenCalledWith(['a', 'b']);
  });

  it('does not call the watcher when the same state value reference is reassigned', async () => {
    const watcherSpy = jest.fn();

    @Component({ selector: 'watcher-state-no-call-same-ref', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      flag!: boolean;

      @Watcher('flag')
      onFlagChange() {
        watcherSpy();
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).flag = true;
    const callsAfterFirst = watcherSpy.mock.calls.length;

    (el as any).flag = true;

    expect(watcherSpy.mock.calls.length).toBe(callsAfterFirst);
  });

  it('invokes the watcher with the correct `this` on state change', async () => {
    let capturedThis: any = undefined;

    @Component({ selector: 'watcher-state-this-context', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      public componentId = 'state-host';

      @State()
      value!: number;

      @Watcher('value')
      onValueChange() {
        capturedThis = this;
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).value = 42;

    expect(capturedThis).toBe(el);
    expect(capturedThis.componentId).toBe('state-host');
  });

  it('tracks each individual state change when updated multiple times', async () => {
    const snapshots: number[] = [];

    @Component({ selector: 'watcher-state-multiple-updates', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      counter!: number;

      @Watcher('counter')
      onCounterChange() {
        snapshots.push((this as any).counter);
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).counter = 10;
    (el as any).counter = 20;
    (el as any).counter = 30;

    expect(snapshots).toEqual([10, 20, 30]);
  });
});



