import {ServerElement} from './server-element';
import {NODE_TYPE, ServerCharacterData, ServerDocumentFragment, ServerNode} from './server-node';

/**
 * The `document` global for one request, created by `runInBrowserScope`. One per request,
 * so concurrent renders cannot overwrite each other's title or head tags. It is never
 * serialized: the response head comes from page `seo`, the body from the string engine.
 * Members behave as in the DOM unless noted.
 */
export class ServerDocument extends ServerNode {
  /** The `<html>` element, parent of {@link head} and {@link body}. */
  readonly documentElement = ServerElement.create('html');
  /** `<head>`; code may append tags, but they are not written to the response (page `seo` is). */
  readonly head = ServerElement.create('head');
  /** `<body>`; empty, because page markup is produced as a string by the string engine. */
  readonly body = ServerElement.create('body');
  /** Starts empty (request headers are not available) and is never sent as `Set-Cookie`. */
  cookie = '';
  /** Value behind {@link title}. */
  #title = '';

  /**
   * Builds the `<html><head></head><body></body></html>` tree for one request.
   * @param location The request's location, shared with the `location` global.
   */
  constructor(readonly location: Location) {
    super();
    this.documentElement.append(this.head, this.body);
    this.appendChild(this.documentElement);
  }

  /** `NODE_TYPE.document`. */
  get nodeType(): number {
    return NODE_TYPE.document;
  }

  /** `'#document'`, as in the DOM. */
  get nodeName(): string {
    return '#document';
  }

  /** Always `null`: a document has no owner document, as in the DOM. */
  get ownerDocument(): null {
    return null;
  }

  /** Stored only; the response title comes from the page's `seo`. */
  get title(): string {
    return this.#title;
  }

  /** Stores a new title for this request; the value is stringified. */
  set title(value: string) {
    this.#title = String(value);
  }

  /** The request URL, as `document.URL` reports. */
  get URL(): string {
    return this.location.href;
  }

  /** The request URL, as `document.documentURI` reports. */
  get documentURI(): string {
    return this.location.href;
  }

  /** `'complete'`, so code waiting for `DOMContentLoaded` runs instead of waiting forever. */
  get readyState(): DocumentReadyState {
    return 'complete';
  }

  /** Always `'hidden'`: nothing is displayed, so visibility-gated work is skipped. */
  get visibilityState(): DocumentVisibilityState {
    return 'hidden';
  }

  /** Always `true`, in line with {@link visibilityState}. */
  get hidden(): boolean {
    return true;
  }

  /** The `window` global, which is `globalThis` during a render. */
  get defaultView(): typeof globalThis {
    return globalThis;
  }

  /** The body, which is what browsers report when nothing has focus. */
  get activeElement(): ServerElement {
    return this.body;
  }

  /** Registered custom-element names are built through their class, so this can return a component. */
  createElement(name: string): ServerElement {
    const localName = name.toLowerCase();
    const constructor = (globalThis as {customElements?: CustomElementRegistry}).customElements?.get(localName);
    return constructor ? new constructor() as unknown as ServerElement : ServerElement.create(localName);
  }

  /** Keeps the name's case (`linearGradient`); the namespace is not tracked. */
  createElementNS(_namespace: string | null, name: string): ServerElement {
    return ServerElement.create(name);
  }

  /** Creates a text node holding `data`, for code that builds small trees. */
  createTextNode(data: string): ServerCharacterData {
    return new ServerCharacterData('text', data);
  }

  /** Creates a comment node holding `data`. */
  createComment(data: string): ServerCharacterData {
    return new ServerCharacterData('comment', data);
  }

  /** Creates an empty fragment; inserting it moves its children (see `ServerNode.insertBefore`). */
  createDocumentFragment(): ServerDocumentFragment {
    return new ServerDocumentFragment();
  }

  /** Always `null`: page content is serialized markup, not nodes, so there is nothing to query. */
  querySelector(_selectors: string): null {
    return null;
  }

  /** Always empty, for the same reason as {@link querySelector}. */
  querySelectorAll(_selectors: string): ServerElement[] {
    return [];
  }

  /** Always `null`, for the same reason as {@link querySelector}. */
  getElementById(_id: string): null {
    return null;
  }

  /** Always empty, for the same reason as {@link querySelector}. */
  getElementsByTagName(_name: string): ServerElement[] {
    return [];
  }

  /** Always empty, for the same reason as {@link querySelector}. */
  getElementsByClassName(_names: string): ServerElement[] {
    return [];
  }

  /** Always `false`: a server document never has focus. */
  hasFocus(): boolean {
    return false;
  }
}
