/**
 * Smallest `HTMLElement` stand-in that lets Dota components be constructed in Node.
 * It stores attributes, which is all property seeding and reflection read, and
 * deliberately has no tree, parser, or events: the string engine never connects
 * an instance, so no lifecycle code reaches DOM APIs.
 */
export class ServerElement {
  private readonly attributes = new Map<string, string>();

  /** Server instances never join a document. */
  get isConnected(): boolean {
    return false;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: unknown): void {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  addEventListener(): void {}

  removeEventListener(): void {}

  dispatchEvent(): boolean {
    return true;
  }
}

/**
 * Exposes {@link ServerElement} as the global `HTMLElement` when none exists.
 * This module is imported before Dota Core so `class BaseElement extends HTMLElement`
 * can evaluate; an existing browser or DOM-library global is never replaced.
 */
if (typeof globalThis.HTMLElement === 'undefined') {
  Object.defineProperty(globalThis, 'HTMLElement', {configurable: true, writable: true, value: ServerElement});
}
