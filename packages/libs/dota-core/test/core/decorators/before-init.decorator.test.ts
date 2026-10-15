import 'reflect-metadata';
import {Metadata} from '@dota/metadata';
import {CoreMetadata} from '@dota/core/constants';
import { BaseElement, Component, BeforeInit, Property } from '@dota/core';
import { String } from '@dota/core';
import type { MethodDetails } from '@dota/core/types';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getBeforeMetadata(target: any): ReadonlyMap<string, MethodDetails> {
  return Metadata.for(target).own(CoreMetadata.beforeInit);
}

describe('@BeforeInit decorator – metadata registration', () => {

  it('stores the decorated method under the method name key in Before metadata', () => {
    class Host {
      @BeforeInit()
      beforeViewInit() {}
    }

    const meta = getBeforeMetadata(new Host());
    expect(meta.has('beforeViewInit')).toBe(true);
    expect(typeof meta.get('beforeViewInit')?.method).toBe('function');
  });

  it('stores the exact function reference from the descriptor', () => {
    function sentinel() {}

    class Host {
      @BeforeInit()
      beforeViewInit() { sentinel(); }
    }

    const stored = getBeforeMetadata(new Host()).get('beforeViewInit')?.method;
    expect(typeof stored).toBe('function');
  });

  it('does not share Before metadata between two sibling classes', () => {
    class HostA {
      @BeforeInit()
      beforeViewInit() {}
    }

    class HostB {
      @BeforeInit()
      beforeViewInit() {}
    }

    const metaA = getBeforeMetadata(new HostA());
    const metaB = getBeforeMetadata(new HostB());

    expect(metaA.has('beforeViewInit')).toBe(true);
    expect(metaB.has('beforeViewInit')).toBe(true);
    expect(metaA.get('beforeViewInit')?.method).not.toBe(metaB.get('beforeViewInit')?.method);
  });
});

describe('@BeforeInit – runs before connectedCallback tasks', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('invokes beforeViewInit when the component is connected', async () => {
    const spy = vi.fn();

    @Component({ selector: 'before-basic-invoke', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BeforeInit()
      beforeViewInit() { spy(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('invokes beforeViewInit before the component HTML is rendered into the DOM', async () => {
    const log: string[] = [];

    @Component({ selector: 'before-runs-before-html', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BeforeInit()
      beforeViewInit() {
        log.push(this.innerHTML === '' ? 'before-html' : 'after-html');
      }

      render() {
        log.push('render');
        return `<p>content</p>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log[0]).toBe('before-html');
    expect(log).toContain('render');
    expect(log.indexOf('before-html')).toBeLessThan(log.indexOf('render'));
  });

  it('invokes beforeViewInit before any @Property bindings are resolved', async () => {
    const log: string[] = [];

    @Component({ selector: 'before-runs-before-property', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'mode', type: String })
      mode!: string;

      @BeforeInit()
      beforeViewInit() {
        log.push(this.reactive ? 'reactive' : 'not-reactive');
      }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(log[0]).toBe('not-reactive');
  });

  it('preserves the correct `this` context inside beforeViewInit', async () => {
    let capturedThis: any = undefined;

    @Component({ selector: 'before-this-context', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      public componentLabel = 'before-host';

      @BeforeInit()
      beforeViewInit() { capturedThis = this; }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(capturedThis).toBe(el);
    expect(capturedThis.componentLabel).toBe('before-host');
  });

  it('is invoked each time the component is reconnected to the DOM', async () => {
    const spy = vi.fn();

    @Component({ selector: 'before-on-reconnect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BeforeInit()
      beforeViewInit() { spy(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);

    document.body.appendChild(el);
    await microtask();
    expect(spy).toHaveBeenCalledTimes(1);

    el.remove();
    await microtask();

    document.body.appendChild(el);
    await microtask();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not invoke beforeViewInit before the component is connected', async () => {
    const spy = vi.fn();

    @Component({ selector: 'before-not-before-connect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @BeforeInit()
      beforeViewInit() { spy(); }

      render() { return ``; }
    }

    defineAndCreate(TestComponent);

    expect(spy).not.toHaveBeenCalled();
  });
});

