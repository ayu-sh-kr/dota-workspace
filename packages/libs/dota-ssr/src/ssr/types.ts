import type {DotaElementConstructor, SEO} from '@ayu-sh-kr/dota-core';
import type {CapturedApplication} from '../application-capture';

/**
 * Request-scoped services a server render exposes to components.
 * Every page request receives a fresh context, so `state` never leaks between
 * visitors and `fetch` can resolve same-origin API paths without a browser.
 */
export interface RenderContext {
  /** Absolute URL of the page request being rendered. */
  readonly url: URL;
  /** Values captured by `:name` segments of the matched page route. */
  readonly params: Readonly<Record<string, string>>;
  /** Fetch whose relative inputs resolve against the request origin. */
  readonly fetch: typeof fetch;
  /** Per-request store shared by every component rendered for this page. */
  readonly state: Map<string, unknown>;
  /**
   * Sets the HTTP status of the page response; it defaults to 200. A `serverLoad` that finds
   * no data for the URL calls `setStatus(404)` and renders its not-found content, so crawlers
   * and caches see a real 404 on every deployment target. The last call wins.
   * @param status Integer from 200 to 599, the range a `Response` accepts.
   * @throws RangeError when the status is outside that range.
   */
  setStatus(status: number): void;
}

/**
 * Optional server hook a component implements to load data before it renders.
 * The engine awaits it once per instance; loaded values must be assigned to the
 * component so `render()` stays pure and `@Property` values reach the HTML.
 */
export interface ServerLoadable {
  /** Loads request data into the component before its single server render. */
  serverLoad?(context: RenderContext): void | Promise<void>;
}

/** HTML produced for one page, plus head metadata the document shell writes. */
export interface RenderResult {
  /** Serialized page host and its rendered descendants. */
  readonly html: string;
  /** Page metadata read from a `DotaPageElement`'s `seo` getter, when present. */
  readonly head?: SEO;
}

/**
 * Engine boundary between request orchestration and component rendering.
 * The string adapter is the default; an engine backed by a DOM implementation or
 * streaming output can replace it by honouring this contract.
 */
export interface RenderAdapter {
  /** Identifies the engine in diagnostics. */
  readonly name: string;
  /**
   * Renders the page registered under `selector` for one request.
   * @param selector Custom-element name of the page component.
   * @param context Request services handed to every component's `serverLoad`.
   * @throws Error when no component is registered for the selector.
   */
  render(selector: string, context: RenderContext): Promise<RenderResult>;
}

/** Options for the light-DOM string engine. */
export interface StringAdapterOptions {
  /** Components the engine may instantiate, keyed internally by their selectors. */
  readonly components: readonly DotaElementConstructor[];
  /** Nesting limit that stops self-including components; defaults to 32. */
  readonly maxDepth?: number;
  /**
   * Emits Dota Rendering's durable hydration markers and the page route marker, so a
   * client using `dotaHydration()` adopts the server DOM. Defaults to `true`; `false`
   * produces plain HTML that the client re-renders on upgrade.
   */
  readonly hydration?: boolean;
}

/** Maps a URL pattern such as `/users/:id` to the page component that renders it. */
export interface PageRoute {
  /** Path pattern; `:name` segments capture into `RenderContext.params`. */
  readonly path: string;
  /** Custom-element selector of the page component. */
  readonly page: string;
  /** Route-level head metadata, used when the page has no `seo` of its own. */
  readonly seo?: SEO;
}

/** Document shell, or a function returning it per request (Vite dev transforms it per URL). */
export type DocumentTemplate = string | ((url: URL) => string | Promise<string>);

/** Options for the request handler that orchestrates a page render. */
export interface RequestHandlerOptions {
  /** Engine that turns the matched page into HTML. */
  readonly adapter: RenderAdapter;
  /** Page routes checked in order; the first match wins. */
  readonly routes: readonly PageRoute[];
  /** Document shell containing the head and body outlet comments. */
  readonly template: DocumentTemplate;
  /** Fetch used for component requests; defaults to the global fetch. */
  readonly fetch?: typeof fetch;
  /**
   * Whether canonical page URLs end with a slash. When set, the other form of a page URL is
   * redirected (308) to it, as static hosts do for prerendered pages; when unset (the default)
   * both forms render.
   */
  readonly trailingSlash?: boolean;
  /**
   * `Cache-Control` sent with pages that render with status 200, such as
   * `'public, max-age=0, s-maxage=60, stale-while-revalidate=600'`. Off by default, so every
   * request renders; set it only for pages that do not vary by visitor.
   */
  readonly cacheControl?: string;
}

/** Answers a page request, or resolves `undefined` so the server can fall through. */
export type RequestHandler = (request: Request) => Promise<Response | undefined>;

/** Options for {@link ApplicationHandler}. */
export interface ApplicationHandlerOptions {
  /** Built `index.html` or a per-request shell; outlets are added when missing. */
  readonly template: DocumentTemplate;
  /** Fetch used for component requests; defaults to the global fetch. */
  readonly fetch?: typeof fetch;
  /** See {@link StringAdapterOptions.hydration}; defaults to `true`. */
  readonly hydration?: boolean;
  /** See {@link RequestHandlerOptions.trailingSlash}. */
  readonly trailingSlash?: boolean;
  /** See {@link RequestHandlerOptions.cacheControl}. */
  readonly cacheControl?: string;
}

/** Request handler for a whole application, plus access to the captured application. */
export type ApplicationHandler = RequestHandler & {
  /** Captures the application on first call and returns the same result afterwards. */
  readonly application: () => Promise<CapturedApplication>;
  /**
   * Whether a declared route of any render mode (or the default or error route) matches the
   * path, as Dota Router resolves it. Hosts answer other paths' fallback shell with 404.
   * A parent segment generated for nested routes, such as `/products` under
   * `/products/:product`, is not a route of its own.
   */
  readonly isKnownPath: (pathname: string) => Promise<boolean>;
};
