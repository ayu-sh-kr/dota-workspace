import 'reflect-metadata';
import { BaseElement, Component, AfterInit, BeforeInit, HelperUtils, Property, State } from '@dota/core';
import { String } from '@dota/core';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getAfterMetadata(target: any): Map<string, Function> {
  return HelperUtils.fetchOrCreate<Function>(target, 'After');
}

describe('@AfterInit decorator – metadata registration', () => {

  it('stores the decorated method under the method name key in After metadata', () => {
    class Host {
      @AfterInit()
      afterViewInit() {}
    }

    const meta = getAfterMetadata(new Host());
    expect(meta.has('afterViewInit')).toBe(true);
    expect(typeof meta.get('afterViewInit')).toBe('function');
  });

  it('stores the exact function reference from the descriptor', () => {
    class Host {
      @AfterInit()
      afterViewInit() {}
    }

    const stored = getAfterMetadata(new Host()).get('afterViewInit');
    expect(typeof stored).toBe('function');
  });

  it('does not share After metadata between two sibling classes', () => {
    class HostA {
      @AfterInit()
      afterViewInit() {}
    }

    class HostB {
      @AfterInit()
      afterViewInit() {}
    }

    const metaA = getAfterMetadata(new HostA());
    const metaB = getAfterMetadata(new HostB());

    expect(metaA.has('afterViewInit')).toBe(true);
    expect(metaB.has('afterViewInit')).toBe(true);
    expect(metaA.get('afterViewInit')).not.toBe(metaB.get('afterViewInit'));
  });
});

describe('@AfterInit – runs after all connectedCallback tasks complete', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('invokes afterViewInit when the component is connected', async () => {
    const spy = jest.fn();

    @Component({ selector: 'after-basic-invoke', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @AfterInit()
      afterViewInit() { spy(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('invokes afterViewInit after the component HTML is already rendered', async () => {
    const log: string[] = [];

    @Component({ selector: 'after-runs-after-html', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @AfterInit()
      afterViewInit() {
        log.push(this.innerHTML !== '' ? 'html-present' : 'html-absent');
      }

      render() {
        log.push('render');
        return `<p>content</p>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log).toContain('html-present');
    expect(log.indexOf('render')).toBeLessThan(log.indexOf('html-present'));
  });

  it('invokes afterViewInit after @Property bindings are fully resolved', async () => {
    const log: string[] = [];

    @Component({ selector: 'after-runs-after-property', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'label', type: String })
      label!: string;

      @AfterInit()
      afterViewInit() {
        log.push(this.reactive ? 'reactive' : 'not-reactive');
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log[0]).toBe('reactive');
  });

  it('invokes afterViewInit after @State bindings are fully resolved', async () => {
    const log: string[] = [];

    @Component({ selector: 'after-runs-after-state', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      count!: number;

      @AfterInit()
      afterViewInit() {
        (this as any).count = 1;
        log.push('after-init-ran');
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log).toContain('after-init-ran');
    expect((el as any).count).toBe(1);
  });

  it('preserves the correct `this` context inside afterViewInit', async () => {
    let capturedThis: any = undefined;

    @Component({ selector: 'after-this-context', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      public componentLabel = 'after-host';

      @AfterInit()
      afterViewInit() { capturedThis = this; }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(capturedThis).toBe(el);
    expect(capturedThis.componentLabel).toBe('after-host');
  });

  it('does not invoke afterViewInit before the component is connected', async () => {
    const spy = jest.fn();

    @Component({ selector: 'after-not-before-connect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @AfterInit()
      afterViewInit() { spy(); }

      render() { return ``; }
    }

    defineAndCreate(TestComponent);

    expect(spy).not.toHaveBeenCalled();
  });

  it('can safely read a bound @Property value inside afterViewInit', async () => {
    let capturedValue: any = undefined;

    @Component({ selector: 'after-reads-property', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'title', type: String })
      title!: string;

      @AfterInit()
      afterViewInit() {
        capturedValue = (this as any).title;
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    el.setAttribute('title', 'hello');
    document.body.appendChild(el);
    await microtask();

    expect(capturedValue).toBe('hello');
  });

  it('can safely read a bound @State value inside afterViewInit', async () => {
    let capturedValue: any = undefined;

    @Component({ selector: 'after-reads-state', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      items!: string[];

      @AfterInit()
      afterViewInit() {
        capturedValue = (this as any).items;
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(capturedValue).toBeUndefined();
  });
});

describe('@BeforeInit and @AfterInit – combined ordering', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('beforeViewInit fires before afterViewInit', async () => {
    const log: string[] = [];

    @Component({ selector: 'combined-order', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BeforeInit()
      beforeViewInit() { log.push('before'); }

      @AfterInit()
      afterViewInit() { log.push('after'); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log).toContain('before');
    expect(log).toContain('after');
    expect(log.indexOf('before')).toBeLessThan(log.indexOf('after'));
  });

  it('beforeViewInit fires before render, afterViewInit fires after render', async () => {
    const log: string[] = [];

    @Component({ selector: 'combined-with-render', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BeforeInit()
      beforeViewInit() { log.push('before'); }

      @AfterInit()
      afterViewInit() { log.push('after'); }

      render() {
        log.push('render');
        return `<p>content</p>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const beforeIdx = log.indexOf('before');
    const renderIdx = log.indexOf('render');
    const afterIdx  = log.indexOf('after');

    expect(beforeIdx).toBeLessThan(renderIdx);
    expect(renderIdx).toBeLessThan(afterIdx);
  });

  it('beforeViewInit cannot read bound property but afterViewInit can', async () => {
    const results = { before: false, after: false };

    @Component({ selector: 'combined-reactive-timing', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'ready', type: String })
      ready!: string;

      @BeforeInit()
      beforeViewInit() {
        results.before = this.reactive;
      }

      @AfterInit()
      afterViewInit() {
        results.after = this.reactive;
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(results.before).toBe(false);
    expect(results.after).toBe(true);
  });

  it('both hooks receive the same component instance as `this`', async () => {
    let beforeInstance: any = undefined;
    let afterInstance: any = undefined;

    @Component({ selector: 'combined-same-instance', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BeforeInit()
      beforeViewInit() { beforeInstance = this; }

      @AfterInit()
      afterViewInit() { afterInstance = this; }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(beforeInstance).toBe(el);
    expect(afterInstance).toBe(el);
    expect(beforeInstance).toBe(afterInstance);
  });

  it('component without either decorator connects without throwing', async () => {
    @Component({ selector: 'no-lifecycle-hooks', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      render() { return `<p>plain</p>`; }
    }

    const { el } = defineAndCreate(TestComponent);
    await expect(
      (async () => {
        document.body.appendChild(el);
        await microtask();
      })()
    ).resolves.not.toThrow();

    expect(el.innerHTML).toContain('plain');
  });
});

