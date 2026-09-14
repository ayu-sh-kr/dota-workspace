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
  /** Existing JSON file, relative to the effective Vite root unless absolute; omission searches ancestors for `vercel.json`. */
  configFile?: string;
}

/**
 * Selects the hosting file format prepared after static generation, without deploying the application.
 * Vercel updates project JSON; Netlify/Cloudflare write `_redirects`; GitHub writes aliases and `.nojekyll`.
 */
export type DotaSsgDeploymentTarget = 'vercel' | 'netlify' | 'cloudflare-pages' | 'github-pages';

/**
 * Object form of `deployment`, allowing Vercel's existing configuration path to be overridden.
 * Other targets write into Vite's build directory and need only the target discriminator.
 */
export type DotaSsgDeploymentOptions =
  | ({target: 'vercel'} & DotaSsgVercelOptions)
  | {target: Exclude<DotaSsgDeploymentTarget, 'vercel'>};

/**
 * Configures the build-only Vite plugin that renders Dota routes inside happy-dom.
 * Route selection, application readiness, and deployment redirects remain opt-in so the
 * existing client-rendered application path is unchanged unless the plugin is installed.
 */
export interface DotaSsgOptions {
  /** Maximum isolated render workers; defaults to 1. Values above 1 require independent routes and no settle callback. */
  concurrency?: number;
  /** Worker startup, route/write, and shutdown timeout in milliseconds; defaults to 120000 in parallel mode. */
  renderTimeout?: number;
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
  /** Rendering module resolved from the consuming package; defaults to `@ayu-sh-kr/dota-rendering`. */
  renderingModule?: string;
  /** Name of the entry export awaited before serialization. Defaults to `applicationReady`. */
  readyExport?: string;
  /** Base URL used when a relative fetch misses the built public files and represents an API request. */
  fetchBaseUrl?: string;
  /** Built HTML shell relative to the output directory. Defaults to `index.html`. */
  template?: string;
  /** Optional application-specific barrier run after happy-dom's pending work has settled. */
  settle?: (window: Window, route: DotaSsgRoute) => void | Promise<void>;
  /**
   * Prepares one platform's files after rendering, including builds with no selected routes.
   * Accepts a target name or options object; false disables preparation even when `vercel` is set.
   * Omission uses the legacy `vercel` option, otherwise no hosting files are changed.
   */
  deployment?: DotaSsgDeploymentTarget | DotaSsgDeploymentOptions | false;
  /**
   * Backward-compatible Vercel option, used only when `deployment` is omitted.
   * True discovers the nearest ancestor `vercel.json`; an object overrides its path.
   * False or omission disables the fallback. Existing Vercel files must already exist.
   */
  vercel?: boolean | DotaSsgVercelOptions;
}

/**
 * Safe route-to-file mapping consumed by the prerender coordinator and deployment integrations.
 * It is produced only after route normalization validates that the output remains under Vite's build directory.
 */
export interface ResolvedDotaSsgRoute {
  /** Normalized absolute pathname without query or hash state. */
  path: string;
  /** Safe relative HTML output path below Vite's configured output directory. */
  output: string;
}
