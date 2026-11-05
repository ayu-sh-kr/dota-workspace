// @vitest-environment node
import {
  captureApplication,
  createApplicationHandler,
  resolveClientRoutes,
  resolveServerRoutes,
  type CapturedApplication
} from '@dota/ssr/index';
import {getApplicationCaptureHook} from '@dota/index';
import {FIXTURE_COMPONENTS, StateReaderComponent, TasksPage, TaskItemComponent} from '@test/ssr/string-adapter-fixtures';

const SHELL = '<!doctype html><html><head><title>Shell</title></head><body><app-shell id="app-shell"></app-shell></body></html>';

/** A root component, as `initializeApp({root})` receives it. */
class AppShell {
  static __dotaSelector = 'app-shell';
}

/** What a typical `initializeApp` call reports: nested routes in every render mode. */
const APPLICATION: CapturedApplication = {
  components: FIXTURE_COMPONENTS,
  routes: [
    {path: '/tasks', component: TasksPage, mode: 'ssr', children: [{path: ':id', component: TaskItemComponent, mode: 'ssr'}]},
    {path: '/state', component: StateReaderComponent, mode: 'ssr', seo: {title: 'State', description: ''}},
    {path: '/static', component: StateReaderComponent, mode: 'ssg'},
    {path: '/client', component: StateReaderComponent},
    {path: '/custom', component: StateReaderComponent, mode: 'ssr', render: () => undefined}
  ],
  errorRoute: {path: '/error', component: StateReaderComponent},
  defaultRoute: {path: '/', component: StateReaderComponent},
  root: AppShell as never
};

/** Stands in for an application entry: calling it is what `initializeApp` does on a server. */
const entryReporting = (application: CapturedApplication) => async () => {
  getApplicationCaptureHook()!(application);
};

describe('resolveServerRoutes', () => {
  it('selects ssr routes with flattened paths and skips custom renderers', () => {
    expect(resolveServerRoutes(APPLICATION)).toEqual([
      {path: '/tasks', page: 'tasks-page'},
      {path: '/tasks/:id', page: 'task-item'},
      {path: '/state', page: 'state-reader', seo: {title: 'State', description: ''}}
    ]);
  });
});

describe('resolveClientRoutes', () => {
  it('lists every declared path the server does not render, plus the default and error routes', () => {
    expect(resolveClientRoutes(APPLICATION)).toEqual(['/static', '/client', '/custom', '/', '/error']);
  });
});

describe('captureApplication', () => {
  it('returns what the entry reports and clears the hook afterwards', async () => {
    await expect(captureApplication(entryReporting(APPLICATION))).resolves.toBe(APPLICATION);
    expect(getApplicationCaptureHook()).toBeUndefined();
  });

  it('fails when the entry throws or never calls initializeApp', async () => {
    await expect(captureApplication(async () => { throw new Error('entry broke'); })).rejects.toThrow('entry broke');
    await expect(captureApplication(async () => undefined, 20)).rejects.toThrow('did not call initializeApp() within 20ms');
  });
});

describe('createApplicationHandler', () => {
  it('renders ssr routes into the shell, with the route seo as the head fallback', async () => {
    const handler = createApplicationHandler(entryReporting(APPLICATION), {template: SHELL, hydration: false});

    const response = await handler(new Request('http://localhost/state'));
    const html = await response!.text();

    expect(html).toBe('<!doctype html><html><head><title>State</title></head><body><app-shell id="app-shell"><state-reader seen="nobody"><p>nobody</p></state-reader></app-shell></body></html>');
  });

  it('knows every declared route in any mode, but not generated parents or unknown paths', async () => {
    const handler = createApplicationHandler(entryReporting({
      ...APPLICATION,
      routes: [...APPLICATION.routes, {path: '/products/:product/playground', component: StateReaderComponent, mode: 'ssr'}]
    }), {template: SHELL});

    for (const path of ['/', '/error', '/tasks/7/', '/static', '/client', '/custom', '/products/kit/playground']) {
      await expect(handler.isKnownPath(path)).resolves.toBe(true);
    }
    for (const path of ['/missing', '/tasks/7/extra', '/products', '/products/kit']) {
      await expect(handler.isKnownPath(path)).resolves.toBe(false);
    }
  });

  it('declines routes that are not server-rendered and captures only once', async () => {
    const load = vi.fn(entryReporting(APPLICATION));
    const handler = createApplicationHandler(load, {template: SHELL});

    expect(await handler(new Request('http://localhost/client'))).toBeUndefined();
    expect(await handler(new Request('http://localhost/static'))).toBeUndefined();
    expect(load).toHaveBeenCalledOnce();
  });
});
