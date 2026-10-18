/**
 * Window-level stand-ins (`location`, `history`, storage, `matchMedia`, observers) that let
 * shared component code run on the server without `typeof window` guards. Each answers
 * reads with the request's truth or a neutral default and ignores writes and navigation
 * instead of throwing. Installed per render; see `browser-scope.ts`.
 */

/**
 * `location` for the request being rendered (`RenderContext.url`), also used as
 * `document.location`. Navigation is ignored: redirects belong in the request handler.
 */
export class ServerLocation {
  /** Private copy of the request URL, so later changes to the caller's `URL` cannot leak in. */
  readonly #url: URL;

  /** @param url Absolute URL of the request; it is copied. */
  constructor(url: URL) {
    this.#url = new URL(url);
  }

  /** Full URL, such as `https://example.com/docs?page=2`; the value `String(location)` gives. */
  get href(): string {
    return this.#url.href;
  }

  /** Scheme, host, and port, such as `https://example.com`; components use it to build absolute links. */
  get origin(): string {
    return this.#url.origin;
  }

  /** Scheme with its colon, such as `https:`. */
  get protocol(): string {
    return this.#url.protocol;
  }

  /** Host name with the port when it is not the default, such as `example.com:8080`. */
  get host(): string {
    return this.#url.host;
  }

  /** Host name without the port. */
  get hostname(): string {
    return this.#url.hostname;
  }

  /** Port, or `''` for the scheme's default port. */
  get port(): string {
    return this.#url.port;
  }

  /** Request path, such as `/docs/router`; the value pages most often branch on. */
  get pathname(): string {
    return this.#url.pathname;
  }

  /** Query string including `?`, or `''`; read it with `new URLSearchParams(location.search)`. */
  get search(): string {
    return this.#url.search;
  }

  /** Fragment including `#`. Browsers never send it to servers, so this is usually `''`. */
  get hash(): string {
    return this.#url.hash;
  }

  /** Always empty: a server render is not embedded in other browsing contexts. */
  get ancestorOrigins(): readonly string[] {
    return [];
  }

  /** Ignored: a render cannot move the visitor, and throwing would break code shared with the browser. */
  assign(_url: string | URL): void {}

  /** Ignored, for the same reason as {@link assign}. */
  replace(_url: string | URL): void {}

  /** Ignored: there is no page to reload on the server. */
  reload(): void {}

  /** The full URL, so `String(location)` and template literals work as in a browser. */
  toString(): string {
    return this.href;
  }
}

/**
 * `history` for one render: a single entry and no navigation. Routers and components
 * read its state or call `replaceState` during setup; on the server there is one page,
 * so reads return the initial state and every navigation method does nothing.
 */
export class ServerHistory {
  /** Always 1: the requested page is the only entry. */
  readonly length = 1;
  /** Always `null`: nothing has been pushed. */
  readonly state: unknown = null;
  /** Stored so assignments succeed; there is no scrolling to restore on the server. */
  scrollRestoration: ScrollRestoration = 'auto';

  /** Ignored: no entry is added, and `location` keeps the request URL. */
  pushState(_state: unknown, _unused: string, _url?: string | URL | null): void {}

  /** Ignored: the entry and `location` keep the request URL. */
  replaceState(_state: unknown, _unused: string, _url?: string | URL | null): void {}

  /** Ignored: there is no previous entry. */
  back(): void {}

  /** Ignored: there is no next entry. */
  forward(): void {}

  /** Ignored: there are no other entries. */
  go(_delta?: number): void {}
}

/**
 * `localStorage`/`sessionStorage` for one request: starts empty, so components render
 * their defaults, and is discarded afterwards, so values never reach another visitor.
 */
export class ServerStorage {
  /** Stored pairs in insertion order; keys and values are always strings, as in the Web Storage API. */
  readonly #items = new Map<string, string>();

  /** Number of keys stored during this request. */
  get length(): number {
    return this.#items.size;
  }

  /**
   * Key at a position, in insertion order, for code that iterates storage by index.
   * @returns The key, or `null` when the index is out of range.
   */
  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }

  /**
   * Value stored for a key. The key is stringified first, as browsers do.
   * @returns The value, or `null` when it was not set during this request.
   */
  getItem(key: string): string | null {
    return this.#items.get(String(key)) ?? null;
  }

  /** Stores a value for this request; key and value are stringified, as browsers do. */
  setItem(key: string, value: unknown): void {
    this.#items.set(String(key), String(value));
  }

  /** Deletes a key; does nothing when it is absent. */
  removeItem(key: string): void {
    this.#items.delete(String(key));
  }

  /** Deletes every key stored during this request. */
  clear(): void {
    this.#items.clear();
  }
}

/**
 * `matchMedia` result that never matches: there is no viewport, so components render their
 * default branch and the browser corrects it after taking over. No `change` event fires.
 * @param media Query passed to `matchMedia`, reported back as `media`.
 */
export function createUnmatchedMediaQuery(media: string): MediaQueryList {
  const list = new EventTarget() as MediaQueryList & Record<string, unknown>;
  return Object.assign(list, {
    matches: false,
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {}
  });
}

/**
 * Serves as `MutationObserver`, `ResizeObserver`, and `IntersectionObserver`. Components
 * create observers in constructors or setup code; on the server nothing is laid out,
 * scrolled, or mutated after the render, so there is never anything to report.
 */
export class InertObserver {
  /**
   * Accepts the arguments of any of the three observer constructors.
   * @param _callback Observer callback; never called on the server.
   * @param _options Observer options; ignored.
   */
  constructor(_callback: unknown, _options?: unknown) {}

  /** Accepted and ignored: the target never changes on the server. */
  observe(_target: unknown, _options?: unknown): void {}

  /** Accepted and ignored: nothing is being observed. */
  unobserve(_target: unknown): void {}

  /** Accepted and ignored: nothing is being observed. */
  disconnect(): void {}

  /** Always empty: no change was ever recorded. */
  takeRecords(): [] {
    return [];
  }
}
