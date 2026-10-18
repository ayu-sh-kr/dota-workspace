import {createDataset, ServerStyleDeclaration, ServerTokenList} from './element-reflection';
import {NODE_TYPE, ServerNode} from './server-node';

/** There is no layout on the server, so every measurement is 0. */
const ZERO_RECT = Object.freeze({x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({})});

/**
 * The server's `HTMLElement`, installed by `dom/install.ts` so Dota Core's
 * `class BaseElement extends HTMLElement` evaluates in Node.
 *
 * Attributes are the element's real state: the string engine copies a tag's attributes
 * in, lets `serverLoad` run, and writes the host tag from {@link getAttributeNames}.
 * `classList`, `dataset`, and `style` are reflections of attributes, so host changes reach
 * the HTML. The element is never connected, and queries find nothing, because a
 * component's content exists only as its `render()` output. Members behave as in the DOM unless noted.
 */
export class ServerElement extends ServerNode {
  /** Lowercase name → value, in insertion order: the order the host tag is written in. */
  readonly #attributes = new Map<string, string>();
  /** Set by {@link create}; component instances derive their name from their class instead. */
  #createdName?: string;
  /** Root made by {@link attachShadow}; kept even when closed, so a second attach still fails. */
  #shadowRoot?: ServerShadowRoot;
  /** Created on first access and reused, as the DOM returns the same `classList` object. */
  #classList?: ServerTokenList;
  /** Created on first access and reused, like {@link classList}. */
  #dataset?: Record<string, string>;
  /** Created on first access and reused, like {@link classList}. */
  #style?: ServerStyleDeclaration & Record<string, string>;

  /** A plain element, as `document.createElement` makes for names that are not components. */
  static create(localName: string): ServerElement {
    const element = new ServerElement();
    element.#createdName = localName;
    return element;
  }

  /** `NODE_TYPE.element`. */
  get nodeType(): number {
    return NODE_TYPE.element;
  }

  /** Same as {@link tagName}, as for every DOM element. */
  get nodeName(): string {
    return this.tagName;
  }

  /**
   * Custom-element constructors take no arguments, so a component's name comes from its
   * class: its `customElements` registration, else its `@Component` selector.
   */
  get localName(): string {
    if (this.#createdName !== undefined) return this.#createdName;
    const constructor = this.constructor as CustomElementConstructor & {__dotaSelector?: string};
    return (globalThis as {customElements?: CustomElementRegistry}).customElements?.getName?.(constructor) ?? constructor.__dotaSelector ?? '';
  }

  /** Uppercase tag name, as HTML elements report it (`TASK-ITEM`). */
  get tagName(): string {
    return this.localName.toUpperCase();
  }

  /** Reflects the `id` attribute; `''` when absent. */
  get id(): string {
    return this.getAttribute('id') ?? '';
  }

  /** Writes the `id` attribute, so it appears on the serialized host. */
  set id(value: string) {
    this.setAttribute('id', value);
  }

  /** Reflects the `class` attribute as one string; `''` when absent. */
  get className(): string {
    return this.getAttribute('class') ?? '';
  }

  /** Replaces the `class` attribute. */
  set className(value: string) {
    this.setAttribute('class', value);
  }

  /** Live token list over `class`; `classList.add('ready')` in `serverLoad` reaches the HTML. */
  get classList(): ServerTokenList {
    return this.#classList ??= new ServerTokenList(this, 'class');
  }

  /** Live map of `data-*` attributes, with camel-cased keys (see `createDataset`). */
  get dataset(): Record<string, string> {
    return this.#dataset ??= createDataset(this);
  }

  /** Inline style reflecting the `style` attribute, with camel-cased property access. */
  get style(): ServerStyleDeclaration & Record<string, string> {
    return this.#style ??= ServerStyleDeclaration.create(this);
  }

  /** A snapshot of `{name, value}` pairs, not a live `NamedNodeMap`. */
  get attributes(): ReadonlyArray<{readonly name: string; readonly value: string}> {
    return [...this.#attributes].map(([name, value]) => ({name, value}));
  }

  /** Child elements only, skipping text and comment nodes, as `Element.children` does. */
  get children(): readonly ServerElement[] {
    return this.childNodes.filter((node): node is ServerElement => node instanceof ServerElement);
  }

  /** First child element, or `null`. */
  get firstElementChild(): ServerElement | null {
    return this.children[0] ?? null;
  }

  /** The root from {@link attachShadow} when its mode is `open`; a closed root stays hidden, as in the DOM. */
  get shadowRoot(): ServerShadowRoot | null {
    return this.#shadowRoot?.mode === 'open' ? this.#shadowRoot : null;
  }

  /** Whether an attribute is present; names compare case-insensitively, as on HTML elements. */
  hasAttribute(name: string): boolean {
    return this.#attributes.has(name.toLowerCase());
  }

  /** Whether the element has any attribute. */
  hasAttributes(): boolean {
    return this.#attributes.size > 0;
  }

  /** Value of an attribute, or `null` when absent. Dota Core seeds `@Property` fields from these. */
  getAttribute(name: string): string | null {
    return this.#attributes.get(name.toLowerCase()) ?? null;
  }

  /** Never calls `attributeChangedCallback`: the engine sets attributes before properties are seeded. */
  setAttribute(name: string, value: unknown): void {
    this.#attributes.set(name.toLowerCase(), String(value));
  }

  /** Removes an attribute, so it is not written on the host; absent names are ignored. */
  removeAttribute(name: string): void {
    this.#attributes.delete(name.toLowerCase());
  }

  /**
   * Adds a boolean attribute when absent and removes it when present, as in the DOM.
   * @param force `true` only adds, `false` only removes.
   * @returns Whether the attribute is present afterwards.
   */
  toggleAttribute(name: string, force?: boolean): boolean {
    const present = force ?? !this.hasAttribute(name);
    if (present && !this.hasAttribute(name)) this.setAttribute(name, '');
    if (!present) this.removeAttribute(name);
    return present;
  }

  /** Attribute names in insertion order; the string engine writes the host tag in this order. */
  getAttributeNames(): string[] {
    return [...this.#attributes.keys()];
  }

  /** Returns an empty placeholder root; shadow markup is written as declarative shadow DOM from `render()`. */
  attachShadow(init: ShadowRootInit): ServerShadowRoot {
    if (this.#shadowRoot) throw new DOMException('Shadow root cannot be created on a host which already hosts a shadow tree', 'NotSupportedError');
    return this.#shadowRoot = new ServerShadowRoot(this, init.mode);
  }

  /**
   * Always `null`: there is no selector engine, and a component's content exists only as its
   * serialized `render()` output. Dota Core's `@Element` binding runs only when connected,
   * which never happens on the server.
   */
  querySelector(_selectors: string): null {
    return null;
  }

  /** Always empty, for the same reason as {@link querySelector}. */
  querySelectorAll(_selectors: string): ServerElement[] {
    return [];
  }

  /** Always empty, for the same reason as {@link querySelector}. */
  getElementsByTagName(_name: string): ServerElement[] {
    return [];
  }

  /** Always empty, for the same reason as {@link querySelector}. */
  getElementsByClassName(_names: string): ServerElement[] {
    return [];
  }

  /** Always `null`: selectors are not evaluated on the server. */
  closest(_selectors: string): null {
    return null;
  }

  /** Always `false`: selectors are not evaluated on the server. */
  matches(_selectors: string): boolean {
    return false;
  }

  /** An all-zero rectangle, so layout-measuring code computes defaults instead of throwing. */
  getBoundingClientRect(): typeof ZERO_RECT {
    return ZERO_RECT;
  }

  /** No effect: there is no focus on the server. */
  focus(): void {}

  /** No effect: there is no focus on the server. */
  blur(): void {}

  /** No effect: there is no viewport to scroll. */
  scrollIntoView(): void {}
}

/**
 * Placeholder returned by {@link ServerElement.attachShadow}. It stays empty: shadow
 * components are written inside `<template shadowrootmode="open">`, which the browser turns into the real root.
 */
export class ServerShadowRoot extends ServerNode {
  /**
   * @param host Element the root belongs to, as `ShadowRoot.host` reports.
   * @param mode `open` roots are returned by `host.shadowRoot`; `closed` ones are not.
   */
  constructor(readonly host: ServerElement, readonly mode: ShadowRootMode) {
    super();
  }

  /** `NODE_TYPE.documentFragment`, as a `ShadowRoot` is a `DocumentFragment` in the DOM. */
  get nodeType(): number {
    return NODE_TYPE.documentFragment;
  }

  /** `'#document-fragment'`, as in the DOM. */
  get nodeName(): string {
    return '#document-fragment';
  }

  /** Always `null`: the root holds no content on the server. */
  querySelector(_selectors: string): null {
    return null;
  }

  /** Always empty: the root holds no content on the server. */
  querySelectorAll(_selectors: string): ServerElement[] {
    return [];
  }

  /** Always `null`: the root holds no content on the server. */
  getElementById(_id: string): null {
    return null;
  }
}
