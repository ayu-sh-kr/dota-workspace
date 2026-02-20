import 'reflect-metadata';
import { BaseElement, Component, State, HelperUtils } from '@dota/core';
import { StateConfig } from '@dota/core/types';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getStateMetadata(target: any): Map<string, StateConfig> {
  return HelperUtils.fetchOrCreate<StateConfig>(target, 'State');
}

describe('@State decorator – metadata registration', () => {

  it('stores the property key in State metadata', () => {
    class Host {
      @State()
      counter!: number;
    }

    const meta = getStateMetadata(new Host());
    expect(meta.has('counter')).toBe(true);
    expect(meta.get('counter')?.prototype).toBe('counter');
  });

  it('registers multiple state properties independently', () => {
    class Host {
      @State()
      loading!: boolean;

      @State()
      errorMessage!: string;

      @State()
      items!: any[];
    }

    const meta = getStateMetadata(new Host());
    expect(meta.size).toBe(3);
    expect(meta.get('loading')?.prototype).toBe('loading');
    expect(meta.get('errorMessage')?.prototype).toBe('errorMessage');
    expect(meta.get('items')?.prototype).toBe('items');
  });

  it('does not share state metadata between two sibling classes', () => {
    class HostA {
      @State()
      valueA!: string;
    }

    class HostB {
      @State()
      valueB!: string;
    }

    const metaA = getStateMetadata(new HostA());
    const metaB = getStateMetadata(new HostB());

    expect(metaA.has('valueA')).toBe(true);
    expect(metaA.has('valueB')).toBe(false);
    expect(metaB.has('valueB')).toBe(true);
    expect(metaB.has('valueA')).toBe(false);
  });
});

describe('@State – runtime reactive behaviour', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('returns the assigned value through the getter', async () => {
    @Component({ selector: 'state-getter', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      count!: number;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).count = 7;
    expect((el as any).count).toBe(7);
  });

  it('triggers a re-render when the state value changes', async () => {
    @Component({ selector: 'state-triggers-rerender', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      label!: string;

      public renderCount = 0;

      render() {
        this.renderCount++;
        return `<span>${(this as any).label ?? ''}</span>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const countAfterConnect = (el as any).renderCount;

    (el as any).label = 'first';
    (el as any).label = 'second';

    expect((el as any).renderCount).toBeGreaterThan(countAfterConnect);
  });

  it('does not re-render when the same state value is assigned again', async () => {
    @Component({ selector: 'state-no-rerender-same-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      active!: boolean;

      public renderCount = 0;

      render() {
        this.renderCount++;
        return ``;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).active = true;
    const countAfterFirstSet = (el as any).renderCount;

    (el as any).active = true;

    expect((el as any).renderCount).toBe(countAfterFirstSet);
  });

  it('keeps the latest value after multiple consecutive assignments', async () => {
    @Component({ selector: 'state-last-write-wins', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      page!: number;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).page = 1;
    (el as any).page = 2;
    (el as any).page = 3;

    expect((el as any).page).toBe(3);
  });

  it('renders the updated state value into the DOM', async () => {
    @Component({ selector: 'state-dom-reflects-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      message!: string;

      render() {
        return `<p id="msg">${(this as any).message ?? ''}</p>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    (el as any).message = 'hello world';
    await microtask();

    expect(el.querySelector('#msg')?.textContent).toBe('hello world');
  });

  it('supports independent state across two instances of the same component', async () => {
    @Component({ selector: 'state-per-instance', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @State()
      score!: number;

      render() { return ``; }
    }

    const a = document.createElement('state-per-instance') as any;
    const b = document.createElement('state-per-instance') as any;

    document.body.appendChild(a);
    document.body.appendChild(b);
    await microtask();

    a.score = 10;
    b.score = 20;

    expect(a.score).toBe(10);
    expect(b.score).toBe(20);
  });
});

