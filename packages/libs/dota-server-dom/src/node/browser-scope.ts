import {AsyncLocalStorage} from 'node:async_hooks';
import {createUnmatchedMediaQuery, InertObserver, ServerHistory, ServerLocation, ServerStorage} from '../browser/browser-objects';
import {ServerStyleDeclaration} from '../dom/element-reflection';
import {ServerDocument} from '../dom/server-document';
import {ServerElement, ServerShadowRoot} from '../dom/server-element';
import {ServerDocumentFragment, ServerNode} from '../dom/server-node';

/**
 * A browser scope is the set of browser objects owned by one render: its document,
 * location, history, storage, and window event target. A browser has one set per tab; a
 * server renders many requests at once, so each render gets its own.
 *
 * The globals are installed once while any render runs and removed after the last one.
 * Request globals are getters that ask `AsyncLocalStorage` which scope the running code
 * belongs to; that answer survives `await`, so interleaved renders never see each other's objects.
 */
type BrowserScope = {
  readonly location: ServerLocation;
  readonly history: ServerHistory;
  readonly document: ServerDocument;
  readonly localStorage: ServerStorage;
  readonly sessionStorage: ServerStorage;
  /** Target behind the global `addEventListener`/`dispatchEvent`. */
  readonly windowEvents: EventTarget;
};

const scopes = new AsyncLocalStorage<BrowserScope>();
let activeRenderCount = 0;
/** Globals this module defined; removal never touches pre-existing ones. */
let ownedGlobalNames: string[] = [];
/** Answers request globals read outside any render (e.g. an old timer) while globals are installed. */
let outsideRenderScope: BrowserScope | undefined;
let lastFrameId = 0;
/** Node built-ins displaced while globals are installed, restored on removal. */
let displacedGlobals: [string, PropertyDescriptor][] = [];

/**
 * Node 25+ defines process-wide `localStorage` and `sessionStorage` accessors (the former is
 * `undefined` without `--localstorage-file`). They would leak storage between requests, so
 * renders shadow them; the getters are captured at load to tell them apart from Happy DOM's.
 */
const NODE_STORAGE_GETTERS = new Map(['localStorage', 'sessionStorage'].flatMap((name) => {
  const getter = Object.getOwnPropertyDescriptor(globalThis, name)?.get;
  return getter ? [[name, getter] as const] : [];
}));

/** Whether `name` is absent or is still Node's own process-wide storage accessor. */
function isInstallable(name: string): boolean {
  if (!(name in globalThis)) return true;
  const getter = NODE_STORAGE_GETTERS.get(name);
  return getter !== undefined && Object.getOwnPropertyDescriptor(globalThis, name)?.get === getter;
}

/** Globals whose value belongs to the current request; installed as getters. */
const REQUEST_GLOBALS: Record<string, (scope: BrowserScope) => unknown> = {
  document: (scope) => scope.document,
  location: (scope) => scope.location,
  history: (scope) => scope.history,
  localStorage: (scope) => scope.localStorage,
  sessionStorage: (scope) => scope.sessionStorage,
  addEventListener: (scope) => scope.windowEvents.addEventListener.bind(scope.windowEvents),
  removeEventListener: (scope) => scope.windowEvents.removeEventListener.bind(scope.windowEvents),
  dispatchEvent: (scope) => scope.windowEvents.dispatchEvent.bind(scope.windowEvents)
};

/** Globals with one value for every request: no viewport, APIs that never fire, and node classes for `instanceof`. */
const PROCESS_GLOBALS: Record<string, unknown> = {
  window: globalThis,
  matchMedia: (query: string) => createUnmatchedMediaQuery(String(query)),
  getComputedStyle: (element: unknown) => element instanceof ServerElement ? element.style : ServerStyleDeclaration.create(ServerElement.create('div')),
  requestAnimationFrame: () => ++lastFrameId,
  cancelAnimationFrame: () => {},
  scroll: () => {},
  scrollBy: () => {},
  scrollTo: () => {},
  innerWidth: 0,
  innerHeight: 0,
  outerWidth: 0,
  outerHeight: 0,
  scrollX: 0,
  scrollY: 0,
  devicePixelRatio: 1,
  MutationObserver: InertObserver,
  ResizeObserver: InertObserver,
  IntersectionObserver: InertObserver,
  Node: ServerNode,
  Element: ServerElement,
  ShadowRoot: ServerShadowRoot,
  DocumentFragment: ServerDocumentFragment,
  Document: ServerDocument
};

/**
 * Runs `task` (a render) in a fresh browser scope for `url`, installing the browser
 * globals for its duration. Existing globals, such as Happy DOM's, are never replaced.
 * Animation frame callbacks never run and media queries never match.
 * @returns The task's result.
 */
export async function runInBrowserScope<T>(url: URL, task: () => Promise<T>): Promise<T> {
  if (activeRenderCount++ === 0) installBrowserGlobals();
  try {
    return await scopes.run(createBrowserScope(url), task);
  } finally {
    if (--activeRenderCount === 0) removeBrowserGlobals();
  }
}

/** One location object backs both `location` and `document.location`, as in a browser. */
function createBrowserScope(url: URL): BrowserScope {
  const location = new ServerLocation(url);
  return {
    location,
    history: new ServerHistory(),
    document: new ServerDocument(location as unknown as Location),
    localStorage: new ServerStorage(),
    sessionStorage: new ServerStorage(),
    windowEvents: new EventTarget()
  };
}

/**
 * Defines the browser globals on `globalThis` when the first render starts.
 * Request globals become accessors: each read resolves the current render's scope through
 * `AsyncLocalStorage` (or the out-of-render scope), and writes are ignored, so assigning
 * `location` does nothing, like `location.assign`. Process globals become plain properties.
 * A name that already exists, from Happy DOM, Node, or the application, is skipped and never
 * replaced, except Node's process-wide storage, which is shadowed and later restored; every name defined is recorded in {@link ownedGlobalNames} for removal.
 */
function installBrowserGlobals(): void {
  for (const [name, read] of Object.entries(REQUEST_GLOBALS)) {
    if (!isInstallable(name)) continue;
    const displaced = Object.getOwnPropertyDescriptor(globalThis, name);
    if (displaced) displacedGlobals.push([name, displaced]);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => read(scopes.getStore() ?? (outsideRenderScope ??= createBrowserScope(new URL('http://localhost/')))),
      // Assigning `location` navigates in a browser; here it is ignored like `location.assign`.
      set: () => {}
    });
    ownedGlobalNames.push(name);
  }
  for (const [name, value] of Object.entries(PROCESS_GLOBALS)) {
    if (name in globalThis) continue;
    Object.defineProperty(globalThis, name, {configurable: true, writable: true, value});
    ownedGlobalNames.push(name);
  }
}

/**
 * Removes the browser globals when the last render ends, so code outside a render sees a
 * plain Node environment again (`typeof window === 'undefined'`). Only the names
 * {@link installBrowserGlobals} recorded are deleted, displaced Node storage is restored, and
 * the out-of-render scope is dropped so its document and storage do not outlive the renders.
 */
function removeBrowserGlobals(): void {
  ownedGlobalNames.forEach((name) => delete (globalThis as Record<string, unknown>)[name]);
  ownedGlobalNames = [];
  displacedGlobals.forEach(([name, descriptor]) => Object.defineProperty(globalThis, name, descriptor));
  displacedGlobals = [];
  outsideRenderScope = undefined;
}
