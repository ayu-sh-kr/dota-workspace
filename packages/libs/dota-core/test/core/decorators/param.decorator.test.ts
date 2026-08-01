import 'reflect-metadata';
import { BaseElement, Component, HelperUtils } from '@dota/core';
import { Param } from '@dota/core/decorators/param.decorator.ts';
import { ParameterConfig } from '@dota/core/types';
import { defineAndCreate, microtask } from '../../Utils.ts';

function getParamMetadata(target: any): Map<string, ParameterConfig> {
  return HelperUtils.fetchOrCreate<ParameterConfig>(target, 'Param');
}

let urlSearchParamsSpy: {mockRestore: () => void} | undefined;

function setSearchParams(params: Record<string, string>): void {
  const real = new URLSearchParams(params);
  urlSearchParamsSpy = vi
    .spyOn(global, 'URLSearchParams')
    .mockImplementation(function () { return real; });
}

describe('@Param decorator – metadata registration', () => {

  it('stores the explicit param name and property key in metadata', () => {
    class Host {
      @Param('user-id')
      userId!: string;
    }

    const meta = getParamMetadata(new Host());
    const record = meta.get('userId');

    expect(record).toBeDefined();
    expect(record?.name).toBe('user-id');
  });

  it('falls back to the property key as the param name when none is provided', () => {
    class Host {
      @Param()
      token!: string;
    }

    const meta = getParamMetadata(new Host());
    const record = meta.get('token');

    expect(record).toBeDefined();
    expect(record?.name).toBe('token');
  });

  it('registers multiple params independently in the same metadata map', () => {
    class Host {
      @Param('page')
      page!: string;

      @Param('limit')
      limit!: string;

      @Param()
      sort!: string;
    }

    const meta = getParamMetadata(new Host());

    expect(meta.size).toBe(3);
    expect(meta.get('page')?.name).toBe('page');
    expect(meta.get('limit')?.name).toBe('limit');
    expect(meta.get('sort')?.name).toBe('sort');
  });

  it('uses the property key as the map entry key regardless of the param name override', () => {
    class Host {
      @Param('x-request-id')
      requestId!: string;
    }

    const meta = getParamMetadata(new Host());

    expect(meta.has('requestId')).toBe(true);
    expect(meta.has('x-request-id')).toBe(false);
  });

  it('does not share metadata between two sibling classes', () => {
    class HostA {
      @Param('alpha')
      alpha!: string;
    }

    class HostB {
      @Param('beta')
      beta!: string;
    }

    const metaA = getParamMetadata(new HostA());
    const metaB = getParamMetadata(new HostB());

    expect(metaA.has('alpha')).toBe(true);
    expect(metaA.has('beta')).toBe(false);
    expect(metaB.has('beta')).toBe(true);
    expect(metaB.has('alpha')).toBe(false);
  });
});

describe('@Param decorator – URL param binding on connectedCallback', () => {

  afterEach(() => {
    document.body.innerHTML = '';
    urlSearchParamsSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it('injects the URL param value into the component field on connect', async () => {
    setSearchParams({ 'user-id': '42' });

    @Component({ selector: 'param-basic-inject', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('user-id')
      userId!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).userId).toBe('42');
  });

  it('uses the property key as the query param name when no explicit name is given', async () => {
    setSearchParams({ token: 'abc-xyz' });

    @Component({ selector: 'param-implicit-name', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param()
      token!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).token).toBe('abc-xyz');
  });

  it('sets the field to null when the URL param is absent', async () => {
    setSearchParams({});

    @Component({ selector: 'param-missing-in-url', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('session')
      session!: string | null;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).session).toBeNull();
  });

  it('binds multiple params from the same URL independently', async () => {
    setSearchParams({ page: '3', limit: '20', sort: 'asc' });

    @Component({ selector: 'param-multiple-fields', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('page')
      page!: string;

      @Param('limit')
      limit!: string;

      @Param('sort')
      sort!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).page).toBe('3');
    expect((el as any).limit).toBe('20');
    expect((el as any).sort).toBe('asc');
  });

  it('picks up only the params relevant to the component and ignores unrelated ones', async () => {
    setSearchParams({ 'ref': 'footer', 'campaign': 'summer', 'tab': 'overview' });

    @Component({ selector: 'param-ignore-unrelated', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('tab')
      tab!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).tab).toBe('overview');
    expect((el as any).ref).toBeUndefined();
    expect((el as any).campaign).toBeUndefined();
  });

  it('preserves the raw string value without type coercion', async () => {
    setSearchParams({ count: '007', active: 'true' });

    @Component({ selector: 'param-raw-string-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('count')
      count!: string;

      @Param('active')
      active!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect(typeof (el as any).count).toBe('string');
    expect((el as any).count).toBe('007');
    expect(typeof (el as any).active).toBe('string');
    expect((el as any).active).toBe('true');
  });

  it('binds an empty-string param value when the key is present but has no value', async () => {
    setSearchParams({ filter: '' });

    @Component({ selector: 'param-empty-string-value', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('filter')
      filter!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).filter).toBe('');
  });

  it('sets all param fields to null when the URL has no query string', async () => {
    setSearchParams({});

    @Component({ selector: 'param-no-query-string', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('record-id')
      recordId!: string | null;

      @Param('active-view')
      activeView!: string | null;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).recordId).toBeNull();
    expect((el as any).activeView).toBeNull();
  });

  it('binds the param value to the field named differently from the URL key', async () => {
    setSearchParams({ 'x-correlation-id': 'req-999' });

    @Component({ selector: 'param-name-mismatch', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('x-correlation-id')
      correlationId!: string;

      render() { return ``; }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    expect((el as any).correlationId).toBe('req-999');
    expect((el as any)['x-correlation-id']).toBeUndefined();
  });

  it('does not re-bind params on subsequent renders triggered by state changes', async () => {
    setSearchParams({ mode: 'edit' });

    @Component({ selector: 'param-stable-across-renders', shadow: false })
    class TestComponent extends BaseElement {
      constructor() { super(); }

      @Param('mode')
      mode!: string;

      public renderCount = 0;

      render() {
        this.renderCount++;
        return `<span>${this.renderCount}</span>`;
      }
    }

    const { el } = defineAndCreate(TestComponent);
    document.body.appendChild(el);
    await microtask();

    const modeAfterConnect = (el as any).mode;

    // Force another render via innerHTML – params must not be wiped
    (el as any).innerHTML = (el as any).render();

    expect((el as any).mode).toBe(modeAfterConnect);
  });
});
