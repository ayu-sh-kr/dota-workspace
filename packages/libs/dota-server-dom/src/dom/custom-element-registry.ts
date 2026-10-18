/** A `whenDefined` promise waiting for its name, with the resolver `define` calls. */
type PendingDefinition = {
  readonly promise: Promise<CustomElementConstructor>;
  readonly resolve: (constructor: CustomElementConstructor) => void;
};

/** Starts with a lowercase letter and contains a hyphen, per the HTML standard. */
const VALID_CUSTOM_ELEMENT_NAME = /^[a-z][a-z0-9._\u00b7\u00c0-\uffff]*-[a-z0-9._\u00b7\u00c0-\uffff-]*$/;
const RESERVED_NAMES = new Set(['annotation-xml', 'color-profile', 'font-face', 'font-face-src', 'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph']);

/**
 * Process-wide `customElements` for the server, so modules calling `define` load, and
 * `document.createElement` and `ServerElement.localName` can find components. Nothing is
 * ever upgraded, because server elements are never connected. Members behave as in the DOM.
 */
export class ServerCustomElementRegistry {
  readonly #constructors = new Map<string, CustomElementConstructor>();
  readonly #names = new Map<CustomElementConstructor, string>();
  readonly #pending = new Map<string, PendingDefinition>();

  /** @throws DOMException for an invalid name, or a name or class already registered. */
  define(name: string, constructor: CustomElementConstructor): void {
    if (!VALID_CUSTOM_ELEMENT_NAME.test(name) || RESERVED_NAMES.has(name)) throw new DOMException(`"${name}" is not a valid custom element name`, 'SyntaxError');
    if (this.#constructors.has(name)) throw new DOMException(`the name "${name}" has already been used with this registry`, 'NotSupportedError');
    if (this.#names.has(constructor)) throw new DOMException('this constructor has already been used with this registry', 'NotSupportedError');

    this.#constructors.set(name, constructor);
    this.#names.set(constructor, name);
    this.#pending.get(name)?.resolve(constructor);
    this.#pending.delete(name);
  }

  get(name: string): CustomElementConstructor | undefined {
    return this.#constructors.get(name);
  }

  getName(constructor: CustomElementConstructor): string | null {
    return this.#names.get(constructor) ?? null;
  }

  whenDefined(name: string): Promise<CustomElementConstructor> {
    if (!VALID_CUSTOM_ELEMENT_NAME.test(name)) return Promise.reject(new DOMException(`"${name}" is not a valid custom element name`, 'SyntaxError'));
    const defined = this.#constructors.get(name);
    if (defined) return Promise.resolve(defined);

    const existing = this.#pending.get(name);
    if (existing) return existing.promise;
    const {promise, resolve} = Promise.withResolvers<CustomElementConstructor>();
    this.#pending.set(name, {promise, resolve});
    return promise;
  }

  upgrade(_root: unknown): void {}
}
