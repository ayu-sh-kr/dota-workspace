import 'reflect-metadata';
import type {MountStrategy} from '@ayu-sh-kr/dota-core';
import {
  HYDRATION_TEMPLATE_ATTRIBUTE,
  HYDRATION_VERSION_ATTRIBUTE,
  html,
  render,
  setHydrationEmit,
  update
} from '@ayu-sh-kr/dota-rendering';
import type {
  DotaRuntimeContext,
  RouteRendererWrapper
} from '@ayu-sh-kr/dota-runtime';
import type {
  NavigationContext,
  RouteMatch,
  RouteRenderer
} from '@ayu-sh-kr/dota-router';
import {
  dotaHydration,
  HYDRATION_ROUTE_ATTRIBUTE,
  HYDRATION_ROUTE_VERSION_ATTRIBUTE,
  type DotaHydrationOptions
} from '@dota/index';

type InstalledHydration = {
  /** Core mount hook installed by the hydration runtime plugin. */
  mountStrategy: MountStrategy;
  /** Router renderer decorator installed by the hydration runtime plugin. */
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
  vi.restoreAllMocks();
});

describe('dotaHydration', () => {
  it('registers Core mounting and route-presentation hooks during plugin setup', () => {
    const setMountStrategy = vi.fn();
    const wrapRouteRenderer = vi.fn();

    dotaHydration().setup?.({setMountStrategy, wrapRouteRenderer});

    expect(setMountStrategy).toHaveBeenCalledOnce();
    expect(setMountStrategy).toHaveBeenCalledWith(expect.any(Function));
    expect(wrapRouteRenderer).toHaveBeenCalledOnce();
    expect(wrapRouteRenderer).toHaveBeenCalledWith(expect.any(Function));
  });

  it('captures the route before the root mount and preserves its node identity', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'ordered-route-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'ordered-route-page'}, Page);

    const root = document.createElement('ordered-route-root');
    root.id = 'ordered-route-root';
    root.innerHTML = `<ordered-route-page path="/article" ${HYDRATION_ROUTE_ATTRIBUTE}="true" ${HYDRATION_ROUTE_VERSION_ATTRIBUTE}="1"></ordered-route-page>`;
    const page = root.firstElementChild as HTMLElement;
    document.body.append(root);

    let mountStrategy!: MountStrategy;
    let composedRenderer!: RouteRenderer<HTMLElement>;
    const context: DotaRuntimeContext = {
      setMountStrategy(strategy) { mountStrategy = strategy; },
      wrapRouteRenderer(wrapper) {
        composedRenderer = wrapper(vi.fn<RouteRenderer<HTMLElement>>(), Root);
      }
    };
    dotaHydration().setup?.(context);

    mountStrategy(root as never, root, html``);

    const route = {path: '/article', component: Page};
    const match: RouteMatch<HTMLElement> = {
      route,
      branch: [route],
      matched: true,
      params: {},
      pathname: '/article',
      searchParams: new URLSearchParams(),
      hash: ''
    };
    await composedRenderer(match, {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/article', window.location.origin),
      historyState: undefined
    });

    expect(root.firstElementChild).toBe(page);
    expect(page.getAttribute('path')).toBe('/article');
  });

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

  it('sets hydrated:true on the mount result only when server DOM is adopted', () => {
    const view = (label: string) => html`<p>${label}</p>`;
    const {mountStrategy} = installHydration();

    // Case 1: host has server markers → successful adoption → hydrated flag present
    const markedHost = document.createElement('hydrated-flag-host');
    setHydrationEmit(true);
    render(markedHost, view('server'));
    setHydrationEmit(false);
    const adoptedResult = mountStrategy(markedHost as never, markedHost, view('server'));
    expect(adoptedResult.hydrated).toBe(true);

    // Case 2: host has no markers → fresh mount → hydrated flag absent
    const freshHost = document.createElement('fresh-flag-host');
    const freshResult = mountStrategy(freshHost as never, freshHost, view('client'));
    expect(freshResult.hydrated).toBeUndefined();

    // Case 3: marker present but template mismatch → fallback fresh mount → hydrated flag absent
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const mismatchHost = document.createElement('mismatch-flag-host');
    setHydrationEmit(true);
    render(mismatchHost, html`<p>${'server'}</p>`);
    setHydrationEmit(false);
    const mismatchResult = mountStrategy(mismatchHost as never, mismatchHost, html`<section>${'client'}</section>`);
    expect(mismatchResult.hydrated).toBeUndefined();
  });

  it('recovers only the mismatched host by default and can throw instead', () => {
    const host = document.createElement('mismatch-host');
    setHydrationEmit(true);
    render(host, html`<p>${'server'}</p>`);
    setHydrationEmit(false);
    const replaceChildren = vi.spyOn(host, 'replaceChildren');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    installHydration().mountStrategy(host as never, host, html`<section>${'client'}</section>`);

    expect(replaceChildren).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledOnce();
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

  it('rejects version-one markers instead of adopting ambiguous local part indexes', () => {
    const view = () => html`<p>${'server'}</p>`;
    const host = document.createElement('version-one-host');
    setHydrationEmit(true);
    render(host, view());
    setHydrationEmit(false);
    host.setAttribute(HYDRATION_VERSION_ATTRIBUTE, '1');
    const replaceChildren = vi.spyOn(host, 'replaceChildren');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    installHydration().mountStrategy(host as never, host, view());

    expect(replaceChildren).toHaveBeenCalledOnce();
    expect(host.hasAttribute(HYDRATION_TEMPLATE_ATTRIBUTE)).toBe(false);
  });

  it('skips only the initial route injection when the matching page is marked', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'hydration-route-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'hydration-route-page'}, Page);
    const root = document.createElement('hydration-route-root');
    root.id = 'hydration-route-root';
    root.innerHTML = `<hydration-route-page path="/" ${HYDRATION_TEMPLATE_ATTRIBUTE}="template" ${HYDRATION_VERSION_ATTRIBUTE}="2"></hydration-route-page>`;
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

  it('applies route SEO when the initial marked page is adopted', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'seo-route-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'seo-route-page'}, Page);
    const root = document.createElement('seo-route-root');
    root.id = 'seo-route-root';
    root.innerHTML = `<seo-route-page path="/article" ${HYDRATION_ROUTE_ATTRIBUTE}="true" ${HYDRATION_ROUTE_VERSION_ATTRIBUTE}="1"></seo-route-page>`;
    document.body.append(root);

    const route = {
      path: '/article',
      component: Page,
      seo: {title: 'Article', description: 'Article description'}
    };
    const match: RouteMatch<HTMLElement> = {
      route,
      branch: [route],
      matched: true,
      params: {},
      pathname: '/article',
      searchParams: new URLSearchParams(),
      hash: ''
    };
    const renderer = installHydration().routeWrapper(vi.fn(), Root);

    await renderer(match, {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/article', window.location.origin),
      historyState: undefined
    });

    expect(document.title).toBe('Article');
  });

  it('delegates an initial marked route when the route owns custom rendering', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'custom-render-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'custom-render-page'}, Page);
    const root = document.createElement('custom-render-root');
    root.id = 'custom-render-root';
    root.innerHTML = `<custom-render-page path="/" ${HYDRATION_TEMPLATE_ATTRIBUTE}="template" ${HYDRATION_VERSION_ATTRIBUTE}="2"></custom-render-page>`;
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

  it('warns on a captured route that disagrees with the initial client match, then delegates to next', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'mismatched-route-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'mismatched-route-page'}, Page);
    const root = document.createElement('mismatched-route-root');
    root.id = 'mismatched-route-root';
    root.innerHTML = `<mismatched-route-page path="/article" ${HYDRATION_ROUTE_ATTRIBUTE}="true" ${HYDRATION_ROUTE_VERSION_ATTRIBUTE}="1"></mismatched-route-page>`;
    document.body.append(root);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const route = {path: '/other', component: Page};
    const match: RouteMatch<HTMLElement> = {
      route,
      branch: [route],
      matched: true,
      params: {},
      pathname: '/other',
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
      url: new URL('/other', window.location.origin),
      historyState: undefined
    });

    expect(warning).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws on a captured route mismatch when configured with the strict policy', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'strict-mismatched-route-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'strict-mismatched-route-page'}, Page);
    const root = document.createElement('strict-mismatched-route-root');
    root.id = 'strict-mismatched-route-root';
    root.innerHTML = `<strict-mismatched-route-page path="/article" ${HYDRATION_ROUTE_ATTRIBUTE}="true" ${HYDRATION_ROUTE_VERSION_ATTRIBUTE}="1"></strict-mismatched-route-page>`;
    document.body.append(root);

    const route = {path: '/other', component: Page};
    const match: RouteMatch<HTMLElement> = {
      route,
      branch: [route],
      matched: true,
      params: {},
      pathname: '/other',
      searchParams: new URLSearchParams(),
      hash: ''
    };
    const next = vi.fn<RouteRenderer<HTMLElement>>();
    const renderer = installHydration({mismatch: 'throw'}).routeWrapper(next, Root);
    const context: NavigationContext<HTMLElement> = {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/other', window.location.origin),
      historyState: undefined
    };

    expect(() => renderer(match, context)).toThrow('Route-marker hydration mismatch');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not report a mismatch when the route intentionally owns custom rendering', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'no-warn-custom-render-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'no-warn-custom-render-page'}, Page);
    const root = document.createElement('no-warn-custom-render-root');
    root.id = 'no-warn-custom-render-root';
    root.innerHTML = `<no-warn-custom-render-page path="/" ${HYDRATION_TEMPLATE_ATTRIBUTE}="template" ${HYDRATION_VERSION_ATTRIBUTE}="2"></no-warn-custom-render-page>`;
    document.body.append(root);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
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
    const renderer = installHydration().routeWrapper(vi.fn(), Root);

    await renderer(match, {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/', window.location.origin),
      historyState: undefined
    });

    expect(warning).not.toHaveBeenCalled();
  });

  it('does not silently accept a future template-marker version with no route marker', async () => {
    class Root extends HTMLElement {}
    class Page extends HTMLElement {}
    Reflect.defineMetadata('Component', {selector: 'future-marker-root'}, Root);
    Reflect.defineMetadata('Component', {selector: 'future-marker-page'}, Page);
    const root = document.createElement('future-marker-root');
    root.id = 'future-marker-root';
    // Simulates output from a future template-marker version bump that shipped
    // without a `data-dh-route` marker — the exact regression S3 closes.
    root.innerHTML = `<future-marker-page path="/" ${HYDRATION_TEMPLATE_ATTRIBUTE}="template" ${HYDRATION_VERSION_ATTRIBUTE}="3"></future-marker-page>`;
    document.body.append(root);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
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
    const renderer = installHydration().routeWrapper(next, Root);

    await renderer(match, {
      initial: true,
      nextMatch: match,
      signal: new AbortController().signal,
      params: {},
      url: new URL('/', window.location.origin),
      historyState: undefined
    });

    expect(warning).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });
});
