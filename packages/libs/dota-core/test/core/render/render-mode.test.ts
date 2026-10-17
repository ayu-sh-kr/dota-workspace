import 'reflect-metadata';
import {render as mountRender} from '@ayu-sh-kr/dota-rendering';
import {
  BaseElement,
  CLIENT_ONLY_ATTRIBUTE,
  Component,
  isServerRender,
  resolveComponentRenderMode,
  resolveRouteRenderMode,
  setMountStrategy,
  setServerRender,
  type MountStrategy
} from '@dota/core';
import {defineAndCreate, microtask} from '../../Utils';

const mountStrategy = vi.fn<MountStrategy>((_host, root, output) => mountRender(root, output));
setMountStrategy(mountStrategy);

@Component({selector: 'client-only-widget', shadow: false, mode: 'csr'})
class ClientOnlyWidget extends BaseElement {
  constructor() { super(); }
  render() {
    return '<p>browser only</p>';
  }
}

@Component({selector: 'inherited-widget', shadow: false})
class InheritedWidget extends BaseElement {
  constructor() { super(); }
  render() {
    return '<p>everywhere</p>';
  }
}

afterEach(() => {
  setServerRender(false);
  mountStrategy.mockClear();
  document.body.replaceChildren();
});

describe('resolveRouteRenderMode', () => {
  it('prefers an explicit mode and maps the legacy ssr flag to ssg', () => {
    expect(resolveRouteRenderMode({mode: 'ssr', ssr: true})).toBe('ssr');
    expect(resolveRouteRenderMode({ssr: true})).toBe('ssg');
    expect(resolveRouteRenderMode({ssr: false})).toBe('csr');
    expect(resolveRouteRenderMode({})).toBe('csr');
  });
});

describe('resolveComponentRenderMode', () => {
  it('reads the decorator mode and defaults to inherit', () => {
    expect(resolveComponentRenderMode(ClientOnlyWidget)).toBe('csr');
    expect(resolveComponentRenderMode(InheritedWidget)).toBe('inherit');
  });
});

describe('server render flag', () => {
  it('is shared through a global symbol', () => {
    setServerRender(true);

    expect(isServerRender()).toBe(true);
    expect((globalThis as Record<symbol, unknown>)[Symbol.for('dota.core.server-render')]).toBe(true);
  });
});

describe('BaseElement render modes', () => {
  it('leaves a marked, empty host for client-only components during a server render', async () => {
    setServerRender(true);
    const {el} = defineAndCreate(ClientOnlyWidget);

    document.body.append(el);
    await microtask();
    el.updateHTML();

    expect(el.innerHTML).toBe('');
    expect(el.hasAttribute(CLIENT_ONLY_ATTRIBUTE)).toBe(true);
    expect(mountStrategy).not.toHaveBeenCalled();
  });

  it('mounts client-only components fresh in the browser without the hydration strategy', async () => {
    const el = document.createElement('client-only-widget');
    el.setAttribute(CLIENT_ONLY_ATTRIBUTE, '');

    document.body.append(el);
    await microtask();

    expect(el.textContent).toBe('browser only');
    expect(el.hasAttribute(CLIENT_ONLY_ATTRIBUTE)).toBe(false);
    expect(mountStrategy).not.toHaveBeenCalled();
  });

  it('keeps inheriting components on the installed strategy on both sides', async () => {
    setServerRender(true);
    const {el} = defineAndCreate(InheritedWidget);

    document.body.append(el);
    await microtask();

    expect(el.textContent).toBe('everywhere');
    expect(mountStrategy).toHaveBeenCalledOnce();
  });
});
