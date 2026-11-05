import type {LogType} from 'consola';
import type {ResolvedDotaSsgRoute} from '../../ssg/types';

/**
 * Where request-time rendering is deployed. Each target gets the files its platform
 * runs without further setup; `github-pages` is static-only, so `ssr` routes fall back
 * to client rendering there (with a warning).
 */
export type DotaServerTarget = 'node' | 'vercel' | 'netlify' | 'cloudflare-pages' | 'github-pages';

/**
 * Request-time rendering for routes declared `@Route({mode: 'ssr'})`.
 * Components and routes come from the application entry's `initializeApp`, so nothing
 * is listed twice. In `vite dev`, `ssr` routes are rendered by middleware; `vite build`
 * also produces a server for the deployment target. Builds without `ssr` routes skip it.
 */
export interface DotaSsrOptions {
  /** Application entry that calls `initializeApp`; defaults to `/src/main.ts`. */
  entry?: string;
  /** Vite root override; defaults to the resolved root. */
  root?: string;
  /** Built shell relative to the output directory; defaults to `index.html`. */
  template?: string;
  /**
   * Deployment target; defaults to the target static generation prepared in the same build,
   * else `node`. `false` builds nothing for the server.
   */
  deployment?: DotaServerTarget | false;
  /** `node` target output, relative to the root; defaults to `dist-server`. */
  serverOutDir?: string;
  /**
   * `vercel` target: the `vercel.json` receiving the SSR rewrites, relative to the root unless
   * absolute. Defaults to the file static generation updated, else the nearest ancestor
   * `vercel.json`, else a new one in the root, so SSG redirects and SSR rewrites share one file.
   */
  vercelConfigFile?: string;
  /** Emit hydration markers; defaults to `true`. */
  hydration?: boolean;
  /**
   * Whether canonical `ssr` page URLs end with a slash; the other form redirects (308) to it.
   * Defaults to the `trailingSlash` of `dotaSsg()` in the same build, so server-rendered and
   * prerendered pages share one URL form; without either, both forms render as before.
   * Cloudflare Pages and Netlify also route the slash form of literal routes to the server so
   * it can redirect. Vercel passes the route path to its function, so the policy does not apply there.
   */
  trailingSlash?: boolean;
  /**
   * Opt-in `Cache-Control` for `ssr` pages rendered with status 200 in built servers (never in
   * `vite dev`), such as `'public, max-age=0, s-maxage=60, stale-while-revalidate=600'`. CDNs
   * honouring `s-maxage` (Vercel, Netlify) then skip the function; on Cloudflare Pages the
   * worker answers repeat requests from the Cache API (custom domains only) without rendering.
   * Set it only when pages do not vary by visitor.
   */
  cacheControl?: string;
  /** Minimum log level; defaults to `info`. */
  logType?: LogType;
}

/** A built server and what the platform writers need to wire it up. */
export type ServerDeployment = {
  /** Vite root. */
  readonly root: string;
  /** Absolute client output directory (Vite `outDir`). */
  readonly outputDirectory: string;
  /** Absolute path of the self-contained server bundle. */
  readonly bundleFile: string;
  /** The built `index.html` before prerendering, served to `csr` routes by the Node target. */
  readonly shell: string;
  /** Router-style paths (`/tasks/:id`) of the `ssr` routes. */
  readonly routes: readonly string[];
  /** Pages static generation wrote in the same build; they stay static where `ssr` patterns cover them. */
  readonly staticRoutes: readonly ResolvedDotaSsgRoute[];
  /** Vite public base. */
  readonly base: string;
  /** Resolved plugin options. */
  readonly options: DotaSsrOptions;
};
