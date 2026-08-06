import type {Window} from 'happy-dom';
import type {LogType} from 'consola';

/**
 * Describes one application path selected for static generation.
 * The Vite plugin converts it into a `ResolvedDotaSsgRoute` before writing any output,
 * keeping user configuration separate from the safe filesystem mapping it produces.
 */
export interface DotaSsgRoute {
  /** Absolute application pathname rendered in the isolated build window. */
  path: string;
  /** Relative HTML file below Vite's output directory; defaults from the pathname. */
  output?: string;
}

/**
 * Accepts either a pathname shorthand or a route with an explicit output mapping.
 * Both forms enter the same normalizer, so their resulting route documents remain deterministic.
 */
export type DotaSsgRouteInput = string | DotaSsgRoute;

/**
 * Metadata emitted by the Dota Vite preloader without importing page component modules.
 * `dotaSsg({autoDetectRoutes: true})` uses it to select only routes that explicitly opt in.
 */
export type DotaDecoratedRoute = {
  /** Decorated application pathname considered by SSG route selection. */
  path: string;
  /** Enables inclusion only when exactly `true`; omitted routes remain client-rendered. */
  ssr?: boolean;
};

/**
 * Selects the Vercel configuration file updated for generated static documents.
 * It exists separately from SSG options because Vercel discovery is an optional deployment concern.
 */
export interface DotaSsgVercelOptions {
  /** Vercel configuration path, relative to the Vite root unless absolute. */
  configFile?: string;
}

/**
 * Configures the build-only Vite plugin that renders Dota routes inside happy-dom.
 * Route selection, application readiness, and deployment redirects remain opt-in so the
 * existing client-rendered application path is unchanged unless the plugin is installed.
 */
export interface DotaSsgOptions {
  /** Minimum verbosity for SSG and renderer diagnostics; defaults to `info`. */
  logType?: LogType;
  /** Explicit routes to prerender; they override matching decorated route outputs. */
  routes?: readonly DotaSsgRouteInput[];
  /** Reads preloader route metadata and prerenders only `@Route({ssr: true})` declarations. */
  autoDetectRoutes?: boolean;
  /** Vite root override; omission uses the resolved application root. */
  root?: string;
  /** Source application entry loaded in Vite's SSR module runner. Defaults to `/src/main.ts`. */
  entry?: string;
  /** Name of the entry export awaited before serialization. Defaults to `applicationReady`. */
  readyExport?: string;
  /** Built HTML shell relative to the output directory. Defaults to `index.html`. */
  template?: string;
  /** Optional application-specific barrier run after happy-dom's pending work has settled. */
  settle?: (window: Window, route: DotaSsgRoute) => void | Promise<void>;
  /** Enables generated-route redirects in the nearest Vercel configuration. */
  vercel?: boolean | DotaSsgVercelOptions;
}

/**
 * Safe route-to-file mapping consumed by the prerender coordinator and Vercel integration.
 * It is produced only after route normalization validates that the output remains under Vite's build directory.
 */
export interface ResolvedDotaSsgRoute {
  /** Normalized absolute pathname without query or hash state. */
  path: string;
  /** Safe relative HTML output path below Vite's configured output directory. */
  output: string;
}
