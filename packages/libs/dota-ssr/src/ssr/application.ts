import {CoreMetadata, Metadata, resolveRouteRenderMode, type DotaElementConstructor} from '@ayu-sh-kr/dota-core';
import type {RouteConfig} from '@ayu-sh-kr/dota-router';
import {runInBrowserScope} from '@ayu-sh-kr/dota-server-dom/node';
import {setApplicationCaptureHook, type CapturedApplication} from '../application-capture';
import {prepareDocumentShell} from './document';
import {createRequestHandler} from './request-handler';
import {createStringAdapter} from './string-adapter';
import type {ApplicationHandler, ApplicationHandlerOptions, PageRoute} from './types';

/** One route with the full path the router matches it at, produced by {@link flattenRoutes}. */
type FlatRoute = {
  /** Parent paths joined with the route's own, such as `/tasks/:id`. */
  readonly path: string;
  /** The route as declared, which supplies its component, mode, `seo`, and `render`. */
  readonly route: RouteConfig<HTMLElement>;
};

const DEFAULT_CAPTURE_TIMEOUT = 10_000;
/** Captures run one at a time, because the capture hook is one global slot. */
let captureQueue: Promise<unknown> = Promise.resolve();

/**
 * Loads an application entry on the server and returns what its `initializeApp` declares.
 * Dota Wrap's `initializeApp` sees the capture hook, reports its components and routes,
 * and never starts, so the entry runs exactly as written. The entry is loaded inside a
 * browser scope so module-level code that touches `window` or `document` still works.
 * @param loadEntry Imports the application entry, for example `() => import('/src/main.ts')`.
 * @param timeout Milliseconds to wait for `initializeApp`; defaults to 10000.
 * @throws Error when the entry fails to load or never calls `initializeApp`.
 */
export function captureApplication(loadEntry: () => Promise<unknown>, timeout = DEFAULT_CAPTURE_TIMEOUT): Promise<CapturedApplication> {
  const capture = captureQueue.then(() => runInBrowserScope(new URL('http://localhost/'), () =>
    new Promise<CapturedApplication>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`The application entry did not call initializeApp() within ${timeout}ms`)), timeout);
      setApplicationCaptureHook((application) => {
        clearTimeout(timer);
        resolve(application);
      });
      loadEntry().catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
    })
  )).finally(() => setApplicationCaptureHook(undefined));
  captureQueue = capture.catch(() => undefined);
  return capture;
}

/**
 * Page routes the server renders per request: every route whose mode resolves to `ssr`,
 * with nested routes flattened and custom `render` routes skipped (they have no page component).
 * @param application Captured application.
 */
export function resolveServerRoutes(application: CapturedApplication): PageRoute[] {
  return flattenRoutes(application.routes).flatMap(({path, route}) => {
    if (route.render || resolveRouteRenderMode(route) !== 'ssr') return [];
    const page = selectorOf(route.component);
    return page ? [{path, page, ...(route.seo ? {seo: route.seo} : {})}] : [];
  });
}

/**
 * Creates the request handler for an application, capturing it on first use.
 * Capture is lazy so platforms that forbid work at module load (Cloudflare Workers)
 * can import the handler; later requests reuse the same application. The document
 * shell gets head and body outlets automatically, the body one inside the root element.
 * @param loadEntry Imports the application entry.
 * @param options Document shell, fetch, and hydration settings.
 * @returns A handler answering `ssr` routes; other requests resolve `undefined`.
 */
export function createApplicationHandler(loadEntry: () => Promise<unknown>, options: ApplicationHandlerOptions): ApplicationHandler {
  let application: Promise<CapturedApplication> | undefined;
  let handler: Promise<(request: Request) => Promise<Response | undefined>> | undefined;
  const loadApplication = () => application ??= captureApplication(loadEntry).catch((error: unknown) => {
    application = undefined;
    throw error;
  });

  const handle = async (request: Request) => {
    handler ??= loadApplication().then((captured) => {
      const rootSelector = selectorOf(captured.root);
      if (!rootSelector) throw new Error('The application root component has no @Component selector');
      const components = captured.components.filter((component): component is DotaElementConstructor => !!component.__dotaSelector);
      return createRequestHandler({
        adapter: createStringAdapter({components, hydration: options.hydration}),
        routes: resolveServerRoutes(captured),
        template: async (url) => prepareDocumentShell(typeof options.template === 'string' ? options.template : await options.template(url), rootSelector),
        fetch: options.fetch
      });
    }).catch((error: unknown) => {
      handler = undefined;
      throw error;
    });
    return (await handler)(request);
  };
  return Object.assign(handle, {application: loadApplication});
}

/**
 * Flattens nested route configuration into one entry per route with its full path.
 * The router compiles `children` relative to their parent, so the server joins each child's
 * path to its parents', collapses duplicate slashes, and drops a trailing slash (except on
 * `/`) to produce the same paths the router matches.
 * @param routes Routes at one nesting level, as `initializeApp` declared them.
 * @param parent Full path of the enclosing route; empty at the top level.
 * @returns Every route paired with its full path, parents before their children.
 */
function flattenRoutes(routes: readonly RouteConfig<HTMLElement>[], parent = ''): FlatRoute[] {
  return routes.flatMap((route) => {
    const path = `${parent}/${route.path}`.replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
    return [{path, route}, ...flattenRoutes(route.children ?? [], path)];
  });
}

/**
 * Reads the custom-element name a page or root component renders as: its own `@Component`
 * metadata, or the `__dotaSelector` static Dota Core also stores. Classes without either are
 * not renderable pages and return `undefined`, which callers skip.
 * @param component Route or root component class.
 */
function selectorOf(component: unknown): string | undefined {
  if (typeof component !== 'function') return undefined;
  return Metadata.for(component).own(CoreMetadata.component)?.selector ?? (component as {__dotaSelector?: string}).__dotaSelector;
}
