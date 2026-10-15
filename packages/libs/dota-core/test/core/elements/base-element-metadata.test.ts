import 'reflect-metadata';
import {
  AfterInit,
  BaseElement,
  BeforeInit,
  BindEvent,
  Component,
  Property,
  PropertyUtils,
  Watcher,
} from '@dota/core';
import { Number, String } from '@dota/core';
import { defineAndCreate, microtask } from '../../Utils.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('BaseElement – inherited decorators', () => {

  it('applies a parent\'s properties, watchers, and bindings to a subclass', async () => {
    const watched = vi.fn();
    const clicked = vi.fn();

    abstract class Base extends BaseElement {
      @Property({ name: 'label', type: String, default: 'base' })
      label = 'base';

      @Watcher('label')
      onLabel() { watched(this.label); }

      @BindEvent({ event: 'click', id: '.action' })
      onAction() { clicked(); }
    }

    @Component({ selector: 'inherit-child-component', shadow: false })
    class Child extends Base {
      @Property({ name: 'count', type: Number, default: 0 })
      count = 0;

      constructor() {
        super();
      }

      render() { return `<button class="action">${this.label}:${this.count}</button>`; }
    }

    const { el } = defineAndCreate(Child);
    el.setAttribute('label', 'from-attr');
    document.body.appendChild(el);
    await microtask();

    expect(el.label).toBe('from-attr');
    el.label = 'changed';
    expect(watched).toHaveBeenCalledWith('changed');

    el.querySelector<HTMLButtonElement>('.action')!.click();
    expect(clicked).toHaveBeenCalledTimes(1);
    expect((Child as any).observedAttributes).toEqual(['label', 'count']);
  });

  it('runs a subclass override of a watcher method', async () => {
    const calls: string[] = [];

    abstract class Base extends BaseElement {
      @Property({ name: 'size', type: Number })
      size = 0;

      @Watcher('size')
      onSize() { calls.push('base'); }
    }

    @Component({ selector: 'inherit-watcher-override', shadow: false })
    class Child extends Base {
      constructor() {
        super();
      }

      onSize() { calls.push('child'); }
      render() { return ``; }
    }

    const { el } = defineAndCreate(Child);
    document.body.appendChild(el);
    await microtask();
    el.size = 3;

    expect(calls).toEqual(['child']);
  });
});

describe('BaseElement – init hooks', () => {

  it('runs hooks on any method name, base class first', async () => {
    const calls: string[] = [];

    abstract class Base extends BaseElement {
      @BeforeInit()
      prepare() { calls.push('before:base'); }
    }

    @Component({ selector: 'hooks-any-name', shadow: false })
    class Child extends Base {
      constructor() {
        super();
      }

      @BeforeInit()
      prepareChild() { calls.push('before:child'); }

      @AfterInit()
      ready() { calls.push('after'); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(Child);
    document.body.appendChild(el);
    await microtask();

    expect(calls).toEqual(['before:base', 'before:child', 'after']);
  });
});

describe('BaseElement – @BindEvent scope', () => {

  it('ignores a matching ancestor outside the component', async () => {
    const spy = vi.fn();

    @Component({ selector: 'bind-scope-inner', shadow: false })
    class Inner extends BaseElement {
      constructor() {
        super();
      }

      @BindEvent({ event: 'click', id: '.outer' })
      onOuter() { spy(); }

      render() { return `<span class="content">x</span>`; }
    }

    const outer = document.createElement('div');
    outer.className = 'outer';
    const { el } = defineAndCreate(Inner);
    outer.appendChild(el);
    document.body.appendChild(outer);
    await microtask();

    el.querySelector<HTMLSpanElement>('.content')!.click();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('PropertyUtils.unbindWatchers', () => {

  it('leaves the class\'s watchers working for other instances', async () => {
    const spy = vi.fn();

    @Component({ selector: 'unbind-watchers-shared', shadow: false })
    class Host extends BaseElement {
      @Property({ name: 'value', type: Number })
      value = 0;

      constructor() {
        super();
      }

      @Watcher('value')
      onValue() { spy(); }

      render() { return ``; }
    }

    const { el: first } = defineAndCreate(Host);
    const second = document.createElement('unbind-watchers-shared') as Host;
    document.body.append(first, second);
    await microtask();

    PropertyUtils.unbindWatchers(first, 'value');
    second.value = 1;
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('BaseElement – lifecycle timing', () => {

  it('runs @AfterInit on the second microtask after connection', async () => {
    const ready = vi.fn();

    @Component({ selector: 'timing-after-init', shadow: false })
    class Host extends BaseElement {
      constructor() {
        super();
      }

      @AfterInit()
      onReady() { ready(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(Host);
    document.body.appendChild(el);

    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('does not run @AfterInit when the element disconnects before it would run', async () => {
    const ready = vi.fn();

    @Component({ selector: 'timing-after-init-detached', shadow: false })
    class Host extends BaseElement {
      constructor() {
        super();
      }

      @AfterInit()
      onReady() { ready(); }

      render() { return ``; }
    }

    const { el } = defineAndCreate(Host);
    document.body.appendChild(el);
    el.remove();
    await microtask();
    await microtask();

    expect(ready).not.toHaveBeenCalled();
  });
});
