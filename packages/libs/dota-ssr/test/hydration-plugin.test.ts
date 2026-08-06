import 'reflect-metadata';
import type {MountStrategy} from '@ayu-sh-kr/dota-core';
import {
  HYDRATION_TEMPLATE_ATTRIBUTE,
  html,
  render,
  setHydrationEmit,
  update
} from '@ayu-sh-kr/dota-rendering';
import type {
  DotaRuntimeContext,
  RouteRendererWrapper
} from '@ayu-sh-kr/dota-wrap';
import type {
  NavigationContext,
  RouteMatch,
  RouteRenderer
} from '@ayu-sh-kr/dota-wrap/router';
import {dotaHydration, type DotaHydrationOptions} from '@dota/index';

type InstalledHydration = {
  mountStrategy: MountStrategy;
  routeWrapper: RouteRendererWrapper;
};

/** Captures plugin socket implementations without claiming Core's process-wide strategy slot. */
function installHydration(options?: DotaHydrationOptions): InstalledHydration {
  let mountStrategy!: MountStrategy;
  let routeWrapper!: RouteRendererWrapper;
  const context: DotaRuntimeContext = {
    setMountStrategy(strategy) { mountStrategy = strategy; },
    wrapRouteRenderer(wrapper) { routeWrapper = wrapper; }
  };
  dotaHydration(options).setup?.(context);
  return {mountStrategy, routeWrapper};
}

afterEach(() => {
  setHydrationEmit(false);
  document.body.innerHTML = '';
});

describe('dotaHydration', () => {
  it('adopts matching marked output and keeps server node identity', () => {
    const view = (label: string) => html`<p>${label}</p>`;
    const host = document.createElement('hydration-host');
    setHydrationEmit(true);
    render(host, view('server'));
    setHydrationEmit(false);
    const paragraph = host.querySelector('p');
    const replaceChildren = vi.spyOn(host, 'replaceChildren');
    const {mountStrategy} = installHydration();

    const instance = mountStrategy(host as never, host, view('server'));
    update(instance, view('client'));

    expect(replaceChildren).not.toHaveBeenCalled();
    expect(host.querySelector('p')).toBe(paragraph);
    expect(paragraph?.textContent).toBe('client');
  });

  it('recovers only the mismatched host by default and can throw instead', () => {
    const host = document.createElement('mismatch-host');
    setHydrationEmit(true);
    render(host, html`<p>${'server'}</p>`);
    setHydrationEmit(false);
    const replaceChildren = vi.spyOn(host, 'replaceChildren');

    installHydration().mountStrategy(host as never, host, html`<section>${'client'}</section>`);

    expect(replaceChildren).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe('client');
    expect(host.hasAttribute(HYDRATION_TEMPLATE_ATTRIBUTE)).toBe(false);

    const strictHost = document.createElement('strict-mismatch-host');
    setHydrationEmit(true);
    render(strictHost, html`<p>${'server'}</p>`);
    setHydrationEmit(false);
    expect(() => installHydration({mismatch: 'throw'}).mountStrategy(
      strictHost as never,
      strictHost,
      html`<section>${'client'}</section>`
    )).toThrow('Hydration mismatch on <strict-mismatch-host>');
  });

  it('skips only the initial route injection when the matching page is marked', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'hydration-route-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'hydration-route-page'}, Page);
    const root = document.createElement('hydration-route-root');
    root.id = 'hydration-route-root';
    root.innerHTML = `<hydration-route-page path="/" ${HYDRATION_TEMPLATE_ATTRIBUTE}="template"></hydration-route-page>`;
    document.body.append(root);

    const route = {path: '/', component: Page};
    const match: RouteMatch<HTMLElement> = {
      route,
      branch: [route],
      matched: true,
      params: {},
      pathname: '/',
      searchParams: new URLSearchParams(),
      hash: ''
    };
    const context: NavigationContext<HTMLElement> = {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/', window.location.origin),
      historyState: undefined
    };
    const next = vi.fn<RouteRenderer<HTMLElement>>();
    const {routeWrapper} = installHydration();
    const renderer = routeWrapper(next, Root);

    await renderer(match, context);
    await renderer(match, {...context, initial: false});

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('delegates an initial marked route when the route owns custom rendering', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'custom-render-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'custom-render-page'}, Page);
    const root = document.createElement('custom-render-root');
    root.id = 'custom-render-root';
    root.innerHTML = `<custom-render-page path="/" ${HYDRATION_TEMPLATE_ATTRIBUTE}="template"></custom-render-page>`;
    document.body.append(root);
    const route = {path: '/', component: Page, render: () => undefined};
    const match: RouteMatch<HTMLElement> = {
      route,
      branch: [route],
      matched: true,
      params: {},
      pathname: '/',
      searchParams: new URLSearchParams(),
      hash: ''
    };
    const next = vi.fn<RouteRenderer<HTMLElement>>();
    const renderer = installHydration().routeWrapper(next, Root);

    await renderer(match, {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/', window.location.origin),
      historyState: undefined
    });

    expect(next).toHaveBeenCalledWith(match, expect.objectContaining({initial: true}));
  });

  it('preserves both the marked outlet and page through the complete initial handoff', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'handoff-route-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'handoff-route-page'}, Page);
    const rootView = () => html``;
    const pageView = (label: string) => html`<article>${label}</article>`;
    const serverRoot = document.createElement('handoff-route-root');
    serverRoot.id = 'handoff-route-root';
    setHydrationEmit(true);
    render(serverRoot, rootView());
    serverRoot.innerHTML = '<handoff-route-page path="/"></handoff-route-page>';
    const serverPage = serverRoot.firstElementChild as HTMLElement;
    render(serverPage, pageView('server content'));

    const shell = document.createElement('div');
    shell.innerHTML = serverRoot.outerHTML;
    const clientRoot = shell.firstElementChild as HTMLElement;
    const clientPage = clientRoot.firstElementChild as HTMLElement;
    document.body.append(clientRoot);
    setHydrationEmit(false);
    const rootReplacement = vi.spyOn(clientRoot, 'replaceChildren');
    const pageReplacement = vi.spyOn(clientPage, 'replaceChildren');
    const {mountStrategy, routeWrapper} = installHydration();

    mountStrategy(clientRoot as never, clientRoot, rootView());
    mountStrategy(clientPage as never, clientPage, pageView('server content'));
    const route = {path: '/', component: Page};
    const match: RouteMatch<HTMLElement> = {
      route,
      branch: [route],
      matched: true,
      params: {},
      pathname: '/',
      searchParams: new URLSearchParams(),
      hash: ''
    };
    const next = vi.fn<RouteRenderer<HTMLElement>>();
    await routeWrapper(next, Root)(match, {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/', window.location.origin),
      historyState: undefined
    });

    expect(rootReplacement).not.toHaveBeenCalled();
    expect(pageReplacement).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(clientRoot.firstElementChild).toBe(clientPage);
    expect(clientPage.textContent).toBe('server content');
  });
});
