import {afterEach, describe, expect, it, vi} from "vitest";
import {initializeApp, registerRoutes} from "../src";
import {RouteConfig} from "../src/router";
import {BaseElement, Component} from "../src/core";

vi.mock('@ayu-sh-kr/dota-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ayu-sh-kr/dota-core')>();
  return { ...actual, setMountStrategy: vi.fn() };
});

class AppRoot extends HTMLElement {}
class HomePage extends HTMLElement {}
class ErrorPage extends HTMLElement {}

const homeRoute: RouteConfig<HTMLElement> = {
  path: "/",
  component: HomePage,
  default: true
};
const errorRoute: RouteConfig<HTMLElement> = {
  path: "/error",
  component: ErrorPage
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("application router setup", () => {
  it("forwards global navigation hooks to the initialized router", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const beforeEach = vi.fn(() => true as const);
    const afterEach = vi.fn();
    const routerService = await registerRoutes(
      [HomePage],
      errorRoute,
      homeRoute,
      AppRoot,
      [homeRoute],
      {beforeEach: [beforeEach], afterEach: [afterEach]}
    );

    routerService.init();
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(beforeEach).toHaveBeenCalledWith(expect.objectContaining({
      nextMatch: expect.objectContaining({pathname: "/"})
    }));
    expect(afterEach).toHaveBeenCalledTimes(1);
  });

  it("forwards an extension-provided renderer through router construction", async () => {
    const renderer = vi.fn();
    const routerService = await registerRoutes(
      [HomePage],
      errorRoute,
      homeRoute,
      AppRoot,
      [homeRoute],
      undefined,
      renderer
    );

    expect(routerService.renderer).toBe(renderer);
  });

  it("runs runtime plugin setup before custom elements can connect", async () => {
    const order: string[] = [];

    @Component({selector: 'runtime-plugin-root', shadow: false})
    class RuntimeRoot extends BaseElement {
      constructor() { super(); }
      connectedCallback() {
        order.push('connected');
        super.connectedCallback();
      }
      render() { return ''; }
    }
    @Component({selector: 'runtime-plugin-home', shadow: false})
    class RuntimeHome extends BaseElement {
      constructor() { super(); }
      render() { return ''; }
    }
    @Component({selector: 'runtime-plugin-error', shadow: false})
    class RuntimeError extends BaseElement {
      constructor() { super(); }
      render() { return ''; }
    }
    const root = document.createElement('runtime-plugin-root');
    root.id = 'runtime-plugin-root';
    document.body.append(root);

    await initializeApp({
      modules: [RuntimeRoot, RuntimeHome, RuntimeError],
      routes: [
        {path: '/', component: RuntimeHome},
        {path: '/error', component: RuntimeError}
      ],
      defaultRoute: {path: '/', component: RuntimeHome},
      errorRoute: {path: '/error', component: RuntimeError},
      root: RuntimeRoot,
      plugins: [{
        name: 'order-test',
        setup() { order.push('setup'); }
      }]
    });

    expect(order.slice(0, 2)).toEqual(['setup', 'connected']);
  });

  it("defines a lazy page and what it renders before presenting it", async () => {
    @Component({selector: 'lazy-app-root', shadow: false})
    class LazyRoot extends BaseElement {
      constructor() { super(); }
      render() { return ''; }
    }
    @Component({selector: 'lazy-app-card', shadow: false})
    class LazyCard extends BaseElement {
      constructor() { super(); }
      render() { return 'card'; }
    }
    @Component({selector: 'lazy-app-home', shadow: false})
    class LazyHome extends BaseElement {
      constructor() { super(); }
      render() { return '<lazy-app-card></lazy-app-card>'; }
    }
    document.body.insertAdjacentHTML('beforeend', '<lazy-app-root id="lazy-app-root"></lazy-app-root>');
    const definedWhenRendered: boolean[] = [];

    await initializeApp({
      modules: [LazyRoot],
      lazyComponents: {
        loaders: {'lazy-app-home': async () => LazyHome, 'lazy-app-card': async () => LazyCard},
        dependencies: {'lazy-app-home': ['lazy-app-card']}
      },
      routes: [{path: '/', component: LazyHome}],
      defaultRoute: {path: '/', component: LazyHome},
      errorRoute: {path: '/error', component: LazyHome},
      root: LazyRoot,
      plugins: [{
        name: 'render-probe',
        setup(context) {
          context.wrapRouteRenderer(next => (match, navigation) => {
            definedWhenRendered.push(Boolean(customElements.get('lazy-app-home') && customElements.get('lazy-app-card')));
            return next(match, navigation);
          });
        }
      }]
    });

    expect(definedWhenRendered).toEqual([true]);
    await vi.waitFor(() => expect(document.querySelector('#lazy-app-root lazy-app-card')?.textContent).toContain('card'));
  });

  it("does not present a navigation that was superseded while its components loaded", async () => {
    const page = (selector: string) => {
      @Component({selector, shadow: false})
      class Page extends BaseElement {
        constructor() { super(); }
        render() { return selector; }
      }
      return Page;
    };
    const Root = page('race-app-root');
    const Home = page('race-app-home');
    const PageA = page('race-app-a');
    const PageB = page('race-app-b');
    document.body.insertAdjacentHTML('beforeend', '<race-app-root id="race-app-root"></race-app-root>');
    let releaseA!: () => void;
    const pageALoaded = new Promise<typeof PageA>(resolve => { releaseA = () => resolve(PageA); });
    const loadPageA = vi.fn(() => pageALoaded);
    const outlet = () => document.querySelector('#race-app-root')?.firstElementChild?.localName;

    const {routerService} = await initializeApp({
      modules: [Root],
      lazyComponents: {loaders: {
        'race-app-home': async () => Home,
        'race-app-a': loadPageA,
        'race-app-b': async () => PageB,
      }},
      routes: [{path: '/', component: Home}, {path: '/a', component: PageA}, {path: '/b', component: PageB}],
      defaultRoute: {path: '/', component: Home},
      errorRoute: {path: '/error', component: Home},
      root: Root,
    });

    routerService.route('/a');
    await vi.waitFor(() => expect(loadPageA).toHaveBeenCalled());
    routerService.route('/b');
    await vi.waitFor(() => expect(outlet()).toBe('race-app-b'));
    releaseA();
    await pageALoaded;
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(outlet()).toBe('race-app-b');
    expect(location.pathname).toBe('/b');
  });

  it("throws a clear diagnostic when two plugins both claim the mount strategy slot", async () => {
    const noop = () => ({} as any);
    const pluginA = {
      name: 'hydration-a',
      setup(ctx: any) { ctx.setMountStrategy(noop); }
    };
    const pluginB = {
      name: 'hydration-b',
      setup(ctx: any) { ctx.setMountStrategy(noop); }
    };

    await expect(
      initializeApp({
        modules: [],
        defaultRoute: { path: '/', component: class extends HTMLElement {} },
        errorRoute: { path: '/error', component: class extends HTMLElement {} },
        root: class extends HTMLElement {},
        plugins: [pluginA, pluginB]
      })
    ).rejects.toThrow(
      /two hydration-capable plugins both claim the exclusive mount strategy slot: "hydration-a".*"hydration-b"/
    );
  });
});
