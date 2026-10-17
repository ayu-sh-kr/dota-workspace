/**
 * Where a route's HTML is produced.
 * `ssg` renders once at build time, `ssr` renders per request on a server, and
 * `csr` ships the application shell and renders only in the browser.
 */
export type RouteRenderMode = 'ssr' | 'ssg' | 'csr';

/**
 * Whether a component follows its page's render mode.
 * `inherit` renders wherever the page renders; `csr` opts the component out of
 * server output so it mounts only in the browser.
 */
export type ComponentRenderMode = 'inherit' | 'csr';

/** Route fields that decide its render mode, including the legacy `ssr` flag. */
export type RouteRenderModeSource = {
  /** Explicit render mode; takes precedence over `ssr`. */
  mode?: RouteRenderMode;
  /** Legacy build-time prerender opt-in, equivalent to `mode: 'ssg'`. */
  ssr?: boolean;
};

/** Attribute a server render writes on a client-only host it leaves empty. */
export const CLIENT_ONLY_ATTRIBUTE = 'data-dota-csr';

const SERVER_RENDER_FLAG = Symbol.for('dota.core.server-render');

/**
 * Resolves the render mode of a route declaration.
 * An explicit `mode` wins; otherwise the legacy `ssr: true` keeps its original
 * meaning of build-time prerendering, and every other route renders on the client.
 * @param route Route metadata as declared by `@Route` or generated route tables.
 */
export function resolveRouteRenderMode(route: RouteRenderModeSource): RouteRenderMode {
  return route.mode ?? (route.ssr === true ? 'ssg' : 'csr');
}

/**
 * Reads the render mode a component declared through `@Component({mode})`.
 * @param component Component class or instance; undecorated classes inherit.
 */
export function resolveComponentRenderMode(component: object): ComponentRenderMode {
  const constructor = (typeof component === 'function' ? component : component.constructor) as {__dotaMode?: ComponentRenderMode};
  return constructor.__dotaMode ?? 'inherit';
}

/**
 * Marks the current process as producing server HTML (SSG or SSR) or not.
 * The flag lives on a global symbol so every loaded copy of Dota Core, such as an
 * SSR module runner's and the host's, agrees on it.
 * @param enabled True while a server render is in progress.
 */
export function setServerRender(enabled: boolean): void {
  (globalThis as Record<symbol, unknown>)[SERVER_RENDER_FLAG] = enabled;
}

/** Reports whether components are currently rendering into server HTML. */
export function isServerRender(): boolean {
  return (globalThis as Record<symbol, unknown>)[SERVER_RENDER_FLAG] === true;
}
