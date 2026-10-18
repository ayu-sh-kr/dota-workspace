/**
 * Attribute reflection for {@link ServerElement}. In the DOM, `classList`, `dataset`, and
 * `style` are views onto the `class`, `data-*`, and `style` attributes rather than separate
 * state. The string engine writes a host tag from its attributes alone, so implementing
 * them as stateless views is what makes `this.classList.add('ready')` reach the HTML.
 * @see https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes
 */

/** The attribute operations a reflection reads and writes through; {@link ServerElement} implements it. */
export type AttributeHost = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  getAttributeNames(): string[];
};

/**
 * `DOMTokenList` over one attribute (`classList` over `class`). Every call reads the
 * attribute, applies the change, and writes it back, so there is no state to keep in sync.
 * Members behave as in the DOM.
 */
export class ServerTokenList implements Iterable<string> {
  /**
   * @param host Element whose attribute holds the tokens; see {@link AttributeHost}.
   * @param attribute Attribute name, such as `class`.
   */
  constructor(private readonly host: AttributeHost, private readonly attribute: string) {}

  /** Number of distinct tokens, read from the attribute on every call. */
  get length(): number {
    return this.tokens().length;
  }

  /** The attribute exactly as stored, including duplicates or extra spaces; `''` when absent. */
  get value(): string {
    return this.host.getAttribute(this.attribute) ?? '';
  }

  /** Replaces the attribute as given, without normalizing tokens. */
  set value(value: string) {
    this.host.setAttribute(this.attribute, value);
  }

  /** Token at a position in first-seen order, or `null` when out of range. */
  item(index: number): string | null {
    return this.tokens()[index] ?? null;
  }

  /** Whether the attribute currently contains the token. */
  contains(token: string): boolean {
    return this.tokens().includes(token);
  }

  /** Adds tokens that are not present; existing tokens keep their position, so `class` order stays stable. */
  add(...tokens: string[]): void {
    this.write([...new Set([...this.tokens(), ...tokens])]);
  }

  /** Removes the given tokens; absent ones are ignored. Like the DOM, the attribute stays, possibly as `class=""`. */
  remove(...tokens: string[]): void {
    this.write(this.tokens().filter((token) => !tokens.includes(token)));
  }

  /**
   * Adds the token when absent and removes it when present, as `classList.toggle` does.
   * @param force `true` only adds, `false` only removes.
   * @returns Whether the token is present afterwards.
   */
  toggle(token: string, force?: boolean): boolean {
    const present = force ?? !this.contains(token);
    if (present) this.add(token);
    else this.remove(token);
    return present;
  }

  /**
   * Swaps one token for another in place; a resulting duplicate is dropped.
   * @returns Whether `token` was present and replaced.
   */
  replace(token: string, replacement: string): boolean {
    const tokens = this.tokens();
    const position = tokens.indexOf(token);
    if (position === -1) return false;
    tokens[position] = replacement;
    this.write([...new Set(tokens)]);
    return true;
  }

  /** Calls `callback` for each distinct token in order. */
  forEach(callback: (token: string, index: number, list: ServerTokenList) => void): void {
    this.tokens().forEach((token, index) => callback(token, index, this));
  }

  /** Iterates distinct tokens, so `[...classList]` and `for…of` work. */
  [Symbol.iterator](): Iterator<string> {
    return this.tokens()[Symbol.iterator]();
  }

  /** The attribute value, as `String(classList)` gives in the DOM. */
  toString(): string {
    return this.value;
  }

  /** Distinct tokens in first-seen order. */
  private tokens(): string[] {
    return [...new Set(this.value.split(/[\t\n\f\r ]+/).filter(Boolean))];
  }

  /** Writes tokens back space-separated; the attribute is rewritten even when the list is empty. */
  private write(tokens: string[]): void {
    this.host.setAttribute(this.attribute, tokens.join(' '));
  }
}

/**
 * Creates `dataset`: a live `Proxy` mapping camel-cased keys to `data-*` attributes
 * (`dataset.userId` ⇄ `data-user-id`). Reads, writes, deletes, `in`, and spreading all
 * go straight to the attributes.
 */
export function createDataset(host: AttributeHost): Record<string, string> {
  const attributeOf = (key: string) => `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
  const keyOf = (name: string) => name.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return new Proxy({}, {
    get: (_, key) => typeof key === 'string' ? host.getAttribute(attributeOf(key)) ?? undefined : undefined,
    set: (_, key, value) => {
      if (typeof key !== 'string') return false;
      host.setAttribute(attributeOf(key), String(value));
      return true;
    },
    deleteProperty: (_, key) => {
      if (typeof key === 'string') host.removeAttribute(attributeOf(key));
      return true;
    },
    has: (_, key) => typeof key === 'string' && host.hasAttribute(attributeOf(key)),
    ownKeys: () => host.getAttributeNames().filter((name) => name.startsWith('data-')).map(keyOf),
    getOwnPropertyDescriptor: (_, key) => {
      if (typeof key !== 'string' || !host.hasAttribute(attributeOf(key))) return undefined;
      return {value: host.getAttribute(attributeOf(key)), writable: true, enumerable: true, configurable: true};
    }
  });
}

/** One declaration parsed from the `style` attribute. */
type StyleDeclaration = {
  value: string;
  /** `'important'` or `''`. */
  priority: string;
};

/**
 * `CSSStyleDeclaration` over the `style` attribute; also returned by `getComputedStyle`,
 * since the server has no cascade. Values are stored as written: there is no CSS parser,
 * so nothing is validated or expanded. Members behave as in the DOM.
 */
export class ServerStyleDeclaration {
  constructor(private readonly host: AttributeHost) {}

  /** Adds camel-cased access (`style.backgroundColor = 'red'`) through a `Proxy`, as `element.style` allows. */
  static create(host: AttributeHost): ServerStyleDeclaration & Record<string, string> {
    return new Proxy(new ServerStyleDeclaration(host), {
      get: (target, key, receiver) => typeof key !== 'string' || key in target
        ? Reflect.get(target, key, receiver)
        : target.getPropertyValue(cssPropertyName(key)),
      set: (target, key, value, receiver) => {
        if (typeof key !== 'string' || key in target) return Reflect.set(target, key, value, receiver);
        target.setProperty(cssPropertyName(key), String(value));
        return true;
      }
    }) as ServerStyleDeclaration & Record<string, string>;
  }

  /** Every declaration as one string: the `style` attribute value. */
  get cssText(): string {
    return this.host.getAttribute('style') ?? '';
  }

  /** Replaces every declaration; an empty string removes the `style` attribute. */
  set cssText(value: string) {
    if (value) this.host.setAttribute('style', value);
    else this.host.removeAttribute('style');
  }

  /** Number of declared properties, read from the attribute on every call. */
  get length(): number {
    return this.declarations().size;
  }

  /** Property name at a position in declaration order, or `''` when out of range. */
  item(index: number): string {
    return [...this.declarations().keys()][index] ?? '';
  }

  /** Declared value of a property, or `''` when it is not set. */
  getPropertyValue(name: string): string {
    return this.declarations().get(name.toLowerCase())?.value ?? '';
  }

  /** `'important'` when the property was declared with `!important`, otherwise `''`. */
  getPropertyPriority(name: string): string {
    return this.declarations().get(name.toLowerCase())?.priority ?? '';
  }

  /**
   * Sets a property, or removes it when the value is empty, and rewrites the attribute.
   * @param name CSS property name; custom properties (`--name`) keep their case.
   * @param priority `'important'` to add `!important`.
   */
  setProperty(name: string, value: string | null, priority = ''): void {
    if (!value) {
      this.removeProperty(name);
      return;
    }
    const declarations = this.declarations();
    declarations.set(name.startsWith('--') ? name : name.toLowerCase(), {value, priority});
    this.write(declarations);
  }

  /**
   * Removes a property and rewrites the attribute.
   * @returns The previous value, or `''` when it was not set.
   */
  removeProperty(name: string): string {
    const declarations = this.declarations();
    const key = name.startsWith('--') ? name : name.toLowerCase();
    const previous = declarations.get(key)?.value ?? '';
    if (declarations.delete(key)) this.write(declarations);
    return previous;
  }

  /** Splits on `;`, so a `;` inside a quoted value or `url()` is not supported. Custom properties keep their case. */
  private declarations(): Map<string, StyleDeclaration> {
    const declarations = new Map<string, StyleDeclaration>();
    for (const declaration of this.cssText.split(';')) {
      const colon = declaration.indexOf(':');
      if (colon === -1) continue;
      const rawName = declaration.slice(0, colon).trim();
      const name = rawName.startsWith('--') ? rawName : rawName.toLowerCase();
      const rawValue = declaration.slice(colon + 1).trim();
      const important = /\s*!important$/i.exec(rawValue);
      const value = important ? rawValue.slice(0, important.index) : rawValue;
      if (name && value) declarations.set(name, {value, priority: important ? 'important' : ''});
    }
    return declarations;
  }

  /** Serializes as browsers do: `name: value;` joined by spaces. */
  private write(declarations: Map<string, StyleDeclaration>): void {
    this.cssText = [...declarations]
      .map(([name, {value, priority}]) => `${name}: ${value}${priority ? ' !important' : ''};`)
      .join(' ');
  }
}

/** `backgroundColor` → `background-color`; `cssFloat` → `float`; `webkitX` → `-webkit-x`. */
function cssPropertyName(key: string): string {
  if (key === 'cssFloat') return 'float';
  const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return /^(webkit|moz|ms|o)-/.test(name) ? `-${name}` : name;
}
