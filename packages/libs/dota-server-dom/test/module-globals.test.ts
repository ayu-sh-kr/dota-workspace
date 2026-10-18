// @vitest-environment node
import {installServerGlobals, ServerCustomElementRegistry, ServerElement} from '@dota/index';

describe('installServerGlobals', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).HTMLElement;
    delete (globalThis as Record<string, unknown>).customElements;
  });

  it('defines HTMLElement and customElements only when they are missing', () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');

    installServerGlobals();
    const registry = globalThis.customElements;
    installServerGlobals();

    expect(globalThis.HTMLElement).toBe(ServerElement);
    expect(registry).toBeInstanceOf(ServerCustomElementRegistry);
    expect(globalThis.customElements).toBe(registry);
  });

  it('keeps an existing global', () => {
    const existing = class {};
    Object.defineProperty(globalThis, 'HTMLElement', {configurable: true, writable: true, value: existing});

    installServerGlobals();

    expect(globalThis.HTMLElement).toBe(existing);
  });
});
