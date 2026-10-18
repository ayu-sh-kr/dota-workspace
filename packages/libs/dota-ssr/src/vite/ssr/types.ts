import type {LogType} from 'consola';

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
  /** Deployment target; defaults to the SSG `deployment`, else `node`. `false` builds nothing for the server. */
  deployment?: DotaServerTarget | false;
  /** `node` target output, relative to the root; defaults to `dist-server`. */
  serverOutDir?: string;
  /** Emit hydration markers; defaults to `true`. */
  hydration?: boolean;
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
  /** Vite public base. */
  readonly base: string;
  /** Resolved plugin options. */
  readonly options: DotaSsrOptions;
};
