import 'reflect-metadata';
import {render as mountRender} from '@ayu-sh-kr/dota-rendering';
import {
  BaseElement,
  Component,
  resolveMountStrategy,
  setMountStrategy,
  type MountStrategy
} from '@dota/core';
import {defineAndCreate, microtask} from '../../Utils';

describe('component mount strategy', () => {
  it('uses the existing client renderer when no strategy is configured', async () => {
    @Component({selector: 'default-mount-strategy', shadow: false})
    class DefaultMountComponent extends BaseElement {
      constructor() { super(); }
      render() {
        return '<p>client content</p>';
      }
    }
    const {el} = defineAndCreate(DefaultMountComponent);

    document.body.append(el);
    await microtask();

    expect(el.textContent).toBe('client content');
  });

  it('reuses an existing shadow root before delegating the mount', async () => {
    @Component({selector: 'existing-shadow-mount', shadow: true})
    class ExistingShadowComponent extends BaseElement {
      constructor() { super(); }
      render() {
        return '<p>mounted</p>';
      }
    }
    const {el} = defineAndCreate(ExistingShadowComponent);
    const existingRoot = el.attachShadow({mode: 'open'});

    document.body.append(el);
    await microtask();

    expect(el.shadowRoot).toBe(existingRoot);
    expect(existingRoot.textContent).toBe('mounted');
  });

  it('delegates host, root, and output to one exclusive installed strategy', async () => {
    const strategy = vi.fn<MountStrategy>((_host, root, output) => mountRender(root, output));
    setMountStrategy(strategy);

    @Component({selector: 'injected-mount-strategy', shadow: false})
    class InjectedMountComponent extends BaseElement {
      constructor() { super(); }
      render() {
        return '<p>injected content</p>';
      }
    }
    const {el} = defineAndCreate(InjectedMountComponent);
    document.body.append(el);
    await microtask();

    expect(resolveMountStrategy()).toBe(strategy);
    expect(strategy).toHaveBeenCalledWith(el, el, '<p>injected content</p>');
    expect(() => setMountStrategy(strategy)).toThrow('a mount strategy is already registered');
  });
});
