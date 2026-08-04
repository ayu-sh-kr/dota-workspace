import 'reflect-metadata';
import { BaseElement, Component, Property, HelperUtils } from '@dota/core';
import { Number, String, Boolean } from '@dota/core';
import { PropertyDetails } from '@dota/core/types';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getPropertyMetadata(target: any): Map<string, PropertyDetails> {
  return HelperUtils.fetchOrCreate<PropertyDetails>(target, 'Property');
}

describe('@Property decorator – metadata registration', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('stores the attribute name, prototype key and type in metadata', () => {
    class Host {
      @Property({ name: 'user-name', type: String })
      userName!: string;
    }

    const meta = getPropertyMetadata(new Host());
    const details = meta.get('user-name');

    expect(details).toBeDefined();
    expect(details?.name).toBe('user-name');
    expect(details?.prototype).toBe('userName');
    expect(details?.type).toBe(String);
  });

  it('stores the default value when one is provided', () => {
    class Host {
      @Property({ name: 'limit', default: '10', type: Number })
      limit!: number;
    }

    const details = getPropertyMetadata(new Host()).get('limit');
    expect(details?.default).toBe('10');
  });

  it('leaves the default value undefined when none is provided', () => {
    class Host {
      @Property({ name: 'title', type: String })
      title!: string;
    }

    const details = getPropertyMetadata(new Host()).get('title');
    expect(details?.default).toBeUndefined();
  });

  it('registers multiple properties independently in the same metadata map', () => {
    class Host {
      @Property({ name: 'first-name', type: String })
      firstName!: string;

      @Property({ name: 'age', type: Number })
      age!: number;

      @Property({ name: 'active', type: Boolean })
      active!: boolean;
    }

    const meta = getPropertyMetadata(new Host());

    expect(meta.size).toBe(3);
    expect(meta.get('first-name')?.prototype).toBe('firstName');
    expect(meta.get('age')?.prototype).toBe('age');
    expect(meta.get('active')?.prototype).toBe('active');
  });

  it('adds the attribute name to observedAttributes on the constructor', () => {
    class Host {
      @Property({ name: 'count', type: Number })
      count!: number;
    }

    expect((Host as any).observedAttributes).toContain('count');
  });

  it('does not share metadata between two sibling classes', () => {
    class HostA {
      @Property({ name: 'x', type: Number })
      x!: number;
    }

    class HostB {
      @Property({ name: 'y', type: Number })
      y!: number;
    }

    const metaA = getPropertyMetadata(new HostA());
    const metaB = getPropertyMetadata(new HostB());

    expect(metaA.has('x')).toBe(true);
    expect(metaA.has('y')).toBe(false);
    expect(metaB.has('y')).toBe(true);
    expect(metaB.has('x')).toBe(false);
  });
});

describe('@Property – runtime binding and attribute reflection', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('reflects the initial default value to the DOM attribute after connect', async () => {
    @Component({ selector: 'prop-default-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'duration', default: '500', type: Number })
      duration!: number;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.getAttribute('duration')).toBe('500');
    expect((el as any).duration).toBe(500);
  });

  it('reflects a JS-assigned initial value to the DOM attribute', async () => {
    @Component({ selector: 'prop-js-initial', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'label', type: String })
      label: string = 'hello';

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(el.getAttribute('label')).toBe('hello');
    expect((el as any).label).toBe('hello');
  });

  it('sets reactive flag to true after properties are bound', async () => {
    @Component({ selector: 'prop-reactive-flag', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'value', type: String })
      value!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).reactive).toBe(true);
  });

  it('updates the DOM attribute when the property is set programmatically', async () => {
    @Component({ selector: 'prop-programmatic-set', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'score', type: Number })
      score!: number;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).score = 99;

    expect(el.getAttribute('score')).toBe('99');
    expect((el as any).score).toBe(99);
  });

  it('updates the property when setAttribute is called on the element', async () => {
    @Component({ selector: 'prop-set-attribute', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'theme', type: String })
      theme!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    el.setAttribute('theme', 'dark');
    await microtask();

    expect((el as any).theme).toBe('dark');
  });

  it('coerces the attribute string to a Number type on property access', async () => {
    @Component({ selector: 'prop-number-coerce', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'max', type: Number })
      max!: number;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    el.setAttribute('max', '42');
    document.body.appendChild(el);
    await microtask();

    expect(typeof (el as any).max).toBe('number');
    expect((el as any).max).toBe(42);
  });

  it('coerces the attribute string to a Boolean type on property access', async () => {
    @Component({ selector: 'prop-boolean-coerce', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'visible', type: Boolean })
      visible!: boolean;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    el.setAttribute('visible', 'true');
    document.body.appendChild(el);
    await microtask();

    expect(typeof (el as any).visible).toBe('boolean');
    expect((el as any).visible).toBe(true);
  });

  it('HTML attribute value takes precedence over the JS default when both are present', async () => {
    @Component({ selector: 'prop-attr-over-default', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'size', default: '10', type: Number })
      size!: number;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    el.setAttribute('size', '99');
    document.body.appendChild(el);
    await microtask();

    expect((el as any).size).toBe(99);
  });

  it('does not re-render when the same value is assigned again', async () => {
    @Component({ selector: 'prop-no-rerender-same-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'tag', type: String })
      tag!: string;

      public renderCount = 0;

      render() {
        this.renderCount++;
        return ``;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).tag = 'blue';
    const countAfterFirstAssignment = (el as any).renderCount;

    (el as any).tag = 'blue';

    expect((el as any).renderCount).toBe(countAfterFirstAssignment);
  });

  it('removes the reactive accessor and restores a plain value after disconnect', async () => {
    @Component({ selector: 'prop-unbind-on-disconnect', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Property({ name: 'mode', type: String })
      mode!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).mode = 'edit';
    expect((el as any).mode).toBe('edit');

    el.remove();
    await microtask();

    expect((el as any).reactive).toBe(false);
  });
});

