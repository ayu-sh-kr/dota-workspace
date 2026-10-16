import type {DotaElementConstructor, SEO} from '@ayu-sh-kr/dota-core';

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
 * The string adapter is the default; an engine backed by a DOM implementation,
 * streaming output, or hydration markers can replace it by honouring this contract.
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
}

/** Maps a URL pattern such as `/users/:id` to the page component that renders it. */
export interface PageRoute {
  /** Path pattern; `:name` segments capture into `RenderContext.params`. */
  readonly path: string;
  /** Custom-element selector of the page component. */
  readonly page: string;
}

/** Options for the request handler that orchestrates a page render. */
export interface RequestHandlerOptions {
  /** Engine that turns the matched page into HTML. */
  readonly adapter: RenderAdapter;
  /** Page routes checked in order; the first match wins. */
  readonly routes: readonly PageRoute[];
  /** Document shell containing the head and body outlet comments. */
  readonly template: string;
  /** Fetch used for component requests; defaults to the global fetch. */
  readonly fetch?: typeof fetch;
}

/** Answers a page request, or resolves `undefined` so the server can fall through. */
export type RequestHandler = (request: Request) => Promise<Response | undefined>;
